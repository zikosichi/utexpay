// Check the closing card fan at intermediate poses, in reverse, and with reduced motion.
// Usage: node scripts/verify-closing-browser.mjs [url]
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
const W = 1600, H = 1000
const url = process.argv[2] ?? 'http://127.0.0.1:3000/'
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
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
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

try {
 await send('Page.enable')
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'},{name:'pointer',value:'coarse'},{name:'hover',value:'none'}]})
 await send('Page.navigate',{url});await sleep(1500);await evaluate('document.fonts.ready.then(() => true)')
 for(const [width,height] of [[744,1133],[820,1180],[1024,1366],[1180,820],[390,844]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(100)
  const compact=width<=760 || (width<=1100 && height>width),cardY=compact?.6:.55
  await evaluate(`document.querySelector('.mc-card-sticky').scrollIntoView({block:'center',behavior:'instant'})`);await sleep(500)
  for(const progress of [0,.25,.5,.75,1,.5,0]){
   await evaluate(`scrollTo({top:scrollY+document.querySelector('.mc-clear-marker').getBoundingClientRect().top-innerHeight*${cardY-.18}+innerHeight*.16*${progress},behavior:'instant'})`);await sleep(250)
   const state=await evaluate(`(() => {const sticky=document.querySelector('.mc-card-sticky'),pose=document.querySelector('.mc-card-pose'),cards=[...document.querySelectorAll('.mc-card')];return {overflow:document.documentElement.scrollWidth>innerWidth,clip:getComputedStyle(sticky).overflowY,origin:getComputedStyle(pose).transformOrigin,loaded:cards.every(c=>c.querySelector('img').complete&&c.querySelector('img').naturalWidth>0),opacity:cards.map(c=>+getComputedStyle(c).opacity),bounds:cards.map(c=>{const r=c.querySelector('img').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})}})()`)
   assert.equal(state.overflow,false);assert.equal(state.clip,'visible','rotating cards must escape the sticky frame');assert.equal(state.loaded,true)
   for(const card of state.bounds){assert.ok(card.top>0&&card.bottom<height,'cards stay vertically visible while unfolding');assert.ok(card.left>=-1&&card.right<=width+1,'fan stays within the viewport')}
   if(progress===0)assert.ok(state.opacity[0]<.01&&state.opacity[1]<.01,`rear cards hidden before unfolding: ${width}, opacity ${state.opacity}`)
   if(progress===1)assert.ok(state.opacity.every(v=>v>.99),'all cards revealed at full spread')
  }
  console.log(`Passage, fan and reverse: ${width} × ${height}`)
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
 await send('Emulation.setDeviceMetricsOverride',{width:820,height:1180,deviceScaleFactor:1,mobile:false});await sleep(200)
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.mc-reduced-chapters')).display`),'grid')
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.mc-card-sticky')).position`),'relative')
 console.log('Reduced-motion layout: passed')
} finally {ws.close();chrome.kill()}
