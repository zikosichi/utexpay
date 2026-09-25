import { HERO_POSTER, HERO_POSTER_SRC_SET, INTERACTIVE_HERO_MEDIA } from './poster'

// Let the browser choose before hydration, without fetching the mobile artwork on desktop.
const EMPTY_DESKTOP_SOURCE = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221%22%20height%3D%221%22%2F%3E'

export function HeroPoster() {
  return <picture>
    <source media={INTERACTIVE_HERO_MEDIA} srcSet={EMPTY_DESKTOP_SOURCE} />
    <img className="ah-scene-poster" src={HERO_POSTER} srcSet={HERO_POSTER_SRC_SET}
    sizes="(max-width: 1440px) 100vw, 1440px" width={1440} height={669}
    loading="eager" fetchPriority="high" decoding="async"
    alt="UTEX Pay personal and business account previews, card payments, and a bronze payment card on a three-tier sculpture." />
  </picture>
}
