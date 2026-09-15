import { useEffect, useId, useRef, useState } from 'react'
import type { GlobeScene } from './scene'
import { GlobeControls } from './GlobeControls'
import { SectionHeading } from '#/components/SectionHeading'
import { appearanceStorageKey, previousAppearanceStorageKey, legacyAppearanceStorageKey, defaultAppearance, normalizeAppearance, type GlobeAppearance } from './appearance'
import './globe-horizon.css'

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

  useEffect(() => {
    try {
      const current = localStorage.getItem(appearanceStorageKey)
      const previous = localStorage.getItem(previousAppearanceStorageKey) ?? localStorage.getItem('utexpay.globe.appearance.v2')
      const saved = current !== null
        ? normalizeAppearance(JSON.parse(current))
        : previous !== null
          ? { ...normalizeAppearance(JSON.parse(previous)), radius: defaultAppearance.radius }
          : { ...normalizeAppearance(JSON.parse(localStorage.getItem(legacyAppearanceStorageKey) ?? 'null')), size: defaultAppearance.size, radius: defaultAppearance.radius }
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
    <SectionHeading className="gh-heading" id={titleId} eyebrow="International payments" description="Send money abroad from your personal or business account.">
      A little closer.<br />Even across borders.
    </SectionHeading>
    {status === 'ready' && <GlobeControls value={appearance} onChange={changeAppearance} />}
  </section>
}
