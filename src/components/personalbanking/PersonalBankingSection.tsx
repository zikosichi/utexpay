import { useEffect, useId, useRef, useState } from 'react'
import { DashboardSceneImage, DashboardVisual } from './DashboardVisual'
import { DashboardStackSection } from '#/components/dashboardstack/DashboardStackSection'
import { FeatureGridSection } from '#/components/featuregrid/FeatureGridSection'
import './personal-banking.css'

const SCENE = '/personalbanking/phone-scene-1254.webp'
const SCENE_SET = '/personalbanking/phone-scene-640.webp 640w, /personalbanking/phone-scene-960.webp 960w, /personalbanking/phone-scene-1254.webp 1254w'

function Icon({ name }: { name: 'currencies' | 'card' | 'transfer' | 'coffee' | 'arrow' | 'close' }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'currencies' && <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>}
    {name === 'card' && <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M2 9h20M6 15h4" /></>}
    {name === 'transfer' && <path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" />}
    {name === 'coffee' && <><path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4ZM17 9h2a3 3 0 0 1 0 6h-2M9 2v3M13 3v2" /></>}
    {name === 'arrow' && <path d="M5 19 19 5M6 5h13v13" />}
    {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
  </svg>
}

/** Motion follows the pointer across the visible section. Touch and reduced-motion stay still. */
function useSceneDepth(enabled: boolean) {
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = section.current
    if (!enabled || !element) return
    const motion = window.matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)')
    let visible = false
    let frame = 0
    let x = 0
    let y = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      frame = 0
      element.style.setProperty('--scene-x', '0')
      element.style.setProperty('--scene-y', '0')
    }
    const update = () => {
      if (!motion.matches || !visible || document.hidden) reset()
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    }, { threshold: 0.15 })
    const move = (event: PointerEvent) => {
      if (!motion.matches || !visible || document.hidden || event.pointerType === 'touch') return
      const rect = element.getBoundingClientRect()
      x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1))
      y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1))
      if (!frame) frame = requestAnimationFrame(() => {
        element.style.setProperty('--scene-x', String(x))
        element.style.setProperty('--scene-y', String(y))
        frame = 0
      })
    }
    observer.observe(element)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerleave', reset)
    motion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      reset()
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', reset)
      motion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [enabled])

  return section
}

/** Paper Page 2 personal section. Device/UI and amounts are illustrative. */
type BankingVersion = 'phone' | 'dashboard' | 'concept' | 'stack' | 'features'

