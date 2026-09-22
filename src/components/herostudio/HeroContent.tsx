import { Fragment, useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent } from 'react'
import { Button, ButtonLink } from '../Button'
import { DEFAULT_HERO_HEADLINE, HERO_HEADLINES, heroHeadline } from './heroHeadlines'
import type { HeroHeadline, HeroHeadlineId } from './heroHeadlines'
import './hero-navigation.css'

const NAV_LINKS = [
  { label: 'Banking', href: '/#banking' },
  { label: 'Payments', href: '/#payments' },
  { label: 'Developers', href: '/#developers' },
  { label: 'Pricing', href: '/#pricing' },
]

const NAV_HEIGHT = 88

/** True once the page has moved off the very top — the bar picks up its frosted surface. */
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let frame = 0
    const read = () => { frame = 0; setScrolled(window.scrollY > threshold) }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [threshold])
  return scrolled
}

/** True while the hero's own call to action sits above the bar, i.e. is no longer on screen.
    Falls back to the scrolled state on pages without a hero action row. */
function useHeroActionHidden(scrolled: boolean) {
  const [hidden, setHidden] = useState(false)
  const [tracked, setTracked] = useState(false)
  useEffect(() => {
    const target = document.querySelector('[data-hero-actions]')
    if (!target) { setTracked(false); return }
    setTracked(true)
    const observer = new IntersectionObserver(([entry]) => {
      setHidden(!entry.isIntersecting && entry.boundingClientRect.top < NAV_HEIGHT)
    }, { rootMargin: `-${NAV_HEIGHT}px 0px 0px 0px` })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])
  return tracked ? hidden : scrolled
}

/** Section links with one shared highlight that slides between items instead of a per-link underline. */
function NavLinks() {
  const [spot, setSpot] = useState({ x: 0, width: 0, on: false })
  const place = (element: HTMLElement) => setSpot({ x: element.offsetLeft, width: element.offsetWidth, on: true })
  const leave = () => setSpot((previous) => ({ ...previous, on: false }))
  const blur = (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) leave() }
  const enter = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => place(event.currentTarget)
  return <div className="studio-nav-links" onPointerLeave={leave} onBlur={blur}>
    <span className="studio-nav-spot" aria-hidden="true" data-on={spot.on} style={{ transform: `translateX(${spot.x}px)`, width: spot.width }} />
    {NAV_LINKS.map(({ label, href }) => <a className="studio-nav-link" key={label} href={href} onPointerEnter={enter} onFocus={enter}>{label}</a>)}
  </div>
}

export function HeroNavigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const nav = useRef<HTMLElement>(null), menu = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null)
  const scrolled = useScrolled()
  const showAction = useHeroActionHidden(scrolled)
  useEffect(() => {
    if (!menuOpen) return
    menu.current?.querySelector('a')?.focus({ preventScroll: true })
    const outside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !nav.current?.contains(event.target)) setMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggle.current?.focus({ preventScroll: true })
    }
    const desktop = window.matchMedia('(min-width: 901px)')
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [menuOpen])
  return <nav ref={nav} className="studio-nav" aria-label="Main navigation" data-raised={showAction || menuOpen} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
  }}>
    <a className="studio-brand" href="/" aria-label="UTEX Pay home">
      <img src="/brand/utex-pay-white.svg" width="886" height="174" alt="UTEX Pay" />
    </a>
    <div className="studio-nav-right">
      <NavLinks />
      <span className="studio-nav-divider" aria-hidden="true" />
      <div className="studio-nav-account">
        <ButtonLink className="studio-nav-login" variant="secondary" size="md" href="/#login">Log in</ButtonLink>
        <div className="studio-nav-action" data-show={showAction} aria-hidden={!showAction}>
          <div><ButtonLink size="md" href="/#signup" tabIndex={showAction ? undefined : -1}>Open an account</ButtonLink></div>
        </div>
        <button ref={toggle} className="studio-nav-toggle" type="button" aria-expanded={menuOpen} aria-controls={menuId} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          <span aria-hidden="true"><i /><i /></span>
        </button>
      </div>
    </div>
    <div ref={menu} id={menuId} className="studio-mobile-menu" hidden={!menuOpen}>
      {NAV_LINKS.map(({ label, href }) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<span aria-hidden="true">↗</span></a>)}
      <ButtonLink variant="secondary" href="/#login" onClick={() => setMenuOpen(false)}>Log in</ButtonLink>
    </div>
  </nav>
}

export function HeroIntroduction({ onExplore, headline = heroHeadline(DEFAULT_HERO_HEADLINE) }: { onExplore: () => void; headline?: HeroHeadline }) {
  return <div className="studio-copy">
    {/* Lines break where they were written on desktop; below 760px the break hides and the headline balances itself. */}
    <h1>{headline.lines.map((line, index) => <Fragment key={line}>{index > 0 && <br className="studio-desktop-break" />}{index > 0 && ' '}{line}</Fragment>)}</h1>
    <p className="studio-description">{headline.support}</p>
    <div className="studio-actions" data-hero-actions><ButtonLink href="/#signup">Open an account</ButtonLink><Button variant="secondary" onClick={onExplore}>See how it works</Button></div>
  </div>
}

/** Review-time switcher: the same numbered rail the sections below use on their right edge
    (see personal-banking__versions). One button per candidate, the line's name on hover. */
export function HeadlineSwitcher({ value, onChange }: { value: HeroHeadlineId; onChange: (id: HeroHeadlineId) => void }) {
  return <div className="studio-headline-bar">
    <div className="studio-headline-versions" role="group" aria-label="Hero headline candidates">
      {HERO_HEADLINES.map((candidate, index) => (
        <button key={candidate.id} type="button" aria-label={candidate.name} aria-pressed={value === candidate.id} onClick={() => onChange(candidate.id)}>
          <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="studio-headline-version-name" aria-hidden="true">{candidate.name}</span>
        </button>
      ))}
    </div>
  </div>
}
