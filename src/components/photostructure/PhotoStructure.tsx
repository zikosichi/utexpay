import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { DEFAULT_OPTIONS, SOURCE } from './config'
import type { LightingPreset, PhotoFocus, PhotoOptions, PhotoScene, ViewMode } from './config'
import { HeroIntroduction, HeroNavigation } from '../herostudio/HeroContent'
import '../herostudio/studio.css'
import './photostructure.css'
import { PERSONAL_VARIANTS } from './personalVariants'
import { createPhotoScene } from './scene'

/** What the engraved faces say, for readers who cannot see the canvas. */
const FACES = [
  { name: 'Personal', caption: 'One account', detail: 'one account fanned out to the euro, dollar and pound balances it holds.' },
  { name: 'Business', caption: 'Everyone in one place', detail: 'a team of five converging on the same account.' },
  { name: 'Payments', caption: 'Money arriving', detail: 'thirty days of card payments rising.' },
]

export function PhotoStructure() {
  const canvas = useRef<HTMLCanvasElement>(null), scene = useRef<PhotoScene | null>(null)
  const fallback = useRef<HTMLImageElement>(null)
  const stage = useRef<HTMLDivElement>(null), demonstration = useRef(0)
  const controlTrigger = useRef<HTMLButtonElement>(null), controlClose = useRef<HTMLButtonElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [options, setOptions] = useState<PhotoOptions>(DEFAULT_OPTIONS)
  const optionsRef = useRef(options)
  const [controls, setControls] = useState(false)
  useEffect(() => { if (controls) controlClose.current?.focus({ preventScroll: true }) }, [controls])
  useEffect(() => {
    optionsRef.current = options
    scene.current?.update(options)
  }, [options])
  useEffect(() => {
    const controller = new AbortController(), element = canvas.current!
    const onLost = (event: Event) => { event.preventDefault(); setStatus('fallback'); scene.current?.dispose(); scene.current = null }
    element.addEventListener('webglcontextlost', onLost)
    createPhotoScene(element, fallback.current!, stage.current!, controller.signal).then((created) => {
      if (controller.signal.aborted) { created.dispose(); return }
      scene.current = created
      created.update(optionsRef.current)
      setStatus('ready')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      console.error('Photographic structure could not initialize:', error)
      setStatus('fallback')
    })
    return () => {
      cancelAnimationFrame(demonstration.current)
      controller.abort()
      element.removeEventListener('webglcontextlost', onLost)
      scene.current?.dispose()
      scene.current = null
    }
  }, [])
  function move(event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button, a, input, select, .studio-tools')) return
    cancelAnimationFrame(demonstration.current)
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.pointerType === 'touch') {
      if (!touch.current) return
      pointer.current = { x: Math.max(-1, Math.min(1, (touch.current.x - event.clientX) / (bounds.width * .35))), y: 0 }
    } else {
      pointer.current = { x: -((event.clientX - bounds.left) / bounds.width * 2 - 1), y: (event.clientY - bounds.top) / bounds.height * 2 - 1 }
    }
    scene.current?.move(pointer.current.x, pointer.current.y)
  }
  function reset() { cancelAnimationFrame(demonstration.current); pointer.current = { x: 0, y: 0 }; scene.current?.reset() }
  function demo() {
    reset()
    setOptions((previous) => ({ ...previous, mode: 'photo', focus: 'full' }))
    stage.current?.focus({ preventScroll: true })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    stage.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'nearest' })
    if (reduced || !options.motion) return
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 6500, 1)
      scene.current?.move(Math.sin(progress * Math.PI * 2) * .85, Math.sin(progress * Math.PI) * -.45)
      if (progress < 1) demonstration.current = requestAnimationFrame(tick)
      else scene.current?.reset()
    }
    demonstration.current = requestAnimationFrame(tick)
  }
  function closeControls() { setControls(false); controlTrigger.current?.focus({ preventScroll: true }) }
  function replayIntro() {
    reset()
    setOptions((previous) => ({ ...previous, mode: 'photo', focus: 'full' }))
    scene.current?.replayIntro()
    setControls(false)
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, [number, number]> = { ArrowLeft: [.22, 0], ArrowRight: [-.22, 0], ArrowUp: [0, -.22], ArrowDown: [0, .22] }
    if (event.key === 'Home') { event.preventDefault(); reset(); return }
    const change = steps[event.key]
    if (!change) return
    event.preventDefault()
    cancelAnimationFrame(demonstration.current)
    pointer.current.x = Math.max(-1, Math.min(1, pointer.current.x + change[0]))
    pointer.current.y = Math.max(-1, Math.min(1, pointer.current.y + change[1]))
    scene.current?.move(pointer.current.x, pointer.current.y)
  }
  function mode(value: ViewMode) { reset(); setOptions((previous) => ({ ...previous, mode: value })) }
  function lighting(value: LightingPreset) { reset(); setOptions((previous) => ({ ...previous, mode: 'photo', lighting: value })) }
  return (
    <section className="studio photo-hero" aria-label="Start with an account" onPointerMove={move} onPointerLeave={reset}>
      <canvas ref={canvas} className={`photo-canvas ${status === 'ready' ? 'is-ready' : ''}`} aria-hidden="true" />
      <HeroNavigation />
      <HeroIntroduction onExplore={demo} />
      <div ref={stage} className={`studio-stage photo-stage ${options.focus !== 'full' ? 'photo-stage--detail' : ''}`} tabIndex={0} role="region"
        aria-label="Interactive bronze structure. Move your pointer or drag to rotate. Arrow keys rotate; Home resets the view."
        onKeyDown={keyboard}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch') return
          touch.current = { x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={() => { touch.current = null }}
        onPointerCancel={() => { touch.current = null; reset() }}>
        <img ref={fallback} className={`photo-fallback ${status === 'fallback' ? 'is-visible' : ''}`} src={SOURCE} decoding="async" fetchPriority="high" aria-hidden={status !== 'fallback'}
          alt="Three ascending blocks of dark bronze, with fine gold edges, on a bronze foundation." />
        <div className="sr-only">{FACES.map((face) => <section key={face.name}>
          <h2>{face.name}</h2><p>{face.caption}: {face.detail}</p>
        </section>)}</div>
        <p className="photo-status" aria-live="polite">{status === 'fallback' ? 'Still preview · 3D is unavailable in this browser' : ''}</p>
      </div>
      <div className="studio-tools photo-tools" onPointerEnter={reset} onKeyDown={(event) => {
        if (event.key === 'Escape' && controls) { event.preventDefault(); closeControls() }
      }}>
        {controls && <aside id="photo-controls" className="studio-controls photo-controls" aria-label="Hero configuration">
          <div className="studio-controls-title"><span>HERO CONFIGURATION</span><button ref={controlClose} aria-label="Close view controls" onClick={closeControls}>×</button></div>
          <p>A new perspective.</p>
          <div className="studio-view-switch" role="group" aria-label="Display mode">
            {([['photo', 'Sculpture'], ['source', 'Original'], ['mesh', 'Geometry']] as const).map(([value, label]) => (
              <button key={value} aria-pressed={options.mode === value} onClick={() => mode(value)} disabled={status !== 'ready'}>{label}</button>
            ))}
          </div>
          <label className="photo-select">Framing<select value={options.focus} onChange={(event) => setOptions({ ...options, focus: event.target.value as PhotoFocus })}>
            <option value="full">Full scene</option><option value="personal">Personal close-up</option><option value="business">Business close-up</option><option value="payments">Payments close-up</option>
          </select></label>
          <label className="studio-check"><span>Follow pointer</span><input type="checkbox" checked={options.motion} onChange={(event) => setOptions({ ...options, motion: event.target.checked })} /></label>
          <label className="studio-range">Rotation range <output>±{options.range}°</output><input aria-label="Rotation range" type="range" min="2" max="9" step="1" value={options.range} onChange={(event) => setOptions({ ...options, range: Number(event.target.value) })} /></label>
          <label className="studio-range">Moving reflections <output>{Math.round(options.response * 100)}%</output><input aria-label="Moving reflections" type="range" min="0" max="1" step="0.1" value={options.response} onChange={(event) => setOptions({ ...options, response: Number(event.target.value) })} /></label>
          <div className="photo-lighting">
            <span className="photo-control-label">Lighting</span>
            <div className="studio-view-switch photo-lighting-switch" role="group" aria-label="Lighting preset">
              {([['unlit', 'No lighting'], ['backdrop', 'Backdrop only'], ['illuminated', 'Full lighting']] as const).map(([value, label]) => (
                <button key={value} aria-pressed={options.lighting === value} disabled={status !== 'ready'} onClick={() => lighting(value)}>{label}</button>
              ))}
            </div>
            <p className="photo-lighting-hint">{options.lighting === 'illuminated' ? 'Relit bronze, warm backdrop and reflected floor.' : options.lighting === 'backdrop' ? 'Original bronze with the existing studio backdrop.' : 'Original bronze against black. Lighting settings are kept.'}</p>
          </div>
          <fieldset className="photo-light-settings" disabled={options.lighting === 'unlit' || options.mode !== 'photo'} aria-label="Lighting adjustments">
          <label className="studio-range">Light intensity <output>{Math.round(options.backgroundLight * 100)}%</output><input aria-label="Light intensity" type="range" min="0" max="2" step="0.05" value={options.backgroundLight} onChange={(event) => setOptions({ ...options, backgroundLight: Number(event.target.value) })} /></label>
          <label className="studio-range">Light spread <output>{Math.round(options.lightSpread * 100)}%</output><input aria-label="Light spread" type="range" min="0.7" max="1.5" step="0.05" value={options.lightSpread} onChange={(event) => setOptions({ ...options, lightSpread: Number(event.target.value) })} /></label>
          <label className="studio-range">Floor reflection <output>{Math.round(options.floorReflection * 100)}%</output><input aria-label="Floor reflection" type="range" min="0" max="0.85" step="0.05" value={options.floorReflection} onChange={(event) => setOptions({ ...options, floorReflection: Number(event.target.value) })} /></label>
          <label className="studio-range">Overhead rays <output>{Math.round(options.overheadLight * 100)}%</output><input aria-label="Overhead rays" type="range" min="0" max="1" step="0.05" value={options.overheadLight} disabled={options.lighting !== 'illuminated'} onChange={(event) => setOptions({ ...options, overheadLight: Number(event.target.value) })} /></label>
          </fieldset>
          <details className="photo-layouts"><summary>Personal layout</summary><div className="studio-view-switch photo-layout-switch" role="group" aria-label="Personal layout">
            {PERSONAL_VARIANTS.map((item) => <button key={item.id} aria-pressed={options.layout === item.id} onClick={() => {
              setOptions((previous) => ({ ...previous, layout: item.id, mode: 'photo', focus: 'personal' }))
            }}>{item.label}</button>)}
          </div></details>
          <div className="studio-control-actions"><button onClick={reset}>Reset view</button><button onClick={demo}>Play movement ↗</button></div>
          <button className="studio-replay" onClick={replayIntro}>↻ Replay intro</button>
          <button className="studio-restore" onClick={() => { reset(); setOptions(DEFAULT_OPTIONS) }}>Restore defaults</button>
          <a className="studio-old-link" href="/hero-studio">Open original studio ↗</a>
        </aside>}
        <button ref={controlTrigger} className="studio-tools-trigger" aria-label="Open view controls" aria-expanded={controls} aria-controls="photo-controls" onClick={() => controls ? closeControls() : setControls(true)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 4h12M2 12h12M6 1v6M10 9v6" /></svg> Studio controls
        </button>
      </div>
    </section>
  )
}