export function PersonalBankingSection({ initialVersion = 'features' }: { initialVersion?: BankingVersion }) {
  const id = useId()
  const [version, setVersion] = useState<BankingVersion>(initialVersion)
  const section = useSceneDepth(version !== 'stack' && version !== 'features')
  const dialog = useRef<HTMLDialogElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('personal')
    if (requested === 'phone' || requested === 'dashboard' || requested === 'concept' || requested === 'stack' || requested === 'features') setVersion(requested)
  }, [])

  useEffect(() => {
    if (!previewOpen || !dialog.current) return
    const element = dialog.current
    const previouslyFocused = document.activeElement
    const previousOverflow = document.documentElement.style.overflow
    element.showModal()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      element.close()
      document.documentElement.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [previewOpen])

  const overview = version === 'stack' || version === 'features'
  return <section ref={section} className="personal-banking" id="banking" data-version={version} aria-labelledby={overview ? undefined : `${id}-heading`} aria-label={overview ? 'Banking and payments overview' : undefined}>
    <span id="why-utex" className="personal-banking__legacy-anchor" aria-hidden="true" />
    <div className="personal-banking__version-bar">
      <div className="personal-banking__versions" role="group" aria-label="Personal banking visual direction">
        <button type="button" aria-label="Phone" aria-pressed={version === 'phone'} aria-controls={`${id}-content`} onClick={() => setVersion('phone')}><span aria-hidden="true">01</span><span className="personal-banking__version-name" aria-hidden="true">Phone</span></button>
        <button type="button" aria-label="Dashboard" aria-pressed={version === 'dashboard'} aria-controls={`${id}-content`} onClick={() => setVersion('dashboard')}><span aria-hidden="true">02</span><span className="personal-banking__version-name" aria-hidden="true">Dashboard</span></button>
        <button type="button" aria-label="Concept" aria-pressed={version === 'concept'} aria-controls={`${id}-content`} onClick={() => setVersion('concept')}><span aria-hidden="true">03</span><span className="personal-banking__version-name" aria-hidden="true">Concept</span></button>
        <button type="button" aria-label="Dashboard stack" aria-pressed={version === 'stack'} aria-controls={`${id}-content`} onClick={() => setVersion('stack')}><span aria-hidden="true">04</span><span className="personal-banking__version-name" aria-hidden="true">Dashboard stack</span></button>
        <button type="button" aria-label="Feature grid — Version 5" aria-pressed={version === 'features'} aria-controls={`${id}-content`} onClick={() => setVersion('features')}><span aria-hidden="true">05</span><span className="personal-banking__version-name" aria-hidden="true">Feature grid</span></button>
      </div>
    </div>
    <div id={`${id}-content`}>
    {version === 'features' ? <FeatureGridSection /> : version === 'stack' ? <div className="personal-banking__stack"><DashboardStackSection embedded /></div> : <>
    <div className="personal-banking__inner">
      <div className="personal-banking__copy">
        <p className="personal-banking__eyebrow">Personal banking</p>
        <h2 id={`${id}-heading`}>Your everyday money.<br /><span>Beautifully in hand.</span></h2>
        <p className="personal-banking__description">Keep your balances, cards and daily spending together.</p>

        <ul className="personal-banking__features" aria-label="Personal banking features">
          <li><Icon name="currencies" /><span>Currency<br />accounts</span></li>
          <li><Icon name="card" /><span>Physical &amp;<br />virtual cards</span></li>
          <li><Icon name="transfer" /><span>Everyday<br />transfers</span></li>
        </ul>

        <button type="button" className="personal-banking__explore" onClick={() => setPreviewOpen(true)} aria-haspopup="dialog">
          Take a closer look <Icon name="arrow" />
        </button>
      </div>

      <div className="personal-banking__visual" id={`${id}-visual`}>
        {version === 'phone' ? <div className="personal-banking__scene">
          <img className="personal-banking__phone" src={SCENE} srcSet={SCENE_SET}
            sizes="(max-width: 599px) 120vw, (max-width: 1049px) 820px, (max-width: 1799px) 60vw, 950px"
            width="1254" height="1254" loading="lazy" decoding="async" draggable="false"
            alt="Illustrative UTEX Pay personal account on a phone, with a euro balance, a gold card and recent transactions." />
        </div> : <DashboardVisual variant={version} />}
        {version === 'phone' && <div className="personal-banking__notification" aria-label="Example card payment: Coffee, 4 euros and 50 cents, just now.">
          <span className="personal-banking__notification-icon"><Icon name="coffee" /></span>
          <div className="personal-banking__notification-copy">
            <div className="personal-banking__notification-meta"><span>Card payment</span><span>Just now</span></div>
            <p>Coffee <span>−€4.50</span></p>
          </div>
        </div>}
      </div>
    </div>

    <dialog ref={dialog} className="personal-banking__preview" data-version={version} aria-labelledby={`${id}-preview-title`}
      onCancel={() => setPreviewOpen(false)} onClose={() => setPreviewOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false) }}>
      <div className="personal-banking__preview-content">
        <button className="personal-banking__preview-close" type="button" aria-label="Close personal banking preview" onClick={() => setPreviewOpen(false)}><Icon name="close" /></button>
        <div className="personal-banking__preview-intro">
          <p className="personal-banking__eyebrow">Personal banking</p>
          <h2 id={`${id}-preview-title`}>Your day. All in hand.</h2>
          <p>A closer look at your balances, card and everyday activity, together in one place.</p>
        </div>
        {previewOpen && (version === 'phone'
          ? <img src={SCENE} width="1254" height="1254" alt="Personal banking concept showing balances in EUR, USD and GBP, a digital card and recent activity." />
          : <DashboardSceneImage preview variant={version} />)}
      </div>
    </dialog>
    </>}
    </div>
  </section>
}
