// Usage: node scripts/verify-accounts-browser.mjs [url] [output-directory]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const args = process.argv.slice(2)
const url = args[0] ?? 'http://127.0.0.1:3000/'
const out = args[1] ?? 'output/accountshero'
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
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
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
const press = (text) => evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`)
const screenshot = async (name) => {
  const capture = await send('Page.captureScreenshot', { format:'png' })
  writeFileSync(`${out}/${name}.png`, Buffer.from(capture.result.data, 'base64'))
}
try {
  mkdirSync(out, { recursive:true })
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width:W, height:H, deviceScaleFactor:1, mobile:false })
  await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] })
  await send('Page.navigate', {url})
  await until('document.querySelector("canvas")?.dataset.ready==="true"','scene ready')
  assert.equal(await evaluate('document.querySelector("canvas").dataset.motion'), 'reduced')
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false)
  await screenshot('desktop')
  assert.equal(await evaluate('document.querySelector("canvas").dataset.card'),'metal')
  assert.equal(await evaluate('document.querySelector("canvas").dataset.shelfReflection'),'card')
  assert.equal(await evaluate(`(() => {
    const panel=[...document.querySelectorAll('[data-live-panel]')].find(p=>p.style.clipPath.startsWith('path('));
    if(!panel)return false;
    const subpath=panel.style.clipPath.split('Z M')[1];
    if(!subpath)return false;
    const pairs=[...subpath.matchAll(/(-?[\\d.]+) (-?[\\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
    if(pairs.length<3)return false;
    const local={x:pairs.reduce((n,p)=>n+p[0],0)/pairs.length,y:pairs.reduce((n,p)=>n+p[1],0)/pairs.length};
    const point=new DOMMatrix(getComputedStyle(panel).transform).transformPoint(local);
    const hero=document.querySelector('.accounts-hero').getBoundingClientRect();
    const element=document.elementFromPoint(hero.x+point.x/point.w,hero.y+point.y/point.w);
    return element!==null && !element.closest('[data-live-panel]');
  })()`),true,'Foreground card must occlude HTML panels and their pointer targets')

  assert.equal(await evaluate('document.querySelectorAll("[data-live-panel] .ah-glass").length'),3)
  assert.equal(await evaluate('performance.getEntriesByType("resource").some(r=>r.name.includes("/accountshero/panels/"))'),false)
  assert.equal(await evaluate(`(() => {
    const rows=[...document.querySelectorAll('.ah-currency')];
    return rows.every((row,i)=>row.offsetTop===rows[0].offsetTop && (!i || row.offsetLeft>rows[i-1].offsetLeft)) &&
      rows.every(row=>row.querySelector('.ah-currency-amount').offsetTop>row.querySelector('.ah-currency-label').offsetTop);
  })()`),true,'Currencies form three columns with amounts below their labels')
  await evaluate(`document.querySelectorAll('.ah-currency')[1].click()`)
  await until(`document.querySelector('.ah-personal .ah-total').textContent==='$5,820.40'`,'USD balance')
  assert.equal(await evaluate(`document.querySelectorAll('.ah-currency')[1].getAttribute('aria-pressed')`),'true')
  await press('All accounts')
  await until(`document.querySelector('.ah-personal .ah-total').textContent==='€28,142.55'`,'total balance restored')
  await until(`document.activeElement===document.querySelectorAll('.ah-currency')[1]`,'currency focus restored')
  await evaluate(`document.querySelector('.ah-transfer').click()`)
  await until(`document.querySelector('.ah-business .ah-detail-fields')?.textContent.includes('INV-2026-1048')`,'transfer details')
  await evaluate(`document.querySelector('.ah-business .ah-back').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`)
  await until(`document.activeElement===document.querySelector('.ah-transfer')`,'transfer Escape restores focus')
  await evaluate(`{const period=document.querySelector('.ah-today');period.value='Yesterday';period.dispatchEvent(new Event('change',{bubbles:true}))}`)
  await until(`document.querySelector('.ah-payments .ah-total').textContent==='€3,260.00'`,'payment period changes')
  assert.equal(await evaluate(`document.querySelector('.ah-subtitle').textContent`),'19 payments received')
  await evaluate(`document.querySelector('.ah-processing-payment').click()`)
  await until(`document.querySelector('.ah-payments .ah-detail-fields')?.textContent.includes('#1046')`,'correct receipt')
  assert.equal(await evaluate(`document.querySelector('.ah-payments .ah-total').textContent`),'+€98.00')
  await press('← Back')
  await until(`document.activeElement===document.querySelector('.ah-processing-payment')`,'receipt Back restores focus')
  await evaluate(`{const period=document.querySelector('.ah-today');period.value='Today';period.dispatchEvent(new Event('change',{bubbles:true}));document.activeElement.blur()}`)

  await evaluate('document.querySelector(".studio-tools-trigger").click()')
  await press('Geometry')
  await until('document.querySelector("canvas").dataset.mode==="mesh"','geometry mode')
  assert.equal(await evaluate('document.querySelector("canvas").dataset.shelfReflection'),'hidden')
  assert.equal(await evaluate(`document.querySelector('.ah-live-layer').inert && getComputedStyle(document.querySelector('.ah-live-layer')).visibility==='hidden'`),true)
  await screenshot('geometry')
  await press('Sculpture')
  await press('×')
  await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'no-preference'}] })
  // Media-query change events arrive asynchronously; wait before rotating.
  await until('document.querySelector("canvas").dataset.motion==="enabled"','motion preference applied')
  await evaluate('document.querySelector(".photo-stage").dispatchEvent(new KeyboardEvent("keydown", {key:"ArrowLeft",bubbles:true}))')
  await until('Number(document.querySelector("canvas").dataset.yaw)>.2','keyboard rotation')
  await evaluate('document.querySelector(".photo-stage").dispatchEvent(new KeyboardEvent("keydown", {key:"Home",bubbles:true}))')
  await until('Math.abs(Number(document.querySelector("canvas").dataset.yaw))<.05','home reset')
  await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:60,y:720})
  await until('Number(document.querySelector("canvas").dataset.yaw)>1','pointer rotation')
  await screenshot('rotated')
  for (const selector of ['.ah-currency','.ah-transfer','.ah-processing-payment']) {
    const target = await evaluate(`(() => {
      const element=document.querySelector('${selector}'),r=element.getBoundingClientRect(),hero=document.querySelector('.accounts-hero').getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2,expected:-((r.x+r.width/2-hero.x)/hero.width*2-1)*6};
    })()`)
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:target.x,y:target.y})
    await until(`Math.abs(Number(document.querySelector('canvas').dataset.yaw)-(${target.expected}))<.06`,'rotation continues over '+selector)
  }
  // A focused interactive control must not suppress subsequent pointer rotation.
  await evaluate(`document.querySelectorAll('.ah-currency')[1].focus();document.querySelectorAll('.ah-currency')[1].click()`)
  await until(`document.querySelector('.ah-personal .ah-total').textContent==='$5,820.40'`,'currency remains interactive with motion enabled')
  const focused = await evaluate(`(() => {const r=document.querySelector('.ah-currency').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  const previousYaw = await evaluate(`Number(document.querySelector('canvas').dataset.yaw)`)
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...focused})
  await until(`Math.abs(Number(document.querySelector('canvas').dataset.yaw)-(${previousYaw}))>.3`,'rotation continues while a currency has focus')
  await press('All accounts')
  await evaluate('document.activeElement.blur()')
  await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] })
  await until('document.querySelector("canvas").dataset.yaw==="0.000"','reduced motion neutral')
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:950,deviceScaleFactor:1,mobile:true})
  await sleep(400)
  await screenshot('mobile')
  await evaluate(`document.querySelectorAll('.ah-currency')[1].click()`)
  await until('document.querySelector("canvas").dataset.framing==="personal"','mobile first tap opens readable Personal view')
  assert.equal(await evaluate(`document.querySelector('.ah-personal .ah-total').textContent`),'€28,142.55')
  await evaluate(`document.querySelectorAll('.ah-currency')[1].click()`)
  await until(`document.querySelector('.ah-personal .ah-total').textContent==='$5,820.40'`,'mobile currency interaction')
  await press('All accounts')

  await until('document.querySelector("canvas").dataset.framing==="personal"','mobile focus')
  await sleep(400)
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false)
  await screenshot('mobile-personal')
  await evaluate('document.querySelector(".studio-tools-trigger").click()')
  await evaluate(`{const framing=document.querySelector('.photo-select select');framing.value='payments';framing.dispatchEvent(new Event('change',{bubbles:true}))}`)
  await press('×')
  await until('document.querySelector("canvas").dataset.framing==="payments"','mobile payments focus')
  await sleep(400)
  await screenshot('mobile-payments')
  await evaluate(`document.querySelector('.ah-processing-payment').click()`)
  await until(`document.querySelector('.ah-payments .ah-detail-fields')?.textContent.includes('#1048')`,'mobile receipt')
  await screenshot('mobile-receipt')
  assert.equal(await evaluate(`(() => {const detail=document.querySelector('.ah-payments .ah-detail');return detail.scrollHeight<=detail.clientHeight+1})()`),true,'Receipt fits its panel')
  await press('← Back')

  await evaluate('document.querySelector(".studio-nav-toggle").click()')
  assert.equal(await evaluate('document.querySelector(".studio-nav-toggle").getAttribute("aria-expanded")'),'true')
  await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))')
  await until('document.querySelector(".studio-nav-toggle").getAttribute("aria-expanded")==="false"','mobile menu escape')
  await evaluate(`document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`)
  await until(`document.querySelector('.ah-live-layer.is-fallback') && !document.querySelector('.ah-live-layer').inert`,'live fallback after context loss')
  await evaluate(`document.querySelectorAll('.ah-currency')[2].click()`)
  await until(`document.querySelector('.ah-personal .ah-total').textContent==='£3,540.00'`,'fallback remains interactive')
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false)
  await screenshot('mobile-fallback')
  const errors=logs.filter(line=>line.startsWith('[exception]') || /console.error|VALIDATE_STATUS|Error compiling|THREE.WebGLProgram/.test(line))
  assert.deepEqual(errors,[])
  console.log('Passed: foreground metal card occludes HTML and pointer targets; live HTML with no panel image requests; horizontal currencies and selected balances; transfer details and receipt navigation with focus restoration; payment periods; pointer rotation across all three live panels and focused controls; renderer, geometry mode, keyboard/pointer motion, reduced motion, mobile zoom/interactions/navigation, no overflow and interactive WebGL-loss fallback. No runtime/shader errors.')
} finally {
  ws.close(); chrome.kill()
}
