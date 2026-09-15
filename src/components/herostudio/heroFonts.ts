import type { CSSProperties } from 'react'

/** The landing hero's typeface candidates. Foundry (Mona Sans, wide headline) is the default;
    the rest are there for the client to try from the hero control panel. Every family is on Google Fonts. */
export type HeroFontId =
  | 'foundry' | 'hubot' | 'funnel' | 'archivo' | 'familjen' | 'albert' | 'rethink'
  | 'parkinsans' | 'epilogue' | 'radio' | 'kumbh' | 'anek' | 'dmsans'

type Face = { family: string; variation?: string }
export type HeroFont = {
  id: HeroFontId
  name: string
  pair: string
  /** Google Fonts `family=` query for lazy loading (the default is linked in the route head instead). */
  query: string
  display: Face & { weight: number; tracking: string }
  body: Face
}

const sans = (family: string) => `'${family}', 'DM Sans', sans-serif`

export const HERO_FONTS: HeroFont[] = [
  { id: 'foundry', name: 'Mona Sans', pair: 'Wide headline, normal body', query: 'Mona+Sans:ital,wdth,wght@0,75..125,200..900;1,75..125,200..900',
    display: { family: sans('Mona Sans'), weight: 500, tracking: '-.02em', variation: '"wdth" 118' }, body: { family: sans('Mona Sans'), variation: '"wdth" 100' } },
  { id: 'hubot', name: 'Hubot Sans', pair: 'Wide headline, normal body', query: 'Hubot+Sans:wdth,wght@75..125,200..900',
    display: { family: sans('Hubot Sans'), weight: 500, tracking: '-.015em', variation: '"wdth" 120' }, body: { family: sans('Hubot Sans'), variation: '"wdth" 100' } },
  { id: 'funnel', name: 'Funnel Display', pair: 'Funnel Sans body', query: 'Funnel+Display:wght@300..800&family=Funnel+Sans:wght@300..800',
    display: { family: sans('Funnel Display'), weight: 500, tracking: '-.02em' }, body: { family: sans('Funnel Sans') } },
  { id: 'archivo', name: 'Archivo', pair: 'Semi-wide headline', query: 'Archivo:wdth,wght@62..125,100..900',
    display: { family: sans('Archivo'), weight: 500, tracking: '-.02em', variation: '"wdth" 112' }, body: { family: sans('Archivo'), variation: '"wdth" 100' } },
  { id: 'familjen', name: 'Familjen Grotesk', pair: 'One family', query: 'Familjen+Grotesk:wght@400..700',
    display: { family: sans('Familjen Grotesk'), weight: 500, tracking: '-.02em' }, body: { family: sans('Familjen Grotesk') } },
  { id: 'albert', name: 'Albert Sans', pair: 'One family', query: 'Albert+Sans:wght@100..900',
    display: { family: sans('Albert Sans'), weight: 500, tracking: '-.025em' }, body: { family: sans('Albert Sans') } },
  { id: 'rethink', name: 'Rethink Sans', pair: 'One family', query: 'Rethink+Sans:wght@400..800',
    display: { family: sans('Rethink Sans'), weight: 500, tracking: '-.03em' }, body: { family: sans('Rethink Sans') } },
  { id: 'parkinsans', name: 'Parkinsans', pair: 'One family', query: 'Parkinsans:wght@300..800',
    display: { family: sans('Parkinsans'), weight: 500, tracking: '-.02em' }, body: { family: sans('Parkinsans') } },
  { id: 'epilogue', name: 'Epilogue', pair: 'One family', query: 'Epilogue:wght@100..900',
    display: { family: sans('Epilogue'), weight: 500, tracking: '-.02em' }, body: { family: sans('Epilogue') } },
  { id: 'radio', name: 'Radio Canada Big', pair: 'One family', query: 'Radio+Canada+Big:wght@400..700',
    display: { family: sans('Radio Canada Big'), weight: 500, tracking: '-.02em' }, body: { family: sans('Radio Canada Big') } },
  { id: 'kumbh', name: 'Kumbh Sans', pair: 'One family', query: 'Kumbh+Sans:wght@100..900',
    display: { family: sans('Kumbh Sans'), weight: 500, tracking: '-.02em' }, body: { family: sans('Kumbh Sans') } },
  { id: 'anek', name: 'Anek Latin', pair: 'Wide headline, normal body', query: 'Anek+Latin:wdth,wght@75..125,100..800',
    display: { family: sans('Anek Latin'), weight: 500, tracking: '-.015em', variation: '"wdth" 120' }, body: { family: sans('Anek Latin'), variation: '"wdth" 100' } },
  { id: 'dmsans', name: 'DM Sans', pair: 'The previous build', query: 'DM+Sans:wght@400;500;600;700',
    display: { family: "'DM Sans', sans-serif", weight: 600, tracking: '-.043em' }, body: { family: "'DM Sans', sans-serif" } },
]

export const DEFAULT_HERO_FONT: HeroFontId = 'foundry'
export const HERO_FONT_STORAGE_KEY = 'utex-hero-font'

export function heroFont(id: HeroFontId): HeroFont {
  return HERO_FONTS.find((font) => font.id === id) ?? HERO_FONTS[0]
}

export function isHeroFontId(value: unknown): value is HeroFontId {
  return typeof value === 'string' && HERO_FONTS.some((font) => font.id === value)
}

/** Custom properties consumed by studio.css (`.studio h1`, `.studio-copy`, `.studio-nav`, hero buttons).
    The headline and the reading face are chosen independently. */
