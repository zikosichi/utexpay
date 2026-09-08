import { useEffect, useId, useRef, useState } from 'react'
import { Button, ButtonLink } from '../Button'
import './hero-navigation.css'

const NAV_LINKS = [
  { label: 'Banking', href: '/#banking' },
  { label: 'Payments', href: '/#payments' },
  { label: 'Developers', href: '/#developers' },
  { label: 'Pricing', href: '/#pricing' },
]

export function HeroNavigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const nav = useRef<HTMLElement>(null), menu = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    menu.current?.querySelector('a')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
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
  return <nav ref={nav} className="studio-nav" aria-label="Main navigation" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
  }}>
    <a className="studio-brand" href="/" aria-label="UTEX Pay home">
      <img src="/brand/utex-pay-white.svg" width="886" height="174" alt="UTEX Pay" />
    </a>
    <div className="studio-nav-links">
      {NAV_LINKS.map(({ label, href }) => <a className="studio-nav-link" key={label} href={href}>{label}</a>)}
    </div>
    <div className="studio-nav-account">
      <ButtonLink className="studio-nav-login" variant="ghost" size="md" href="/#login">Log in</ButtonLink>
      <ButtonLink size="md" href="/#signup">Sign up</ButtonLink>
      <button ref={toggle} className="studio-nav-toggle" type="button" aria-expanded={menuOpen} aria-controls={menuId} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
        <span aria-hidden="true"><i /><i /></span>
      </button>
    </div>
    <div ref={menu} id={menuId} className="studio-mobile-menu" hidden={!menuOpen}>
      {NAV_LINKS.map(({ label, href }) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<span aria-hidden="true">↗</span></a>)}
      <ButtonLink variant="secondary" href="/#login" onClick={() => setMenuOpen(false)}>Log in</ButtonLink>
    </div>
  </nav>
}

export function HeroIntroduction({ onExplore }: { onExplore: () => void }) {
  return <div className="studio-copy">
    <h1>Start with an account.<br />Grow into everything.</h1>
    <p className="studio-description">Add business banking and card payments when you’re ready.<br className="studio-desktop-break" /> Your money stays in the same place.</p>
    <div className="studio-actions"><ButtonLink href="/#signup">Open an account</ButtonLink><Button variant="secondary" onClick={onExplore}>See how it works</Button></div>
  </div>
}
