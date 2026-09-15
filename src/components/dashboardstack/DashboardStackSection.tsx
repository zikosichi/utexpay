import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SectionHeading } from '#/components/SectionHeading'
import './dashboard-stack.css'

const ASSETS = '/dashboardstack/'

const VIEWS = [
  {
    id: 'bank', label: 'Bank',
    description: 'Hold, spend, and run the business from a real business account — personal beside it if you want.',
    image: 'bank-window.png', width: 1840, height: 1586,
    alt: 'UTEX Pay banking dashboard with a €23,787.55 balance, currency accounts, cash flow and a gold Mastercard.',
  },
  {
    id: 'move', label: 'Move',
    description: 'Send and receive across borders, hold the currencies you work in, pay your team anywhere.',
    image: 'move-window.png', width: 1863, height: 1620,
    alt: 'UTEX Pay accounts screen with euro and pound balances, Send, Request, Deposit and Convert actions, euro account details and recent transactions.',
  },
  {
    id: 'paid', label: 'Get paid',
    description: 'Switch on card payments. What your customers pay lands straight in your account.',
    image: 'paid-window.png', width: 1865, height: 1666,
    alt: 'UTEX Pay processing dashboard with an estimated available balance of €32,310.00, payment volume, acceptance rate, a world map and decline reasons.',
  },
] as const

type View = (typeof VIEWS)[number]['id']

/** Supplied dashboard images sit inside HTML glass windows; the section tabs are interactive. */
export function DashboardStackSection({ embedded = false }: { embedded?: boolean }) {
  const id = useId()
  const [active, setActive] = useState<View>('bank')
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const section = useRef<HTMLElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = VIEWS.findIndex((view) => view.id === active)
  const running = !paused && inView && pageVisible && !reducedMotion

  useEffect(() => {
    const element = section.current
    if (!element) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateVisibility = () => setPageVisible(!document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= .2)
    }, { threshold: .2 })
    updateMotion()
    updateVisibility()
    observer.observe(element)
    motion.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  function selectView(view: View) {
    setActive(view)
    setCycle((value) => value + 1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % VIEWS.length
    else if (event.key === 'ArrowLeft') next = (index + VIEWS.length - 1) % VIEWS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = VIEWS.length - 1
    else return
    event.preventDefault()
    selectView(VIEWS[next].id)
    tabs.current[next]?.focus({ preventScroll: true })
  }

  return <section ref={section} className="dashboard-stack" id="dashboard-stack" aria-labelledby={`${id}-title`} aria-roledescription="carousel"
    data-view={active} data-autoplay={running ? 'running' : 'paused'} data-reduced-motion={reducedMotion}
    onFocusCapture={(event) => {
      if (event.target.matches(':focus-visible')) setPaused(true)
    }}>
    {!embedded && <><span className="ds-anchor" id="banking" aria-hidden="true" />
      <span className="ds-anchor" id="why-utex" aria-hidden="true" /></>}
    <SectionHeading className="ds-intro" id={`${id}-title`} eyebrow="Banking & payments" description="Bank, spend, send and get paid. All from the same account.">
      One account.<br />More possibilities.
    </SectionHeading>
    <div className="ds-feature-navigation">
      {!reducedMotion && <button className="ds-playback" type="button" aria-label={paused ? 'Resume automatic slides' : 'Pause automatic slides'}
        title={paused ? 'Resume slideshow' : 'Pause slideshow'} onClick={() => setPaused((value) => !value)}>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
          {paused ? <path d="M5 3v10l8-5Z" /> : <path d="M4 3h2.5v10H4Zm5.5 0H12v10H9.5Z" />}
        </svg>
      </button>}
      <div className="ds-tabs" role="tablist" aria-label="Explore your UTEX account">
        {VIEWS.map((view, index) => <button ref={(element) => { tabs.current[index] = element }} key={view.id} id={`${id}-tab-${view.id}`} type="button" role="tab" aria-selected={active === view.id} aria-controls={`${id}-panel-${view.id}`} aria-describedby={`${id}-description-${view.id}`} tabIndex={active === view.id ? 0 : -1} onClick={() => selectView(view.id)} onKeyDown={(event) => onKeyDown(event, index)}>
          <span className="ds-tab-track" aria-hidden="true"><span key={active === view.id ? cycle : -1}
            onAnimationEnd={(event) => {
              if (event.animationName === 'ds-tab-progress' && active === view.id) setActive(VIEWS[(index + 1) % VIEWS.length].id)
            }} /></span>
          <span className="ds-tab-label"><img src={`${ASSETS}${active === view.id ? 'dot-active' : 'dot'}.svg`} width="8" height="8" alt="" />{view.label}</span>
          <span className="ds-tab-description" id={`${id}-description-${view.id}`}>{view.description}</span>
        </button>)}
      </div>
    </div>
    <p className="ds-mobile-description" aria-live={running ? 'off' : 'polite'}>{VIEWS[activeIndex].description}</p>
    <div className="ds-stage">
      <img className="ds-ambient" src={`${ASSETS}ambient-soft.png`} width="1936" height="1181" alt="" loading="lazy" draggable="false" />
      <div className="ds-stack">
        {VIEWS.map((view, index) => {
          const depth = (index - activeIndex + VIEWS.length) % VIEWS.length
          return <div className={`ds-frame ds-frame--${view.id}`} key={view.id} data-depth={depth} role="tabpanel" id={`${id}-panel-${view.id}`} aria-labelledby={`${id}-tab-${view.id}`} aria-hidden={depth !== 0} inert={depth !== 0} tabIndex={depth === 0 ? 0 : -1}>
            <div className="ds-frame-content">
              <img className={`ds-dashboard-image ds-${view.id}-image`}
                src={`${ASSETS}${view.image}`} width={view.width} height={view.height} alt={view.alt}
                loading="lazy" decoding="async" draggable="false" />
            </div>
          </div>
        })}
      </div>
    </div>
  </section>
}
