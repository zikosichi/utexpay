// Verify the static/mobile and interactive/desktop hero on a production build.
// Usage: node scripts/verify-static-hero.mjs [url] [output-directory]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const args = process.argv.slice(2)
const url = args[0] ?? 'http://127.0.0.1:3187/'
const out = args[1] ?? '/tmp/utex-static-hero-checks'
const W = 1440
const H = 1200
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
let requests = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  } else if (msg.method === 'Network.requestWillBeSent') {
    requests.push(msg.params.request.url)
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


const evaluate = async (expression) => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.result?.exceptionDetails) throw new Error(JSON.stringify(response.result.exceptionDetails))
  return response.result?.result?.value
}
const until = async (expression, label) => {
  for (let i = 0; i < 120; i++) {
    if (await evaluate(expression)) return
    await sleep(200)
  }
  throw new Error('Timed out: ' + label)
}
const screenshot = async (name) => {
  console.log('Screenshot:', name)
  const capture = await send('Page.captureScreenshot', { format:'png' })
  writeFileSync(`${out}/${name}.png`, Buffer.from(capture.result.data, 'base64'))
}
const report = []
const viewport = async (width, height, touch) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: touch ? 2 : 1, mobile: touch })
  await send('Emulation.setTouchEmulationEnabled', { enabled: touch })
}
try {
  mkdirSync(out, { recursive:true })
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled:true })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.heroContexts = 0;
    window.heroPosterVisible = false;
    const watchPoster = () => {
      const poster = document.querySelector('.accounts-hero .ah-scene-poster');
      if (poster && poster.getBoundingClientRect().width > 0 && getComputedStyle(poster).visibility !== 'hidden') window.heroPosterVisible = true;
      requestAnimationFrame(watchPoster);
    };
    requestAnimationFrame(watchPoster);
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (/webgl/.test(type) && this.classList.contains('photo-canvas')) window.heroContexts++;
      return original.call(this, type, ...args);
    };
  ` })
  const html = await (await fetch(url)).text()
  assert.ok(html.includes('accounts-hero-poster-768.webp'), 'poster must be in the initial HTML')
  assert.ok(html.includes('Explore accounts'), 'mobile CTA must work without JS')
  for (const [width, height, name] of [[390,844,'phone'], [844,390,'phone-landscape'], [820,1180,'tablet']]) {
    await viewport(width, height, true)
    requests = []
    await send('Page.navigate', { url })
    await until(`document.querySelector('.accounts-hero--static .ah-scene-poster')?.naturalWidth > 0`, name + ' image')
    await sleep(2200)
    assert.equal(await evaluate(`document.querySelector('.accounts-hero canvas') === null`), true, name + ': no hero canvas')
    assert.equal(await evaluate('window.heroContexts'), 0, name + ': no WebGL initialization')
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, name + ': no horizontal overflow')
    const unwanted = requests.filter(value => /LiveAccountsHero|bronze-source|photostructure\/panels|three.module/.test(value))
    assert.deepEqual(unwanted, [], name + ': no hero code/textures')
    assert.equal(await evaluate(`document.querySelector('.accounts-hero .studio-actions a[href="/#banking"]')?.textContent`), 'Explore accounts')
    report.push({ name, width, heroContexts:0, heroAssets:requests.filter(value => value.includes('accounts-hero-poster')) })
    await screenshot(name)
  }
  await viewport(390,844,true)
  await send('Page.navigate', { url })
  await until(`document.querySelector('.accounts-hero--static .ah-scene-poster')?.naturalWidth > 0`, 'phone reload')
  await evaluate(`document.querySelector('.accounts-hero .studio-actions a[href="/#banking"]').click()`)
  await until(`location.hash === '#banking'`, 'Explore accounts navigation')
  await evaluate(`location.hash = '#demo'`)
  await until(`location.hash === '#banking'`, 'mobile demo link redirects to banking')
  console.log('Checking desktop')
  await viewport(1440,1100,false)
  requests = []
  await send('Emulation.setScriptExecutionDisabled', {value:true})
  await send('Page.navigate', { url })
  await sleep(1500)
  await send('Emulation.setScriptExecutionDisabled', {value:false})
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.accounts-hero .ah-scene-poster')).display`), 'none', 'desktop SSR never displays poster')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.accounts-hero .ah-mobile-explore')).display`), 'none', 'desktop SSR hides mobile CTA')
  assert.ok(await evaluate(`document.querySelector('.accounts-hero .ah-desktop-explore').getBoundingClientRect().width > 0`), 'desktop SSR preserves demo CTA')
  assert.deepEqual(requests.filter(value => value.includes('accounts-hero-poster')), [], 'desktop SSR does not download mobile poster')
  await screenshot('desktop-before-javascript')
  requests = []
  await send('Page.navigate', { url })
  await until(`document.querySelector('.accounts-hero canvas')?.dataset.intro === 'complete'`, 'desktop scene')
  console.log('Desktop ready')
  assert.ok(await evaluate('window.heroContexts > 0'), 'desktop initializes WebGL')
  assert.equal(await evaluate(`document.querySelector('.accounts-hero canvas').getContext('webgl2').isContextLost()`), false, 'ready desktop renderer still has a live WebGL context')
  assert.equal(await evaluate('window.heroPosterVisible'), false, 'desktop never flashes the poster while loading')
  assert.equal(await evaluate(`document.querySelector('.accounts-hero .ah-scene-poster') === null`), true, 'live desktop contains no poster')
  assert.deepEqual(requests.filter(value => value.includes('accounts-hero-poster')), [], 'desktop does not download mobile poster')
  await screenshot('desktop')
  await send('Input.dispatchMouseEvent', { type:'mouseMoved', x:1200, y:650 })
  await sleep(800)
  assert.ok(Math.abs(Number(await evaluate(`document.querySelector('.accounts-hero canvas').dataset.yaw`))) > .1, 'desktop reacts to pointer')
  console.log('Checking resize')
  await viewport(390,844,true)
  await until(`document.querySelector('.accounts-hero--static') && !document.querySelector('.accounts-hero canvas')`, 'resize to phone removes renderer')
  await viewport(1440,1100,false)
  await until(`document.querySelector('.accounts-hero canvas')?.dataset.intro === 'complete'`, 'resize back initializes scene')
  report.push({ name:'desktop', pointerMotion:true, responsiveSwitch:true })
  await viewport(390,844,true)
  console.log('Checking no JavaScript')
  await send('Emulation.setScriptExecutionDisabled', {value:true})
  await send('Page.navigate', {url})
  await sleep(1500)
  await screenshot('phone-no-javascript')
  await send('Emulation.setScriptExecutionDisabled', {value:false})
  assert.ok(await evaluate(`document.querySelector('.accounts-hero--static .ah-scene-poster')?.naturalWidth > 0`), 'poster renders without JS')
  const errors = logs.filter(line => /\[exception\]|\[console.error\]/.test(line))
  assert.deepEqual(errors, [], 'no runtime errors')
  writeFileSync(`${out}/report.json`, JSON.stringify({report, logs},null,2))
  console.log(JSON.stringify(report,null,2))
} finally {
  ws.close()
  chrome.kill()
}
