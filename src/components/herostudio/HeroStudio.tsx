import { useEffect, useRef, useState } from 'react'
import type { StudioScene } from './scene'
import { DEFAULTS, VIEW_STORAGE_KEY, readStartingView, type StudioOptions } from './settings'
import { HeroNavigation, HeroIntroduction } from './HeroContent'
import './studio.css'

export function HeroStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<StudioScene | null>(null)
  const optionsRef = useRef(DEFAULTS)
  const [options, setOptions] = useState(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [controls, setControls] = useState(false)
  const [reference, setReference] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const keyboard = useRef({ x: 0, y: 0 })
  const demonstration = useRef(0)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current!
    try {
      const initial = { ...DEFAULTS, ...readStartingView(localStorage.getItem(VIEW_STORAGE_KEY)) }
      optionsRef.current = initial; setOptions(initial)
    } catch { /* Storage may be disabled; all controls still work. */ }
    setSettingsLoaded(true)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReduced = () => setReduced(media.matches)
    onReduced(); media.addEventListener('change', onReduced)
    const onLost = (event: Event) => { event.preventDefault(); setFailed(true); setReady(false) }
    canvas.addEventListener('webglcontextlost', onLost)
    import('./scene').then(({ createStudioScene }) => createStudioScene(canvas, () => {
      if (!cancelled) setReady(true)
    })).then((scene) => {
      if (cancelled) { scene.dispose(); return }
      sceneRef.current = scene; scene.update(optionsRef.current)
    }).catch((error) => {
      if (!cancelled) { console.error('Studio hero could not initialize:', error); setFailed(true) }
    })
    return () => {
      cancelled = true; cancelAnimationFrame(demonstration.current)
      canvas.removeEventListener('webglcontextlost', onLost); media.removeEventListener('change', onReduced)
      sceneRef.current?.dispose(); sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    optionsRef.current = options; sceneRef.current?.update(options)
    if (settingsLoaded) {
      try { localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ baseYaw: options.baseYaw, baseTilt: options.baseTilt, baseRoll: options.baseRoll, range: options.range })) } catch { /* Optional persistence. */ }
    }
  }, [options, settingsLoaded])

  const change = <K extends keyof StudioOptions>(key: K, value: StudioOptions[K]) => setOptions((o) => ({ ...o, [key]: value }))
  const reset = () => {
    cancelAnimationFrame(demonstration.current); keyboard.current = { x: 0, y: 0 }
    sceneRef.current?.reset(); setReference(false)
  }
  const demo = () => {
    stageRef.current?.focus({ preventScroll: true })
    if (reduced || !options.motion) return
    cancelAnimationFrame(demonstration.current)
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / 6500, 1)
      sceneRef.current?.move(Math.sin(t * Math.PI * 2) * .85, Math.sin(t * Math.PI) * -.45)
      if (t < 1) demonstration.current = requestAnimationFrame(tick)
      else sceneRef.current?.reset()
    }
    demonstration.current = requestAnimationFrame(tick)
  }
  const replay = () => {
    cancelAnimationFrame(demonstration.current); setReference(false)
    keyboard.current = { x: 0, y: 0 }; sceneRef.current?.replayEntrance()
  }

  return (
    <main className="studio" onPointerMove={(e) => {
      if (e.pointerType === 'touch' || (e.target as HTMLElement).closest('.studio-tools')) return
      cancelAnimationFrame(demonstration.current)
      const r = e.currentTarget.getBoundingClientRect()
      sceneRef.current?.move(1 - (e.clientX - r.left) / r.width * 2, 1 - (e.clientY - r.top) / Math.min(r.height, window.innerHeight) * 2)
    }} onPointerLeave={() => sceneRef.current?.reset()}>
      <HeroNavigation />
      <HeroIntroduction onExplore={demo} />

      <div className={`studio-stage ${ready ? 'is-ready' : ''} ${failed ? 'is-failed' : ''} ${reference ? 'is-reference' : ''}`} ref={stageRef} tabIndex={0}
        role="group" aria-label="Interactive 3D banking platform. Move your mouse, drag on a touchscreen, or use the arrow keys to rotate. Press Home to reset."
        onKeyDown={(e) => {
          const k = keyboard.current
          if (e.key === 'Home') { e.preventDefault(); reset(); return }
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
          e.preventDefault(); cancelAnimationFrame(demonstration.current)
          if (e.key === 'ArrowLeft') k.x = Math.max(-1, k.x - .22)
          if (e.key === 'ArrowRight') k.x = Math.min(1, k.x + .22)
          if (e.key === 'ArrowUp') k.y = Math.max(-1, k.y - .22)
          if (e.key === 'ArrowDown') k.y = Math.min(1, k.y + .22)
          sceneRef.current?.move(k.x, k.y)
        }}
        onPointerDown={(e) => { if (e.pointerType === 'touch') e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'touch' || !e.currentTarget.hasPointerCapture(e.pointerId)) return
          const r = e.currentTarget.getBoundingClientRect()
          sceneRef.current?.move(1 - (e.clientX - r.left) / r.width * 2, 1 - (e.clientY - r.top) / r.height * 2)
        }}
        onPointerUp={(e) => { if (e.pointerType === 'touch') { e.currentTarget.releasePointerCapture(e.pointerId); sceneRef.current?.reset() } }}
        onPointerCancel={() => sceneRef.current?.reset()}>
        <img className="studio-fallback" src="/projection-blocks.png" alt="Three terraced bronze blocks representing personal banking, business banking, and payments." />
        <canvas ref={canvasRef} className="studio-canvas" aria-hidden="true" />
        {reference && <img className="studio-reference" src="/hero-reference.png" alt="Original rendered hero design for visual comparison" />}
        <div className="studio-stage-caption" aria-live="polite">
          <span className="studio-status-dot" />{failed ? 'Static preview' : !ready ? 'Preparing your view' : reduced ? 'Still view · reduced motion' : options.clay ? 'Geometry view' : options.motion ? 'Move to explore' : 'Motion paused'}
        </div>
      </div>

      <div className="studio-tools" onPointerEnter={() => { cancelAnimationFrame(demonstration.current); sceneRef.current?.reset() }}>
        {controls && <aside className="studio-controls" aria-label="Studio controls">
          <div className="studio-controls-title"><span>STUDIO / 01</span><button aria-label="Close studio controls" onClick={() => setControls(false)}>×</button></div>
          <p>A new perspective.</p>
          <div className="studio-view-switch" role="group" aria-label="Surface view">
            <button aria-pressed={!options.clay && !reference} onClick={() => { change('clay', false); setReference(false) }}>Bronze</button>
            <button aria-pressed={options.clay && !reference} onClick={() => { change('clay', true); setReference(false) }}>Clay</button>
            <button aria-pressed={reference} onClick={() => setReference(!reference)}>Reference</button>
          </div>
          <fieldset className="studio-starting-view">
            <legend>Starting view</legend>
            <label className="studio-range">Rotation <output>{options.baseYaw.toFixed(1)}°</output><input aria-label="Starting rotation" type="range" min="-25" max="25" step=".1" value={options.baseYaw} onChange={(e) => change('baseYaw', Number(e.target.value))} /></label>
            <label className="studio-range">Tilt <output>{options.baseTilt.toFixed(1)}°</output><input aria-label="Starting tilt" type="range" min="5" max="30" step=".1" value={options.baseTilt} onChange={(e) => change('baseTilt', Number(e.target.value))} /></label>
            <label className="studio-range">Z rotation <output>{options.baseRoll.toFixed(1)}°</output><input aria-label="Starting Z rotation" type="range" min="-15" max="15" step=".1" value={options.baseRoll} onChange={(e) => change('baseRoll', Number(e.target.value))} /></label>
            <button className="studio-restore" onClick={() => change('baseRoll', 0)}>Level Z rotation</button>
            <small>Mouse movement starts from this view.<br />Saved on this browser.</small>
          </fieldset>
          <label className="studio-range">Mouse travel <output>±{options.range}°</output><input aria-label="Rotation range" type="range" min="4" max="24" step="1" value={options.range} onChange={(e) => change('range', Number(e.target.value))} /></label>
          <label className="studio-range">Surface light <output>{options.brightness.toFixed(2)}</output><input aria-label="Surface brightness" type="range" min=".6" max="1.8" step=".05" value={options.brightness} onChange={(e) => change('brightness', Number(e.target.value))} /></label>
          <label className="studio-range">Bronze reflections <output>{Math.round(options.reflections * 100)}%</output><input aria-label="Reflection strength" type="range" min="0" max="1" step=".05" value={options.reflections} onChange={(e) => change('reflections', Number(e.target.value))} /></label>
          <label className="studio-check"><span>Product displays</span><input type="checkbox" checked={options.screens} onChange={(e) => change('screens', e.target.checked)} /></label>
          <label className="studio-check"><span>Follow pointer</span><input type="checkbox" checked={options.motion} disabled={reduced} onChange={(e) => change('motion', e.target.checked)} /></label>
          {reduced && <small>Your reduced-motion preference is active.</small>}
          <div className="studio-control-actions"><button onClick={reset}>Reset view</button><button onClick={demo}>Play movement ↗</button></div>
          <button className="studio-replay" onClick={replay} disabled={reduced}>↻ Replay entrance</button>
          <button className="studio-restore" onClick={() => { reset(); setOptions(DEFAULTS) }}>Restore defaults</button>
          <a className="studio-old-link" href="/hero-depth">Open previous exploration ↗</a>
        </aside>}
        <button className="studio-tools-trigger" aria-expanded={controls} onClick={() => setControls(!controls)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M2 4h12M2 12h12M6 1v6M10 9v6" /></svg> Studio controls
        </button>
      </div>
    </main>
  )
}
