// Bake the photographic hero's panels (panels.tsx) into textures.
//
//   node --experimental-strip-types scripts/bake-panels.mjs [--scale 3] [--quality 92] [--only a,b] [--base http://127.0.0.1:3000] [--png]
//
// Needs the dev server running. Each panel is rendered flat by
// `/panel-bake?surface=<name>` over a transparent page, screenshotted by
// headless Chrome at `scale` device pixels per CSS pixel, and encoded to
// `public/photostructure/panels/<name>.webp` (lossy RGB, lossless alpha).
// `--png` keeps the PNG next to it for inspection.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLEED, PANEL_NAMES, PANEL_SURFACES } from '../src/components/photostructure/surfaces.ts'

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const scale = Number(opt('--scale', 3)), quality = Number(opt('--quality', 92))
const base = opt('--base', 'http://127.0.0.1:3000'), keepPng = args.includes('--png')
const names = opt('--only', null)?.split(',') ?? PANEL_NAMES
const outDir = join(import.meta.dirname, '..', 'public', 'photostructure', 'panels')
mkdirSync(outDir, { recursive: true })
for (const name of names) if (!PANEL_SURFACES[name]) { console.error(`Unknown panel "${name}". Known: ${PANEL_NAMES.join(', ')}`); process.exit(1) }

const port = 9400 + Math.floor(Math.random() * 300)
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--window-size=1200,900',
  `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TMPDIR}/cdp-bake-${port}`, 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let target
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch {}
  if (!target) await sleep(200)
}
if (!target) { chrome.kill(); throw new Error('Chrome did not start') }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve) => (ws.onopen = resolve))
let id = 0
const pending = new Map(), logs = []
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
  else if (message.method === 'Runtime.exceptionThrown') logs.push(`[exception] ${message.params.exceptionDetails.text}`)
  else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') logs.push(`[error] ${message.params.entry.text}`)
}
const send = (method, params = {}) => new Promise((resolve) => { const mid = ++id; pending.set(mid, resolve); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })

let failed = false
for (const name of names) {
  const spec = PANEL_SURFACES[name]
  const width = spec.width + 2 * BLEED, height = spec.height + 2 * BLEED
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
  await send('Page.navigate', { url: `${base}/panel-bake?surface=${name}` })
  let ready = ''
  for (let i = 0; i < 200 && !ready; i++) {
    await sleep(100)
    ready = await evaluate(`document.querySelector('[data-bake="${name}"]') ? document.documentElement.dataset.bakeReady : ''`)
  }
  if (ready !== 'true') { console.error(`${name}: fonts did not settle (${ready || 'page never mounted'})`); failed = true; continue }
  // Two frames for layout + one paint, then a short settle for late font swaps.
  await evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))')
  await sleep(400)
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: true })
  if (!shot.result?.data) { console.error(`${name}: screenshot failed`, shot); failed = true; continue }
  const png = join(outDir, `${name}.png`), webp = join(outDir, `${name}.webp`)
  writeFileSync(png, Buffer.from(shot.result.data, 'base64'))
  const encode = spawnSync('cwebp', ['-quiet', '-q', String(quality), '-alpha_q', '100', '-m', '6', '-sharp_yuv', '-metadata', 'none', png, '-o', webp])
  if (encode.status !== 0) { console.error(`${name}: cwebp failed`, encode.stderr?.toString()); failed = true; continue }
  const size = statSync(webp).size
  if (!keepPng) unlinkSync(png)
  console.log(`${name.padEnd(18)} ${width * scale} × ${height * scale}  ${(size / 1024).toFixed(0).padStart(4)} KB`)
}
if (logs.length) console.log(logs.join('\n'))
ws.close(); chrome.kill()
process.exit(failed ? 1 : 0)
