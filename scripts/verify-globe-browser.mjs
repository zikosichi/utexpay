// Production browser checks, following the repository's direct Chrome/CDP harness.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const url = process.argv[2] ?? 'http://127.0.0.1:3042/globe-horizon/'
const out = 'output/globe-horizon'
const port = 9700 + Math.floor(Math.random() * 300)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TMPDIR}/globe-check-${port}`, 'about:blank',
], { stdio: 'ignore' })
let ws
try {
  let target
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch {}
    if (!target) await sleep(150)
  }
  assert.ok(target, 'Chrome started')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise(resolve => { ws.onopen = resolve })
  let id = 0
  const pending = new Map(), errors = [], mutations = []
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args)
    if (message.method === 'Network.requestWillBeSent' && !['GET', 'HEAD'].includes(message.params.request.method)) mutations.push(message.params.request.url)
  }
  const send = (method, params = {}) => new Promise(resolve => {
    const key = ++id; pending.set(key, resolve); ws.send(JSON.stringify({ id: key, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert.ok(!response.result?.exceptionDetails, JSON.stringify(response.result?.exceptionDetails))
    return response.result?.result?.value
  }
  const until = async (expression, label) => {
    for (let i = 0; i < 240; i++) { if (await evaluate(expression)) return; await sleep(100) }
    throw new Error(`Timed out: ${label}`)
  }
  const shot = async name => {
    const response = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${out}/${name}.png`, Buffer.from(response.result.data, 'base64'))
  }
  mkdirSync(out, { recursive: true })
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('Page.bringToFront')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const migration = await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.removeItem('utexpay.globe.appearance.v4');localStorage.setItem('utexpay.globe.appearance.v3', JSON.stringify({size:55,density:100,radius:100}));` })
  await send('Page.navigate', { url })
  await until(`document.querySelector('.globe-horizon')?.dataset.scene === 'ready'`, 'motion ready')
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: migration.result.identifier })
  await evaluate('document.fonts.ready')
  const canvas = `document.querySelector('.gh-canvas')`
  await until(`${canvas}.dataset.motion === 'running'`, 'motion running')
  assert.equal(await evaluate(`${canvas}.getContext('webgl2') instanceof WebGL2RenderingContext`), true, 'real WebGL renderer')
  assert.equal(await evaluate(`document.querySelector('.globe-horizon img') === null`), true, 'no raster artwork')
  assert.equal(await evaluate(`performance.getEntriesByType('resource').some(r=>/horizon-.*webp/.test(r.name))`), false, 'no old artwork requests')
  const pointCount = await evaluate(`Number(${canvas}.dataset.points)`)
  assert.ok(pointCount > 20000 && pointCount < 35000, 'geography fits the point budget')
  assert.equal(await evaluate(`${canvas}.dataset.dotSize`), '55', '55% base replaces the old saved size')
  assert.equal(await evaluate(`${canvas}.dataset.hoverRadius`), '130', '130% radius replaces the old saved radius')
  const frame = () => evaluate(`Number(${canvas}.dataset.frame)`)
  const rotation = () => evaluate(`${canvas}.dataset.rotation`)
  const pixels = async () => (await send('Page.captureScreenshot', { format: 'png' })).result.data
  const moving = await rotation(), movingFrame = await frame(); await sleep(300)
  assert.notEqual(await rotation(), moving, 'automatic rotation changes')
  assert.ok(await frame() > movingFrame, 'WebGL frames advance')
  const hoverArea = await evaluate(`(() => {const r=${canvas}.getBoundingClientRect();return {x:r.width*.70,y:r.top+r.height*.44}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...hoverArea })
  await until(`Number(${canvas}.dataset.hover) > .1 && Number(${canvas}.dataset.hover) < .99`, 'hover eases in gradually')
  await until(`Number(${canvas}.dataset.hover) > .99`, 'hover reaches full strength')
  await shot('hover-growing')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hoverArea.x - 500, y: hoverArea.y })
  await until(`Number(${canvas}.dataset.trailSamples) > 3`, 'moving pointer leaves a lingering trail')
  await sleep(150)
  await shot('hover-trail')
  await until(`Number(${canvas}.dataset.trailSamples) === 1`, 'older trail samples fade while the pointer stays still')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 15, y: 15 })
  await until(`Number(${canvas}.dataset.hover) > .01 && Number(${canvas}.dataset.hover) < .9`, 'hover fades out gradually')
  await until(`Number(${canvas}.dataset.hover) === 0`, 'pointer exit restores base size')
  assert.equal(await evaluate(`Number(${canvas}.dataset.trailSamples)`), 0, 'trail clears after leaving the globe')
  // Freeze rotation to compare actual pixels near and far from the pointer.
  // Reduced motion keeps direct input immediate, without a trailing animation.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await until(`${canvas}.dataset.motion === 'still'`, 'freeze rotation for local hover comparison')
  const settlePaint = () => evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
  await settlePaint()
  const crop = async (x, y) => (await send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: 160, height: 160, scale: 1 } })).result.data
  const nearBefore = await crop(hoverArea.x - 80, hoverArea.y - 80)
  const farBefore = await crop(120, hoverArea.y - 80)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...hoverArea })
  await settlePaint()
  assert.notEqual(await crop(hoverArea.x - 80, hoverArea.y - 80), nearBefore, 'hover enlarges rendered nearby dots')
  assert.equal(await crop(120, hoverArea.y - 80), farBefore, 'distant dots stay at base size')
  await shot('hover-local')
  const hoverFrame = await frame(); await sleep(200)
  assert.equal(await frame(), hoverFrame, 'reduced-motion hover does not keep an animation loop')
  assert.equal(await evaluate(`Number(${canvas}.dataset.trailSamples)`), 0, 'reduced motion disables the lingering trail')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 15, y: 15 })
  await until(`Number(${canvas}.dataset.hover) === 0`, 'direct hover clears on exit')
  await settlePaint()
  const nearAfter = await crop(hoverArea.x - 80, hoverArea.y - 80)
  assert.ok(nearAfter === nearBefore, 'hover leaves no enlarged dots after exit')
  assert.equal(await evaluate(`document.querySelector('.gh-drag-hint, .gh-reset, .gh-motion')`), null, 'old hint and motion buttons removed')
  const setRange = (name, value) => evaluate(`(() => {const field=document.querySelector('input[name="globe-${name}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,${JSON.stringify(String(value))});field.dispatchEvent(new Event('input',{bubbles:true}));})()`)
  await evaluate(`document.querySelector('.gh-settings summary').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  assert.equal(await evaluate(`document.querySelector('.gh-settings').open`), true, 'keyboard opens globe controls')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await until(`${canvas}.dataset.motion === 'still'`, 'freeze for appearance comparison')
  await evaluate(`window.appearanceContext = ${canvas}.getContext('webgl2')`)
  const originalSize = await evaluate(`Number(${canvas}.dataset.dotPixels)`), originalPixels = await pixels()
  const originalRadius = await evaluate(`Number(${canvas}.dataset.hoverPixels)`)
  await setRange('radius', 150)
  assert.ok(Math.abs(await evaluate(`Number(${canvas}.dataset.hoverPixels)`) - originalRadius * 150 / 130) < .1, 'radius slider updates the live hover field')
  await setRange('size', 150)
  assert.ok(Math.abs(await evaluate(`Number(${canvas}.dataset.dotPixels)`) / originalSize - 150 / 55) < .002, 'dot size updates at the current viewport')
  assert.notEqual(await pixels(), originalPixels, 'size slider changes rendered globe')
  await setRange('density', 50)
  assert.ok(Math.abs(await evaluate(`Number(${canvas}.dataset.points)`) / pointCount - .5) < .02, 'density removes points evenly')
  const sparsePixels = await pixels()
  await setRange('density', 200)
  assert.ok(await evaluate(`Number(${canvas}.dataset.points)`) > pointCount * 1.98, 'density adds a second geographic distribution')
  assert.notEqual(await pixels(), sparsePixels, 'density visibly changes rendered globe')
  assert.equal(await evaluate(`window.appearanceContext === ${canvas}.getContext('webgl2')`), true, 'live changes preserve the renderer')
  await setRange('size', 125)
  await setRange('density', 135)
  const settingsNavigation = await evaluate('performance.timeOrigin')
  await send('Page.reload')
  await until(`performance.timeOrigin !== ${settingsNavigation} && document.querySelector('.globe-horizon')?.dataset.scene === 'ready'`, 'settings reload')
  assert.equal(await evaluate(`${canvas}.dataset.dotSize`), '125', 'dot size persists')
  assert.equal(await evaluate(`${canvas}.dataset.dotDensity`), '135', 'dot density persists')
  assert.equal(await evaluate(`${canvas}.dataset.hoverRadius`), '150', 'hover radius persists')
  assert.equal(await evaluate(`document.querySelector('input[name="globe-radius"]').value`), '150', 'radius slider reflects saved value')
  assert.equal(await evaluate(`document.querySelector('input[name="globe-density"]').value`), '135', 'slider reflects saved density')
  await evaluate(`document.querySelector('.gh-settings').open = true; document.querySelector('input[name="globe-size"]').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' })
  assert.equal(await evaluate(`${canvas}.dataset.dotSize`), '130', 'keyboard adjusts live size')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  assert.equal(await evaluate(`document.querySelector('.gh-settings').open`), false, 'Escape closes controls')
  assert.equal(await evaluate(`document.activeElement.tagName`), 'SUMMARY', 'Escape restores focus to launcher')
  await setRange('size', 55); await setRange('density', 100); await setRange('radius', 130)
  assert.equal(await evaluate(`Number(${canvas}.dataset.points)`), pointCount, '100% preserves the approved dot composition')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await until(`${canvas}.dataset.motion === 'running'`, 'motion resumes after settings')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await until(`${canvas}.dataset.motion === 'still'`, 'system preference stops motion')
  const pausedFrame = await frame(); await sleep(250)
  assert.equal(await frame(), pausedFrame, 'reduced motion releases animation loop')
  const paused = await pixels()
  const dragArea = await evaluate(`(() => {const r=${canvas}.getBoundingClientRect();return {x:r.width*.20,y:r.top+170}})()`)
  const beforeDrag = await rotation()
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...dragArea })
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x: dragArea.x + 120, y: dragArea.y + 25 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x: dragArea.x + 120, y: dragArea.y + 25 })
  assert.notEqual(await rotation(), beforeDrag, 'pointer drag rotates the globe while paused')
  assert.notEqual(await pixels(), paused, 'rendered scene changes on drag')
  await evaluate(`${canvas}.focus()`)
  const beforeKey = await rotation()
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft' })
  assert.notEqual(await rotation(), beforeKey, 'arrow key rotates globe')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home' })
  assert.equal(await rotation(), '0.2200,0.2400', 'Home restores initial view')
  await shot('three-drag-verified')
  await shot('reduced-motion')
  await until(`${canvas}.dataset.motion === 'still'`, 'reduced motion stops')
  const still = await frame(); await sleep(250)
  assert.equal(await frame(), still, 'reduced motion releases animation loop')
  const layouts = []
  for (const [width, height] of [[1920, 1040], [1440, 806], [768, 760], [390, 760], [320, 760]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
    await sleep(180)
    const layout = await evaluate(`(() => {
      const heading=document.querySelector('.gh-heading').getBoundingClientRect();
      const globe=document.querySelector('.gh-canvas');
      return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,globeReady:globe.width>0&&globe.dataset.context==='ready',
        headingInside:heading.left>=0&&heading.right<=innerWidth};
    })()`)
    assert.equal(layout.overflow, false, `no overflow at ${width}`)
    assert.ok(layout.globeReady && layout.headingInside, `layout fits at ${width}: ${JSON.stringify(layout)}`)
    layouts.push(layout)
    await evaluate(`document.querySelector('.gh-settings').open = true`)
    assert.ok(await evaluate(`(() => {const r=document.querySelector('.gh-settings-panel').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()`), `controls fit at ${width}`)
    await shot(`controls-${width}`)
    await evaluate(`document.querySelector('.gh-settings').open = false`)
    await shot(`verified-${width}`)
  }
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const beforeTouch = await rotation()
  const touchY = await evaluate(`${canvas}.getBoundingClientRect().top + 45`)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 90, y: touchY }] })
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: touchY }] })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.notEqual(await rotation(), beforeTouch, 'touch drag rotates on mobile')
  assert.equal(await evaluate(`${canvas}.dataset.hover`), '0.000', 'touch does not leave a hover effect')
  assert.equal(await evaluate(`Number(${canvas}.dataset.trailSamples)`), 0, 'touch leaves no trail')
  assert.equal(await evaluate(`getComputedStyle(${canvas}).touchAction`), 'pan-y', 'vertical page scrolling remains available')
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await shot('motion-resumed')
  await until(`${canvas}.dataset.motion === 'running'`, 'preference update resumes')
  await evaluate(`document.querySelector('main').style.paddingTop='200vh'; document.body.style.minHeight='300vh'; scrollTo(0,0)`)
  await until(`${canvas}.dataset.motion === 'still'`, 'offscreen stops')
  const offscreenFrame = await frame(); await sleep(250)
  assert.equal(await frame(), offscreenFrame, 'offscreen releases animation loop')
  await evaluate(`document.querySelector('main').style.paddingTop=''; document.body.style.minHeight=''; scrollTo(0,0)`)
  await until(`${canvas}.dataset.motion === 'running'`, 'return onscreen resumes')
  await evaluate(`window.globeContext = ${canvas}.getContext('webgl2').getExtension('WEBGL_lose_context'); window.globeContext.loseContext()`)
  await until(`${canvas}.dataset.context === 'lost' && ${canvas}.dataset.motion === 'still'`, 'context loss stops rendering')
  await sleep(200)
  await evaluate(`window.globeContext.restoreContext()`)
  await until(`${canvas}.dataset.context === 'ready' && ${canvas}.dataset.motion === 'running'`, 'context restoration resumes rendering')
  // Verify the initial reduced-motion path and no-JavaScript static content separately.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const previousNavigation = await evaluate('performance.timeOrigin')
  await send('Page.reload')
  await until(`performance.timeOrigin !== ${previousNavigation} && document.querySelector('.globe-horizon')?.dataset.scene === 'ready' && ${canvas}?.dataset.motion === 'still'`, 'reduced-motion reload')
  assert.equal(await evaluate(`${canvas}.dataset.motion`), 'still')
  await send('Emulation.setScriptExecutionDisabled', { value: true })
  await send('Page.reload')
  await sleep(700)
  await send('Emulation.setScriptExecutionDisabled', { value: false })
  assert.equal(await evaluate(`document.querySelector('h2').textContent.includes('borders')`), true, 'semantic content remains without scripts')
  assert.deepEqual(errors, [], 'no browser runtime errors')
  assert.deepEqual(mutations, [], 'globe makes no mutation requests')
  const report = { url, layouts, checks: ['55% default and saved-size migration', 'gradual hover growth and decay', 'hover changes nearby pixels only and clears on exit', 'reduced-motion hover is immediate; touch has no sticky hover', 'live size and geographic density controls, keyboard support and persistence', 'approved 100% density preserved', 'old hint/reset/pause buttons removed', 'no mutation requests', 'real WebGL point geometry, no raster artwork', 'automatic rotation and rendered frames', 'pointer drag changes geometry and screenshot', 'keyboard rotation and Home reset', 'touch rotation, native vertical scroll', 'dynamic and initial reduced motion', 'offscreen pause/resume', 'WebGL context loss and recovery', 'semantic content without JavaScript', 'no runtime errors'], errors }
  writeFileSync(`${out}/verification.json`, JSON.stringify(report, null, 2))
  console.log('PASS: 1920, 1440, 768, 390 and 320px; 55% base, local hover growth, live dot controls, persistence, real WebGL, mouse/touch/keyboard rotation, reduced motion, offscreen lifecycle, context recovery, no-JavaScript content; no browser runtime errors.')
} finally {
  ws?.close()
  chrome.kill()
}