export function heroFontStyle(id: HeroFontId, bodyId: HeroBodyId = DEFAULT_HERO_BODY): CSSProperties {
  const font = heroFont(id)
  const body = resolveBody(id, bodyId)
  return {
    '--hero-display-font': font.display.family,
    '--hero-display-weight': String(font.display.weight),
    '--hero-display-tracking': font.display.tracking,
    '--hero-display-variation': font.display.variation ?? 'normal',
    '--hero-body-font': body.family,
    '--hero-body-variation': body.variation ?? 'normal',
  } as CSSProperties
}

/** Style for a font's own name inside the picker, so each option previews its display face. */
export function heroFontPreviewStyle(font: HeroFont): CSSProperties {
  return { fontFamily: font.display.family, fontWeight: font.display.weight, fontVariationSettings: font.display.variation ?? 'normal' } as CSSProperties
}

/** Injects the Google Fonts stylesheet for one candidate, once. The default face ships in the route head. */
export function loadHeroFont(id: HeroFontId) {
  if (typeof document === 'undefined' || id === DEFAULT_HERO_FONT) return
  const marker = `hero-font-${id}`
  if (document.getElementById(marker)) return
  const link = document.createElement('link')
  link.id = marker
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${heroFont(id).query}&display=swap`
  document.head.appendChild(link)
}

export function loadAllHeroFonts() {
  for (const font of HERO_FONTS) loadHeroFont(font.id)
}

/** The reading faces tried under the settled headline. `match` follows whatever the headline family uses. */
export type HeroBodyId = 'match' | 'mona' | 'plex' | 'golos' | 'madefor' | 'onest' | 'source' | 'atkinson' | 'karla' | 'dmsans'

export type HeroBodyFont = {
  id: HeroBodyId
  name: string
  role: string
  /** Google Fonts `family=` query, omitted for faces already linked in the route head. */
  query?: string
  family?: string
  variation?: string
}

export const HERO_BODY_FONTS: HeroBodyFont[] = [
  { id: 'match', name: 'Match the headline', role: 'Whatever the headline uses' },
  { id: 'onest', name: 'Onest', role: 'Plain and warm', family: sans('Onest') },  // the default, linked in the route head
  { id: 'mona', name: 'Mona Sans', role: 'One family, no second face', family: sans('Mona Sans'), variation: '"wdth" 100' },  // linked in the route head for the headline
  { id: 'plex', name: 'IBM Plex Sans', role: 'Engineered humanist', query: 'IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400', family: sans('IBM Plex Sans') },
  { id: 'golos', name: 'Golos Text', role: 'Sturdy, screen-first', query: 'Golos+Text:wght@400..900', family: sans('Golos Text') },
  { id: 'madefor', name: 'Wix Madefor Text', role: 'Purpose-drawn for reading', query: 'Wix+Madefor+Text:ital,wght@0,400..800;1,400..800', family: sans('Wix Madefor Text') },
  { id: 'source', name: 'Source Sans 3', role: 'The safe humanist', query: 'Source+Sans+3:ital,wght@0,300..700;1,300..700', family: sans('Source Sans 3') },
  { id: 'atkinson', name: 'Atkinson Hyperlegible Next', role: 'Legibility as the argument', query: 'Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800', family: sans('Atkinson Hyperlegible Next') },
  { id: 'karla', name: 'Karla', role: 'The far end, for calibration', query: 'Karla:ital,wght@0,200..800;1,200..800', family: sans('Karla') },
  { id: 'dmsans', name: 'DM Sans', role: 'The previous build', family: "'DM Sans', sans-serif" },
]

export const DEFAULT_HERO_BODY: HeroBodyId = 'onest'
export const HERO_BODY_STORAGE_KEY = 'utex-hero-body-font'

export function heroBodyFont(id: HeroBodyId): HeroBodyFont {
  return HERO_BODY_FONTS.find((font) => font.id === id)
    ?? HERO_BODY_FONTS.find((font) => font.id === DEFAULT_HERO_BODY)
    ?? HERO_BODY_FONTS[1]
}

export function isHeroBodyId(value: unknown): value is HeroBodyId {
  return typeof value === 'string' && HERO_BODY_FONTS.some((font) => font.id === value)
}

/** The body face actually in force, resolving `match` against the current headline. */
function resolveBody(displayId: HeroFontId, bodyId: HeroBodyId): Face {
  if (bodyId === 'match') return heroFont(displayId).body
  const font = heroBodyFont(bodyId)
  return { family: font.family ?? heroFont(displayId).body.family, variation: font.variation }
}

/** Style for a body face's own name inside the picker. `match` previews in the headline family. */
export function heroBodyPreviewStyle(font: HeroBodyFont, displayId: HeroFontId): CSSProperties {
  const face = font.id === 'match' ? heroFont(displayId).body : font
  return { fontFamily: face.family, fontVariationSettings: face.variation ?? 'normal', fontWeight: 500 } as CSSProperties
}

export function loadBodyFont(id: HeroBodyId) {
  if (typeof document === 'undefined') return
  const { query } = heroBodyFont(id)
  if (!query) return
  const marker = `hero-body-font-${id}`
  if (document.getElementById(marker)) return
  const link = document.createElement('link')
  link.id = marker
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`
  document.head.appendChild(link)
}

export function loadAllBodyFonts() {
  for (const font of HERO_BODY_FONTS) loadBodyFont(font.id)
}
