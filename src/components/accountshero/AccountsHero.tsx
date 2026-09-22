import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { CARD_APPEARANCE_LIMITS, CARD_APPEARANCE_STORAGE_KEY, CARD_LIGHT_STORAGE_KEY, CARD_LIGHT_YAW_LIMIT, CARD_PERSPECTIVE_LIMIT, CARD_PERSPECTIVE_STORAGE_KEY, CARD_YAW_LIMIT, CARD_YAW_STORAGE_KEY, DEFAULT_CARD_APPEARANCE, DEFAULT_CARD_TEXTURE, DEFAULT_HINTS, DEFAULT_OPTIONS, HINT_STORAGE_KEY, SOURCE } from './config'
import type { CardAppearance, PhotoFocus, PhotoOptions, PhotoScene, ViewMode } from './config'
import { HeadlineSwitcher, HeroIntroduction, HeroNavigation } from '../herostudio/HeroContent'
import { DEFAULT_HERO_BODY, DEFAULT_HERO_FONT, HERO_BODY_FONTS, HERO_BODY_STORAGE_KEY, HERO_FONTS, HERO_FONT_STORAGE_KEY, heroBodyFont, heroBodyPreviewStyle, heroFont, heroFontPreviewStyle, heroFontStyle, isHeroBodyId, isHeroFontId, loadAllBodyFonts, loadAllHeroFonts, loadBodyFont, loadHeroFont } from '../herostudio/heroFonts'
import type { HeroBodyId, HeroFontId } from '../herostudio/heroFonts'
import { DEFAULT_HERO_HEADLINE, HERO_HEADLINES, HERO_HEADLINE_STORAGE_KEY, heroHeadline, isHeroHeadlineId } from '../herostudio/heroHeadlines'
import type { HeroHeadlineId } from '../herostudio/heroHeadlines'
import '../herostudio/studio.css'
import './accounts-hero.css'
import { createPhotoScene } from './scene'
import { PANELS } from './panels'
import { startIdleNudge } from './nudge'
import type { HintSettings, HintStyle } from './nudge'
import './panels.css'

const percent = (value: number) => `${Math.round(value * 100)}%`
const degrees = (value: number) => `${value}°`
const units = (value: number) => `${value}u`
const multiplier = (value: number) => `${Number(value.toFixed(2))}×`

function Range({ label, value, min, max, step, format = percent, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  format?: (value: number) => string; onChange: (value: number) => void
}) {
  return <label className="studio-range">{label} <output>{format(value)}</output>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
}

