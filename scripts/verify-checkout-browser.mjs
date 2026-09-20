import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const W = 1600, H = 1000
const url = process.argv[2] || 'http://127.0.0.1:3000/#feature-payments'
const port = 9222 + Math.floor(Math.random() * 500)

const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--disable-gpu',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
    `--window-size=${W},${H}`,
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + process.env.TMPDIR + '/cdp-profile-' + port,
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {}
    await sleep(200)
  }
  throw new Error('chrome did not start')
}

const target = await getTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const logs = []
const requests = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  } else if (msg.method === 'Network.requestWillBeSent') {
    requests.push(msg.params.request)
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
    logs.push(`[console.${msg.params.type}] ${text}`)
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails
    logs.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`)
  } else if (msg.method === 'Log.entryAdded') {
    logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.text}`)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })

const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description)
  return response.result?.result?.value
}
const type = async text => {
  for (const character of text) await send('Input.insertText', { text: character })
}
const press = async key => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key === 'Backspace' ? 8 : 13, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key })
}
const state = () => evaluate(`(() => { const fields = [...document.querySelectorAll('.fg-checkout-form input')]; return { values: fields.map(e => e.value), active: fields.indexOf(document.activeElement), payFocused: document.activeElement === document.querySelector('.fg-checkout-pay'), phase: document.querySelector('.fg-checkout-confirmation').dataset.phase, error: document.querySelector('.fg-checkout-error')?.textContent || '', checks: document.querySelectorAll('.fg-checkout-field-check[data-valid="true"]').length, brand: document.querySelector('.fg-checkout-card-brand, .fg-checkout-brand-word')?.getAttribute('aria-label') }; })()`)
const waitForPhase = async phase => {
  for (let attempt = 0; attempt < 60; attempt++) {
    if ((await state()).phase === phase) return
    await sleep(100)
  }
  assert.fail(`Timed out waiting for ${phase}`)
}
const screenshot = async name => {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`output/${name}.png`, Buffer.from(shot.result.data, 'base64'))
}
try {
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Page.navigate', { url: url.split('#')[0] })
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate(`!!document.querySelector('.fg-checkout-form input')`)) break
    await sleep(250)
  }
  await evaluate(`document.fonts.ready`)
  await sleep(1200)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout').dataset.intro`), 'idle', 'intro waits until the form enters the viewport')
  for (const card of ['product', 'confirmation']) assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-${card}')).visibility`), 'hidden', 'result cards start hidden')
  await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'});`)
  await waitForPhase('success')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-product').dataset.visible`), 'false', 'success appears before the notification')
  await sleep(750)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-product').dataset.visible`), 'true')
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-confirmation')).backdropFilter`), 'none', 'confirmation blurs the photographic background')
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.fg-checkout-confirmed-store button')`), false, 'autoplay never steals focus')
  await screenshot('northstar-autoplay-success')
  await evaluate(`document.querySelector('.fg-checkout-confirmed-store button').click()`)
  await sleep(100)
  await screenshot('northstar-interactive-desktop')
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-form')).webkitBoxReflect`), 'none', 'checkout reflection enabled')
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-confirmation')).webkitBoxReflect`), 'none', 'confirmation reflection enabled')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-product')).webkitBoxReflect`), 'none', 'notification stays unreflected')
  const requestStart = requests.length
  await evaluate(`document.querySelector('.fg-checkout-form input').focus({preventScroll:true})`)
  assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`), 'none', 'only the field wrapper draws a focus ring')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-card-number')).backgroundColor`), 'rgb(255, 255, 255)', 'input surface is white')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').classList.contains('utex-button--primary')`), true, 'pay reuses the landing CTA component')
  await screenshot('northstar-input-focus')
  await type('4242424242424242')
  assert.deepEqual((await state()).values, ['4242 4242 4242 4242', '', ''])
  assert.equal((await state()).brand, 'Visa')
  assert.equal((await state()).active, 1, 'complete card advances to expiry')
  await type('1234')
  assert.equal((await state()).values[1], '12 / 34')
  assert.equal((await state()).active, 2, 'complete expiry advances to CVC')
  await type('123')
  assert.equal((await state()).checks, 3)
  assert.equal((await state()).payFocused, true)
  await press('Enter')
  assert.equal((await state()).phase, 'processing')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').disabled`), true)
  await waitForPhase('success')
  assert.equal((await state()).phase, 'success')
  await sleep(750)
  assert.match(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-notification--received .fg-checkout-product-photo')).backgroundImage`), /northstar-scene/, 'receipt retains the bottle thumbnail')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-notification--received .fg-checkout-product-photo svg')`), null, 'receipt thumbnail does not become a checkmark')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-replay')).textDecorationLine`), 'none', 'replay uses a button treatment')
  assert.match(await evaluate(`document.querySelector('.fg-checkout-notification--received')?.textContent`), /Payment received.*Just now.*\+€48.00/, 'success delivers a fresh merchant notification')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-confirmed-store button')).outlineStyle`), 'none', 'replay focus has no rectangular outline')
  await screenshot('northstar-interactive-success')
  await evaluate(`document.querySelector('.fg-checkout-confirmed-store button').click()`)
  await sleep(80)
  assert.equal((await state()).active, 0)
  assert.deepEqual((await state()).values, ['', '', ''])
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-notification--received')`), null, 'replay clears the receipt for the next payment')
  // Paste a complete Mastercard and an invalid date; focus must not advance on invalid data.
  await send('Input.insertText', { text: '5555 5555 5555 4444' })
  assert.equal((await state()).brand, 'Mastercard')
  assert.equal((await state()).active, 1)
  const beforeInvalidHeight = await evaluate(`document.querySelector('.fg-checkout-form').offsetHeight`)
  await send('Input.insertText', { text: '13/34' })
  assert.equal((await state()).active, 1)
  await evaluate(`document.querySelector('.fg-checkout-pay').click()`)
  assert.match((await state()).error, /valid expiry/)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-form').offsetHeight`), beforeInvalidHeight, 'validation must not change card height')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-error')).position`), 'absolute', 'accessible error stays out of layout')
  assert.equal(await evaluate(`getComputedStyle(document.activeElement.closest('.fg-checkout-input-wrap')).boxShadow`), 'none', 'invalid field has one border and no glow')
  await screenshot('northstar-clean-validation')
  // Repair date by selection/paste and return to the previous field with Backspace.
  await evaluate(`document.activeElement.select()`)
  await send('Input.insertText', { text: '12/34' })
  assert.equal((await state()).active, 2)
  await press('Backspace')
  assert.equal((await state()).active, 1)
  // Middle-of-number replacement preserves the caret rather than jumping to the end.
  await evaluate(`const card = document.querySelector('.fg-checkout-form input');card.focus({preventScroll:true});card.setSelectionRange(5,6)`)
  await send('Input.insertText', { text: '1' })
  await sleep(60)
  assert.equal((await state()).active, 0)
  assert.equal(await evaluate(`document.activeElement.selectionStart`), 6)
  assert.equal((await state()).values[0], '5555 1555 5555 4444')
  await evaluate(`document.activeElement.setSelectionRange(5,5)`)
  await press('Backspace')
  await sleep(60)
  assert.equal((await state()).values[0], '5551 5555 5554 444')
  assert.equal(await evaluate(`document.activeElement.selectionStart`), 3)
  // Test shortcuts are real buttons and the demo completes repeatedly.
  await evaluate(`document.querySelectorAll('.fg-checkout-demo button')[1].click()`)
  assert.equal((await state()).checks, 3)
  assert.equal((await state()).brand, 'Mastercard')
  await press('Enter')
  await waitForPhase('success')
  assert.equal((await state()).phase, 'success')
  assert.equal(requests.slice(requestStart).some(request => request.method === 'POST' || /42424242|55555555/.test(request.url + (request.postData || ''))), false, 'demo never transmits entered values')
  await evaluate(`document.querySelector('.checkout-controls-toggle').focus({preventScroll:true})`)
  for (const width of [768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 621 ? 1550 : 1000, deviceScaleFactor: 1, mobile: width < 621 })
    await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'})`)
    await sleep(200)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `no page overflow at ${width}px`)
    await screenshot(`northstar-interactive-${width}`)
  }
  await sleep(3400)
  assert.equal((await state()).phase, 'success', 'success stays visible until Try again')
  await evaluate(`document.querySelector('.fg-checkout-confirmed-store button').click()`)
  await sleep(80)
  assert.deepEqual((await state()).values, ['', '', ''], 'Try again clears the form for manual use')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').disabled`), false)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-product').dataset.visible`), 'false')
  // Ambient floating composes with art-direction transforms and respects reduced motion.
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-product')).animationName`), 'none')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'})`)
  await sleep(300)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-product')).animationName`), 'none', 'hidden notifications do not animate')
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-pay')).transform`), 'none', 'pay face is elevated above its base')
  await screenshot('northstar-raised-pay')
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`)
  await sleep(300)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-product')).animationName`), 'none')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  // Live art-direction controls: independent cards, all ranges, persistence and reset.
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'});document.querySelector('.checkout-controls-toggle').click()`)
  await sleep(100)
  assert.equal(await evaluate(`!!document.querySelector('.checkout-controls-panel')`), true)
  const setRange = async (label, value) => {
    await evaluate(`(() => {
      const label = [...document.querySelectorAll('.checkout-controls-row label')].find(e => e.textContent === ${JSON.stringify(label)});
      const input = document.getElementById(label.htmlFor);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))});
      input.dispatchEvent(new Event('input', {bubbles:true}));
      input.dispatchEvent(new Event('change', {bubbles:true}));
    })()`)
    await sleep(30)
  }
  for (const [index, selector] of ['product', 'form', 'confirmation'].entries()) {
    await evaluate(`document.querySelectorAll('.checkout-controls-items button')[${index}].click()`)
    for (const [label, value] of [['Horizontal', 40 + index * 10], ['Vertical', -20], ['Tilt X', 8], ['Turn Y', 12], ['Rotate Z', -3], ['Anchor X', 25], ['Anchor Y', 75], ['Anchor Z', 40], ['Shadow X', 5], ['Shadow Y', 20], ['Blur', 40], ['Spread', -5], ['Opacity', 70], ['Edge X', 4], ['Edge Y', -6]]) await setRange(label, value)
    assert.equal(await evaluate(`document.querySelector('.fg-checkout-${selector}').style.getPropertyValue('--tune-rx')`), '8deg')
    assert.match(await evaluate(`document.querySelector('.fg-checkout-${selector}').style.getPropertyValue('--tune-shadow')`), /70%/)
    assert.match(await evaluate(`document.querySelector('.fg-checkout-${selector}').style.transformOrigin`), /^25% 75%/)
    await evaluate(`document.querySelector('[aria-label="Top left anchor"]').click()`)
    assert.match(await evaluate(`document.querySelector('.fg-checkout-${selector}').style.transformOrigin`), /^0% 0%/)
    if (selector !== 'product') {
      await setRange('Strength', 42)
      assert.equal(await evaluate(`document.querySelector('.fg-checkout-${selector}').style.getPropertyValue('--tune-reflection')`), '0.42')
    }
  }
  await evaluate(`document.querySelectorAll('.checkout-controls-items button')[3].click()`)
  await setRange('Edge X', 5)
  await setRange('Edge Y', -4)
  await setRange('Rim opacity', 75)
  await evaluate(`(() => { const input = document.querySelector('.checkout-controls-color input[type="color"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#cc9911'); input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); })()`)
  await sleep(80)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-pay')).getPropertyValue('--pay-edge-y').trim()`), '-4px', 'button has independent top edge control')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-pay')).backgroundColor`), 'rgb(204, 153, 17)', 'button face color updates live')
  await evaluate(`document.querySelector('[aria-label="Left highlight hex"]').focus();document.activeElement.select()`)
  await type('#eefaff')
  await press('Enter')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').style.getPropertyValue('--pay-rimLeft')`), '#eefaff')
  await screenshot('northstar-button-controls')
  await evaluate(`document.querySelectorAll('.checkout-controls-items button')[2].click()`)
  await screenshot('northstar-controls-desktop')
  await evaluate(`document.querySelector('.checkout-controls-panel footer button').click()`)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-confirmation').style.getPropertyValue('--tune-rx')`), '0deg')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-form').style.getPropertyValue('--tune-rx')`), '8deg')
  await send('Page.reload')
  await sleep(2500)
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(`document.querySelector('.fg-checkout-form')?.style.getPropertyValue('--tune-rx') === '8deg'`)) break
    await sleep(100)
  }
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-form').style.getPropertyValue('--tune-rx')`), '8deg', 'layout settings survive reload')
  assert.match(await evaluate(`document.querySelector('.fg-checkout-form').style.transformOrigin`), /^0% 0%/, 'anchor survives reload')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').style.getPropertyValue('--pay-fill')`), '#cc9911', 'button colors survive reload')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').style.getPropertyValue('--pay-edge-y')`), '-4px', 'button edge survives reload')
  await evaluate(`document.querySelector('.checkout-controls-toggle').click()`)
  await evaluate(`document.querySelectorAll('.checkout-controls-items button')[3].click()`)
  await sleep(80)
  await evaluate(`document.querySelector('.checkout-controls-panel footer button').click()`)
  await sleep(80)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-pay').style.getPropertyValue('--pay-fill')`), '#e0a830', 'button resets independently')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-form').style.getPropertyValue('--tune-rx')`), '8deg', 'button reset preserves panel tuning')
  await evaluate(`document.querySelectorAll('.checkout-controls-items button')[0].click()`)
  await evaluate(`document.querySelectorAll('.checkout-controls-panel footer button')[1].click()`)
  assert.equal(await evaluate(`document.querySelector('.fg-checkout-form').style.getPropertyValue('--tune-rx')`), '0deg')
  assert.match(await evaluate(`document.querySelector('.fg-checkout-form').style.transformOrigin`), /^0% 50%/, 'reset restores the approved left-center pivot')
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('utex-checkout-controls-v5')).product.x`), -111, 'reset restores user-approved position')
  // Exact signed values can be typed without the input rejecting an intermediate minus sign.
  await evaluate(`document.querySelector('[aria-label="Horizontal value"]').focus();document.activeElement.select()`)
  await type('-75')
  await press('Enter')
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('utex-checkout-controls-v5')).product.x`), -75)
  await evaluate(`document.querySelectorAll('.checkout-controls-panel footer button')[1].click()`)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true })
  await sleep(100)
  assert.equal(await evaluate(`document.querySelector('.checkout-controls-panel').getBoundingClientRect().right <= innerWidth`), true)
  await screenshot('northstar-controls-mobile')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  assert.equal(await evaluate(`!!document.querySelector('.checkout-controls-panel')`), false)
  // A fresh visit runs the complete typed demonstration exactly once.
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Page.navigate', { url: url.split('#')[0] })
  await sleep(1500)
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`document.querySelector('.fg-checkout')?.dataset.intro === 'idle'`)) break
    await sleep(150)
  }
  assert.equal(await evaluate(`document.querySelector('.fg-checkout').dataset.intro`), 'idle')
  await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'})`)
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await state()).values[0].length > 0) break
    await sleep(100)
  }
  assert.equal(await evaluate(`document.querySelector('.fg-checkout').dataset.intro`), 'running')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-digit')).animationName`), 'checkout-digit-in', 'autoplay digits have an individual entrance')
  await screenshot('northstar-animated-digits')
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`)
  await sleep(150)
  const pausedValues = (await state()).values
  await sleep(600)
  assert.deepEqual((await state()).values, pausedValues, 'typing pauses outside the viewport')
  await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'})`)
  const stages = new Set()
  let completedAt = 0, pressedAt = 0, processingAt = 0
  for (let attempt = 0; attempt < 100; attempt++) {
    const stage = await evaluate(`document.querySelector('.fg-checkout-pay').dataset.demoPressed === 'true' ? 'pay' : [...document.querySelectorAll('.fg-checkout-input-wrap')].findIndex(e => e.dataset.demoActive === 'true')`)
    stages.add(stage)
    if ((await state()).checks === 3 && !completedAt) completedAt = Date.now()
    if (stage === 'pay' && !pressedAt) pressedAt = Date.now()
    if ((await state()).phase === 'processing' && !processingAt) processingAt = Date.now()
    if ((await state()).phase === 'success') break
    await sleep(80)
  }
  assert.equal((await state()).phase, 'success')
  assert.ok(pressedAt - completedAt >= 500 && pressedAt - completedAt < 1200, 'completed form uses the shorter pre-Pay pause')
  assert.ok(Date.now() - processingAt >= 1650, 'processing receives the longer pause')
  assert.equal(stages.has(1) && stages.has(2) && stages.has('pay'), true, 'intro types expiry and CVC then presses Pay')
  await sleep(750)
  assert.match(await evaluate(`getComputedStyle(document.querySelector('.fg-checkout-product')).animationName`), /checkout-notification-arrive/, 'the whole notification rises and settles')
  await screenshot('northstar-animated-flow-success')
  await evaluate(`document.querySelector('.fg-checkout-confirmed-store button').click()`)
  await sleep(100)
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`)
  await sleep(200)
  await evaluate(`document.querySelector('#feature-payments').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:-100,behavior:'instant'})`)
  await sleep(1000)
  assert.deepEqual((await state()).values, ['', '', ''], 'scrolling back never replays the introduction')
  assert.equal(await evaluate(`document.querySelector('.fg-checkout').dataset.intro`), 'manual')
  console.log('PASS: viewport intro, off-screen pause, typed fields, Pay press, ordered reveals, background blur, reduced motion and manual replay.')
  console.log('PASS: all three cards: position, rotation, shadows, edge depth, independent reset, signed numeric input, persistence, reset all, mobile panel and Escape.')
  console.log('PASS: typing, paste, Visa/Mastercard detection, auto-advance, invalid expiry, backspace, caret edits, completion, replay, no payment requests, 768/390/320px layouts.')
} finally {
  ws.close()
  chrome.kill()
}
