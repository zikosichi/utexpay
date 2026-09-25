import { useEffect, useId, useRef, useState } from 'react'
import type { GlobeScene } from './scene'
import { GlobeControls } from './GlobeControls'
import { SectionHeading } from '#/components/SectionHeading'
import { isStudio, useStudio } from '#/components/studio'
import { appearanceStorageKey, defaultAppearance, normalizeAppearance, type GlobeAppearance } from './appearance'
import './globe-horizon.css'

// Capability numbers, not usage numbers (pre-launch). 150+ and 30+ were confirmed in the Aug 25 sync;
// top-up methods and the licence wording are still to confirm with Sandro (Landing/03-messaging-pillars).
const stats = [
  ['150+', 'countries you can get paid from'],
  ['30+', 'currencies held in one balance'],
  ['3', 'ways to top up: cards, iDEAL and SEPA'],
  ['Licensed', 'EMI, with customer funds safeguarded'],
] as const
const countDuration = 1400, countStagger = 260

/** The numbers count up one after another the first time the row scrolls into view. */
function StatsRow() {
  const row = useRef<HTMLDListElement>(null)
  // 0 until the row is seen, then the eased 0–1 progress of each stat's own count.
  const [progress, setProgress] = useState<number[] | null>(null)
  useEffect(() => {
    const element = row.current!
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const started = performance.now()
      const tick = (now: number) => {
        const next = stats.map((_, index) => {
          const t = Math.min(1, Math.max(0, (now - started - index * countStagger) / countDuration))
          return 1 - Math.pow(1 - t, 3)
        })
        setProgress(next)
        if (next[next.length - 1] < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: .4 })
    // Hold at zero while the row is still below the fold; server markup carries the final values.
    if (element.getBoundingClientRect().top > innerHeight) setProgress(stats.map(() => 0))
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(raf) }
  }, [])
  return <dl ref={row} className="gh-stats" aria-label="What the account covers">
    {stats.map(([value, label], index) => {
      const numeric = /^(\d+)(.*)$/.exec(value)
      const t = progress?.[index] ?? 1
      const shown = numeric ? `${Math.round(Number(numeric[1]) * t)}${numeric[2]}` : value
      return <div className={`gh-stat${t > 0 ? ' is-in' : ''}`} key={label}>
        <dt>{label}</dt>
        <dd aria-label={value} data-text={numeric ? undefined : ''}>{shown}</dd>
      </div>
    })}
  </dl>
}

/** A self-contained international payments chapter with an interactive globe. */
export function GlobeHorizonSection() {
  const titleId = useId()
  const helpId = useId()
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<GlobeScene | null>(null)
  const appearanceRef = useRef(defaultAppearance)
  const [appearance, setAppearance] = useState(defaultAppearance)
  const [status, setStatus] = useState<'still' | 'ready'>('still')
  const studio = useStudio()

  useEffect(() => {
    // Saved tuning only applies in review mode; `/` always shows the defaults.
    if (isStudio()) try {
      const saved = normalizeAppearance(JSON.parse(localStorage.getItem(appearanceStorageKey) ?? 'null'))
      appearanceRef.current = saved
      setAppearance(saved)
      localStorage.setItem(appearanceStorageKey, JSON.stringify(saved))
    } catch { /* Browser storage is optional. */ }
    const element = section.current!
    const target = canvas.current!
    const abort = new AbortController()
    let started = false
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return
      started = true
      void import('./scene').then(({ createGlobeScene }) =>
        createGlobeScene(target, stage.current!, abort.signal),
      ).then((created) => {
        if (abort.signal.aborted) { created.dispose(); return }
        scene.current = created
        created.setAppearance(appearanceRef.current)
        setStatus('ready')
      }).catch((error: unknown) => {
        // The section's semantic content does not depend on WebGL.
        if (!abort.signal.aborted) {
          if (import.meta.env.DEV) console.warn('Interactive globe unavailable:', error)
          setStatus('still')
        }
      })
    }, { rootMargin: '160px' })
    observer.observe(element)
    return () => {
      abort.abort()
      observer.disconnect()
      scene.current?.dispose()
      scene.current = null
    }
  }, [])

  function changeAppearance(value: GlobeAppearance) {
    const next = normalizeAppearance(value)
    appearanceRef.current = next
    setAppearance(next)
    scene.current?.setAppearance(next)
    try { localStorage.setItem(appearanceStorageKey, JSON.stringify(next)) } catch { /* Keep live controls usable without storage. */ }
  }

  return <section ref={section} id="international-payments" className="globe-horizon" aria-labelledby={titleId} data-scene={status}>
    <div ref={stage} className="gh-art">
      <canvas ref={canvas} className="gh-canvas" tabIndex={status === 'ready' ? 0 : -1}
        role="img" aria-label="Interactive dotted globe" aria-describedby={helpId} />
    </div>
    <p id={helpId} className="gh-sr-only">Drag to rotate the globe. Use the arrow keys to rotate, or Home to reset the view.</p>
    <SectionHeading className="gh-heading" id={titleId} description="For family abroad, the team you're building, the supplier who keeps you going. Sent from the same account you use every day.">
      Across borders.<br />From one account.
    </SectionHeading>
    <StatsRow />
    {studio && status === 'ready' && <GlobeControls value={appearance} onChange={changeAppearance} />}
  </section>
}
