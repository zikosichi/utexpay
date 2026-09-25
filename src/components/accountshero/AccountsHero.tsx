import { lazy, Suspense, useEffect, useState } from 'react'
import { HeroIntroduction, HeroNavigation } from '../herostudio/HeroContent'
import { DEFAULT_HERO_FONT, heroFontStyle } from '../herostudio/heroFonts'
import { HeroPoster } from './HeroPoster'
import { INTERACTIVE_HERO_MEDIA } from './poster'
import '../herostudio/studio.css'
import './accounts-hero.css'

// Keep the renderer, textures, panel demos and studio controls out of the mobile load.
const LiveAccountsHero = lazy(() => import('./LiveAccountsHero').then((module) => ({ default: module.LiveAccountsHero })))

function StaticAccountsHero() {
  return <section className="studio photo-hero accounts-hero accounts-hero--static" aria-label="Start with an account" style={heroFontStyle(DEFAULT_HERO_FONT)}>
    <HeroNavigation />
    <HeroIntroduction responsiveExploreHref="/#banking" />
    <div className="studio-stage photo-stage"><HeroPoster /></div>
  </section>
}

export function AccountsHero() {
  // CSS and <picture> select the mobile poster before JS; desktop keeps an empty 3D stage.
  const [interactive, setInteractive] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(INTERACTIVE_HERO_MEDIA)
    const update = () => setInteractive(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (interactive) return
    const explore = () => {
      if (window.location.hash !== '#demo' || window.matchMedia(INTERACTIVE_HERO_MEDIA).matches) return
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}#banking`)
      document.getElementById('banking')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    }
    explore()
    window.addEventListener('hashchange', explore)
    return () => window.removeEventListener('hashchange', explore)
  }, [interactive])
  return interactive
    ? <Suspense fallback={<StaticAccountsHero />}><LiveAccountsHero /></Suspense>
    : <StaticAccountsHero />
}