export function AccountsHero() {
  const canvas = useRef<HTMLCanvasElement>(null), scene = useRef<PhotoScene | null>(null)
  const fallback = useRef<HTMLImageElement>(null), htmlPanels = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null), demonstration = useRef(0)
  const controlTrigger = useRef<HTMLButtonElement>(null), controlClose = useRef<HTMLButtonElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [options, setOptions] = useState<PhotoOptions>(DEFAULT_OPTIONS)
  const [font, setFont] = useState<HeroFontId>(DEFAULT_HERO_FONT)
  const [bodyFont, setBodyFont] = useState<HeroBodyId>(DEFAULT_HERO_BODY)
  const [headline, setHeadline] = useState<HeroHeadlineId>(DEFAULT_HERO_HEADLINE)
  const fontRestored = useRef(false)
  useEffect(() => {
    try {
      const storedDisplay = localStorage.getItem(HERO_FONT_STORAGE_KEY)
      if (isHeroFontId(storedDisplay)) setFont(storedDisplay)
      const storedBody = localStorage.getItem(HERO_BODY_STORAGE_KEY)
      if (isHeroBodyId(storedBody)) setBodyFont(storedBody)
      const storedHeadline = localStorage.getItem(HERO_HEADLINE_STORAGE_KEY)
      if (isHeroHeadlineId(storedHeadline)) setHeadline(storedHeadline)
    } catch {}
    fontRestored.current = true
  }, [])
  useEffect(() => {
    loadHeroFont(font)
    loadBodyFont(bodyFont)
    if (!fontRestored.current) return
    try {
      localStorage.setItem(HERO_FONT_STORAGE_KEY, font)
      localStorage.setItem(HERO_BODY_STORAGE_KEY, bodyFont)
      localStorage.setItem(HERO_HEADLINE_STORAGE_KEY, headline)
    } catch {}
  }, [font, bodyFont, headline])
  const optionsRef = useRef(options)
  const [controls, setControls] = useState(false)
  useEffect(() => { if (controls) { loadAllHeroFonts(); loadAllBodyFonts() } }, [controls])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  useEffect(() => {
    const saved: Partial<PhotoOptions> = {}
    try {
      const stored = localStorage.getItem(CARD_YAW_STORAGE_KEY)
      const cardYaw = Number(stored)
      if (stored !== null && Number.isFinite(cardYaw) && Math.abs(cardYaw) <= CARD_YAW_LIMIT) saved.cardYaw = cardYaw
      const storedPerspective = localStorage.getItem(CARD_PERSPECTIVE_STORAGE_KEY)
      const cardPerspective = Number(storedPerspective)
      if (storedPerspective !== null && Number.isFinite(cardPerspective) && cardPerspective >= 0 && cardPerspective <= CARD_PERSPECTIVE_LIMIT) saved.cardPerspective = cardPerspective
      const light = JSON.parse(localStorage.getItem(CARD_LIGHT_STORAGE_KEY) ?? 'null')
      if (light && Number.isFinite(light.cardLightYaw) && Math.abs(light.cardLightYaw) <= CARD_LIGHT_YAW_LIMIT) saved.cardLightYaw = light.cardLightYaw
      if (light && Number.isFinite(light.cardLightStrength) && light.cardLightStrength >= 0 && light.cardLightStrength <= 2) saved.cardLightStrength = light.cardLightStrength
      const hint = JSON.parse(localStorage.getItem(HINT_STORAGE_KEY) ?? 'null')
      if (hint) {
        if (['shimmer', 'glow', 'both', 'off'].includes(hint.hintStyle)) saved.hintStyle = hint.hintStyle
        if (typeof hint.hintLift === 'boolean') saved.hintLift = hint.hintLift
        if (Number.isFinite(hint.hintStrength) && hint.hintStrength >= 0 && hint.hintStrength <= 1) saved.hintStrength = hint.hintStrength
        if (Number.isFinite(hint.hintInterval) && hint.hintInterval >= 1 && hint.hintInterval <= 12) saved.hintInterval = hint.hintInterval
      }
      const appearance = JSON.parse(localStorage.getItem(CARD_APPEARANCE_STORAGE_KEY) ?? 'null')
      if (appearance) for (const key of Object.keys(DEFAULT_CARD_APPEARANCE) as (keyof CardAppearance)[]) {
        const value = appearance[key], [minimum, maximum] = CARD_APPEARANCE_LIMITS[key]
        if (Number.isFinite(value) && value >= minimum && value <= maximum) saved[key] = value
      }
    } catch { /* Use the approved defaults when browser storage is unavailable. */ }
    setOptions((previous) => ({ ...previous, ...saved }))
    setSettingsLoaded(true)
  }, [])
  useEffect(() => {
    if (!settingsLoaded) return
    try {
      localStorage.setItem(CARD_YAW_STORAGE_KEY, String(options.cardYaw))
      localStorage.setItem(CARD_PERSPECTIVE_STORAGE_KEY, String(options.cardPerspective))
      localStorage.setItem(CARD_LIGHT_STORAGE_KEY, JSON.stringify({ cardLightYaw: options.cardLightYaw, cardLightStrength: options.cardLightStrength }))
      const appearance = Object.fromEntries(Object.keys(DEFAULT_CARD_APPEARANCE).map((key) => [key, options[key as keyof CardAppearance]]))
      localStorage.setItem(CARD_APPEARANCE_STORAGE_KEY, JSON.stringify(appearance))
      localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify({ hintStyle: options.hintStyle, hintStrength: options.hintStrength, hintInterval: options.hintInterval, hintLift: options.hintLift }))
    } catch { /* Optional persistence. */ }
  }, [settingsLoaded, options])
  useEffect(() => {
    if (status !== 'fallback') return
    const root = htmlPanels.current!
    root.inert = false
    root.querySelectorAll<HTMLElement>('[data-live-panel]').forEach((panel) => { panel.inert = false })
  }, [status])
  useEffect(() => { if (controls) controlClose.current?.focus({ preventScroll: true }) }, [controls])
  const hints = useRef<{ update(settings: HintSettings): void; stop(): void } | null>(null)
  useEffect(() => {
    if (status === 'loading') return
    // The cue waits for the scene to hand the panels over (they are inert during the intro).
    const started = startIdleNudge(htmlPanels.current!, canvas.current!, () => !htmlPanels.current!.inert, optionsRef.current)
    hints.current = started
    return () => { started.stop(); hints.current = null }
  }, [status])
  useEffect(() => { hints.current?.update(options) }, [options])
  useEffect(() => {
    optionsRef.current = options
    scene.current?.update(options)
  }, [options])
  useEffect(() => {
    const controller = new AbortController(), element = canvas.current!
    const onLost = (event: Event) => { event.preventDefault(); setStatus('fallback'); scene.current?.dispose(); scene.current = null }
    element.addEventListener('webglcontextlost', onLost)
    createPhotoScene(element, fallback.current!, stage.current!, controller.signal, htmlPanels.current!).then((created) => {
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
    const target = event.target as Element
    if (target.closest('.studio-tools') || (!target.closest('.ah-live-layer') && target.closest('button, a, input, select'))) return
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
  return (
    <section className="studio photo-hero accounts-hero" aria-label="Start with an account" style={heroFontStyle(font, bodyFont)} onPointerMove={move} onPointerLeave={reset}>
      <canvas ref={canvas} className={`photo-canvas ${status === 'ready' ? 'is-ready' : ''}`} aria-hidden="true" />
      <HeroNavigation />
      <HeroIntroduction onExplore={demo} headline={heroHeadline(headline)} />
      <HeadlineSwitcher value={headline} onChange={setHeadline} />
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
          alt="Original bronze three-step sculpture." />
        <p className="photo-status" aria-live="polite">{status === 'fallback' ? 'Still preview · 3D is unavailable in this browser' : ''}</p>
      </div>
      <div ref={htmlPanels} className={`ah-live-layer ${status === 'fallback' ? 'is-fallback' : ''}`} aria-label="Interactive account previews"
        style={{ '--ah-shadow-alpha': percent(Math.min(1, options.cardShadowStrength * 1.44)), '--ah-shadow-blur': options.cardShadowSoftness * 58 } as CSSProperties}>
        {Object.entries(PANELS).map(([name, Panel]) => <section key={name} className="ah-live-panel" data-live-panel={name}
          aria-label={`${name === 'payments' ? 'Card payments' : name === 'business' ? 'Business account' : 'Personal accounts'} demo`}
          onClickCapture={(event) => {
            if (window.innerWidth >= 760 || options.focus === name || status === 'fallback') return
            event.preventDefault(); event.stopPropagation(); reset()
            setOptions((previous) => ({ ...previous, focus: name as PhotoFocus }))
          }}><Panel /></section>)}
      </div>
      <div className="studio-tools photo-tools" onPointerEnter={reset} onKeyDown={(event) => {
        if (event.key === 'Escape' && controls) { event.preventDefault(); closeControls() }
      }}>
        {controls && <aside id="accounts-controls" className="studio-controls accounts-controls" aria-label="Hero configuration">
          <div className="studio-controls-title"><span>HERO CONFIGURATION</span><button ref={controlClose} aria-label="Close view controls" onClick={closeControls}>×</button></div>
          <p>A new perspective.</p>
          <div className="studio-font-block studio-headline-block">
            <div className="studio-font-heading">Headline<span>{heroHeadline(headline).name}</span></div>
            <p className="studio-font-scope">Zviad’s shortlist of eight, also on the rail at the hero’s right edge. Line breaks hold on desktop; phones re-flow them.</p>
            <div className="studio-font-list" role="radiogroup" aria-label="Hero headline">
              {HERO_HEADLINES.map((candidate, index) => (
                <button key={candidate.id} type="button" role="radio" aria-checked={headline === candidate.id} className="studio-font-option studio-headline-option" title={candidate.note} onClick={() => setHeadline(candidate.id)}>
                  <span className="studio-headline-text"><i>{String(index + 1).padStart(2, '0')}</i>{candidate.lines.join(' ')}</span>
                  <span className="studio-font-pair">{candidate.support}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="studio-view-switch" role="group" aria-label="Display mode">
            {([['photo', 'Sculpture'], ['source', 'Artwork'], ['mesh', 'Geometry']] as const).map(([value, label]) => (
              <button key={value} aria-pressed={options.mode === value} onClick={() => mode(value)} disabled={status !== 'ready'}>{label}</button>
            ))}
          </div>
          <label className="photo-select">Framing<select value={options.focus} onChange={(event) => setOptions({ ...options, focus: event.target.value as PhotoFocus })}>
            <option value="full">Full scene</option><option value="personal">Personal close-up</option><option value="business">Business close-up</option><option value="payments">Payments close-up</option>
          </select></label>
          <fieldset className="accounts-card-settings" disabled={status !== 'ready' || options.mode !== 'photo'} aria-label="Card texture">
            <legend>Card texture</legend>
            <Range label="Grain size" value={options.cardGrainSize} min={.25} max={4} step={.05} format={multiplier} onChange={(cardGrainSize) => setOptions((previous) => ({ ...previous, cardGrainSize }))} />
            <small>Fine speckles → larger grain. Try Business close-up to see the detail.</small>
            <Range label="Texture strength" value={options.cardTextureStrength} min={0} max={3} step={.05} onChange={(cardTextureStrength) => setOptions((previous) => ({ ...previous, cardTextureStrength }))} />
            <small>Zero gives a smooth finish.</small>
            <Range label="Surface relief" value={options.cardTextureRelief} min={0} max={5} step={.1} format={multiplier} onChange={(cardTextureRelief) => setOptions((previous) => ({ ...previous, cardTextureRelief }))} />
            <small>How strongly the grain catches the light.</small>
            <Range label="Surface roughness" value={options.cardTextureRoughness} min={.15} max={1} step={.01} onChange={(cardTextureRoughness) => setOptions((previous) => ({ ...previous, cardTextureRoughness }))} />
            <small>Polished → matte. Changes save automatically in this browser.</small>
            <button type="button" className="studio-restore" onClick={() => setOptions({ ...options, ...DEFAULT_CARD_TEXTURE })}>↻ Reset texture</button>
          </fieldset>
          <fieldset className="accounts-card-settings" disabled={status !== 'ready' || options.mode !== 'photo'} aria-label="Card appearance">
            <legend>Card</legend>
            <Range label="Light angle" value={options.cardLightYaw} min={-CARD_LIGHT_YAW_LIMIT} max={CARD_LIGHT_YAW_LIMIT} step={1} format={degrees} onChange={(cardLightYaw) => setOptions((previous) => ({ ...previous, cardLightYaw }))} />
            <Range label="Light strength" value={options.cardLightStrength} min={0} max={2} step={.05} onChange={(cardLightStrength) => setOptions((previous) => ({ ...previous, cardLightStrength }))} />
            <Range label="Reflections" value={options.cardReflection} min={0} max={2} step={.05} onChange={(cardReflection) => setOptions((previous) => ({ ...previous, cardReflection }))} />
            <Range label="Crown brightness" value={options.cardTopLight} min={.3} max={1.6} step={.02} onChange={(cardTopLight) => setOptions((previous) => ({ ...previous, cardTopLight }))} />
            <Range label="Shelf brightness" value={options.cardBottomLight} min={0} max={1.2} step={.02} onChange={(cardBottomLight) => setOptions((previous) => ({ ...previous, cardBottomLight }))} />
            <Range label="Viewing distance" value={options.cardEye} min={2} max={40} step={1} format={units} onChange={(cardEye) => setOptions((previous) => ({ ...previous, cardEye }))} />
            <small>Near is a strong reflection sweep across the face; far flattens it to a single sample, which is how it looked before.</small>
            <Range label="Shadow angle" value={options.cardShadowYaw} min={-85} max={85} step={1} format={degrees} onChange={(cardShadowYaw) => setOptions((previous) => ({ ...previous, cardShadowYaw }))} />
            <Range label="Shadow height" value={options.cardShadowHeight} min={1} max={18} step={.5} format={units} onChange={(cardShadowHeight) => setOptions((previous) => ({ ...previous, cardShadowHeight }))} />
            <Range label="Shadow strength" value={options.cardShadowStrength} min={0} max={1} step={.02} onChange={(cardShadowStrength) => setOptions((previous) => ({ ...previous, cardShadowStrength }))} />
            <Range label="Shadow softness" value={options.cardShadowSoftness} min={0} max={.4} step={.01} onChange={(cardShadowSoftness) => setOptions((previous) => ({ ...previous, cardShadowSoftness }))} />
            <Range label="Card angle" value={options.cardYaw} min={-CARD_YAW_LIMIT} max={CARD_YAW_LIMIT} step={.5} format={degrees} onChange={(cardYaw) => setOptions((previous) => ({ ...previous, cardYaw }))} />
            <Range label="Perspective" value={options.cardPerspective} min={0} max={CARD_PERSPECTIVE_LIMIT} step={.005} onChange={(cardPerspective) => setOptions((previous) => ({ ...previous, cardPerspective }))} />
            <button type="button" className="studio-restore" onClick={() => setOptions((previous) => ({ ...previous, ...DEFAULT_CARD_APPEARANCE, cardYaw: DEFAULT_OPTIONS.cardYaw, cardPerspective: DEFAULT_OPTIONS.cardPerspective, cardLightYaw: DEFAULT_OPTIONS.cardLightYaw, cardLightStrength: DEFAULT_OPTIONS.cardLightStrength }))}>↻ Reset card only</button>
          </fieldset>
          <fieldset className="accounts-card-settings accounts-hint-settings" disabled={status !== 'ready'} aria-label="Interactivity hints">
            <legend>Hints</legend>
            <small>While nobody has touched the panels, light plays over one control at a time. Reflection sweeps a highlight across it and lifts its rim on the same clock; the other two are those halves on their own. It stops for good on the first hover.</small>
            <div className="studio-view-switch" role="group" aria-label="Hint style">
              {([['both', 'Reflection'], ['shimmer', 'Sweep'], ['glow', 'Glow'], ['off', 'Off']] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={options.hintStyle === value} onClick={() => setOptions((previous) => ({ ...previous, hintStyle: value as HintStyle }))}>{label}</button>
              ))}
            </div>
            <label className="studio-check"><span>Also lift the control</span><input type="checkbox" checked={options.hintLift} disabled={options.hintStyle === 'off'} onChange={(event) => setOptions((previous) => ({ ...previous, hintLift: event.target.checked }))} /></label>
            <Range label="Hint strength" value={options.hintStrength} min={0} max={1} step={.05} onChange={(hintStrength) => setOptions((previous) => ({ ...previous, hintStrength }))} />
            <Range label="Hint spacing" value={options.hintInterval} min={1} max={12} step={.2} format={(value) => `${value.toFixed(1)}s`} onChange={(hintInterval) => setOptions((previous) => ({ ...previous, hintInterval }))} />
            <button type="button" className="studio-restore" onClick={() => setOptions((previous) => ({ ...previous, ...DEFAULT_HINTS }))}>↻ Reset hints only</button>
          </fieldset>
          <div className="studio-font-block">
            <div className="studio-font-heading">Headline typeface<span>{heroFont(font).name}</span></div>
            <div className="studio-font-list" role="radiogroup" aria-label="Hero typeface">
              {HERO_FONTS.map((candidate) => (
                <button key={candidate.id} type="button" role="radio" aria-checked={font === candidate.id} className="studio-font-option" onClick={() => setFont(candidate.id)}>
                  <span className="studio-font-name" style={heroFontPreviewStyle(candidate)}>{candidate.name}</span>
                  <span className="studio-font-pair">{candidate.pair}</span>
                  {candidate.id === DEFAULT_HERO_FONT && <span className="studio-font-star" aria-label="Default typeface">Default</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="studio-font-block">
            <div className="studio-font-heading">Body<span>{heroBodyFont(bodyFont).name}</span></div>
            <p className="studio-font-scope">Navigation, the second line and both buttons.</p>
            <div className="studio-font-list" role="radiogroup" aria-label="Hero body typeface">
              {HERO_BODY_FONTS.map((candidate) => (
                <button key={candidate.id} type="button" role="radio" aria-checked={bodyFont === candidate.id} className="studio-font-option" onClick={() => setBodyFont(candidate.id)}>
                  <span className="studio-font-name" style={heroBodyPreviewStyle(candidate, font)}>{candidate.name}</span>
                  <span className="studio-font-pair">{candidate.role}</span>
                  {candidate.id === DEFAULT_HERO_BODY && <span className="studio-font-star" aria-label="Default typeface">Default</span>}
                </button>
              ))}
            </div>
          </div>
          <label className="studio-check"><span>Follow pointer</span><input type="checkbox" checked={options.motion} onChange={(event) => setOptions({ ...options, motion: event.target.checked })} /></label>
          <label className="studio-range">Rotation range <output>±{options.range}°</output><input aria-label="Rotation range" type="range" min="2" max="9" step="1" value={options.range} onChange={(event) => setOptions({ ...options, range: Number(event.target.value) })} /></label>
          <label className="studio-range">Moving reflections <output>{Math.round(options.response * 100)}%</output><input aria-label="Moving reflections" type="range" min="0" max="1" step="0.1" value={options.response} onChange={(event) => setOptions({ ...options, response: Number(event.target.value) })} /></label>
          <fieldset className="photo-light-settings" disabled={options.lighting === 'unlit' || options.mode !== 'photo'} aria-label="Lighting adjustments">
          <label className="studio-range">Backdrop intensity <output>{Math.round(options.backgroundLight * 100)}%</output><input aria-label="Light intensity" type="range" min="0" max="2" step="0.05" value={options.backgroundLight} onChange={(event) => setOptions({ ...options, backgroundLight: Number(event.target.value) })} /></label>
          <label className="studio-range">Light spread <output>{Math.round(options.lightSpread * 100)}%</output><input aria-label="Light spread" type="range" min="0.7" max="1.5" step="0.05" value={options.lightSpread} onChange={(event) => setOptions({ ...options, lightSpread: Number(event.target.value) })} /></label>
          <label className="studio-range">Floor reflection <output>{Math.round(options.floorReflection * 100)}%</output><input aria-label="Floor reflection" type="range" min="0" max="0.85" step="0.05" value={options.floorReflection} onChange={(event) => setOptions({ ...options, floorReflection: Number(event.target.value) })} /></label>
          <label className="studio-range">Overhead rays <output>{Math.round(options.overheadLight * 100)}%</output><input aria-label="Overhead rays" type="range" min="0" max="1" step="0.05" value={options.overheadLight} disabled={options.lighting !== 'illuminated'} onChange={(event) => setOptions({ ...options, overheadLight: Number(event.target.value) })} /></label>
          </fieldset>
          <div className="studio-control-actions"><button onClick={reset}>Reset view</button><button onClick={demo}>Play movement ↗</button></div>
          <button className="studio-replay" onClick={replayIntro}>↻ Replay intro</button>
          <button className="studio-restore" onClick={() => { reset(); setOptions(DEFAULT_OPTIONS); setFont(DEFAULT_HERO_FONT); setBodyFont(DEFAULT_HERO_BODY); setHeadline(DEFAULT_HERO_HEADLINE) }}>Restore defaults</button>
          <a className="studio-old-link" href="/hero-accounts">Open previous hero ↗</a>
        </aside>}
        <button ref={controlTrigger} className="studio-tools-trigger" aria-label="Open view controls" aria-expanded={controls} aria-controls="accounts-controls" onClick={() => controls ? closeControls() : setControls(true)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 4h12M2 12h12M6 1v6M10 9v6" /></svg> Studio controls
        </button>
      </div>
    </section>
  )
}
