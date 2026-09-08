export type Mode = 'projected' | 'pbr' | 'hybrid'
export type ToneMap = 'neutral' | 'aces' | 'agx' | 'none'
export type Overlay = 'none' | 'blocks' | 'hero'

export interface Hero3DConfig {
  mode: Mode
  framing: {
    /** structure width as a fraction of the viewport width */
    widthFraction: number
    /** where the structure's centre sits vertically (0 top … 1 bottom) */
    anchorY: number
    fov: number
  }
  parallax: {
    /** degrees at the viewport edge */
    yaw: number
    pitch: number
    /** world units of target drift at the viewport edge */
    shift: number
    damping: number
    /** degrees of slow idle sway */
    idle: number
  }
  material: {
    color: string
    roughness: number
    metalness: number
    envIntensity: number
    /** fine roughness grain */
    grain: number
    /** broad patina mottling of the base colour */
    mottle: number
  }
  gold: {
    color: string
    /** band centre on the fillet, radians from the flat face */
    center: number
    width: number
    strength: number
    /** how much the band follows the key-light direction */
    directional: number
    /** weight of the band on the top-face side of an edge */
    topWeight: number
    /** only draw the band around the front (and top) faces */
    frontOnly: boolean
  }
  projection: {
    /** projected image contribution as emissive (baked look) */
    emissive: number
    /** projected image contribution as albedo (lit by the live lights) */
    albedo: number
    /** only project onto surfaces facing +z; everything else stays PBR */
    frontOnly: boolean
  }
  lights: {
    key: number
    rim: number
    fill: number
    ambient: number
    exposure: number
    toneMap: ToneMap
    shadows: boolean
  }
  show: {
    panels: boolean
    labels: boolean
    card: boolean
    reflector: boolean
    post: boolean
    bloom: number
    grainFx: number
    vignette: number
    intro: boolean
    overlay: Overlay
    overlayOpacity: number
  }
}

export const defaultConfig: Hero3DConfig = {
  mode: 'pbr',
  framing: { widthFraction: 0.84, anchorY: 0.69, fov: 29 },
  parallax: { yaw: 4, pitch: 2.2, shift: 0.35, damping: 0.06, idle: 0.6 },
  material: {
    color: '#4a3a2c',
    roughness: 0.5,
    metalness: 0.62,
    envIntensity: 1.6,
    grain: 0.16,
    mottle: 0.14,
  },
  gold: {
    color: '#e0b06a',
    center: 0.07,
    width: 0.06,
    strength: 1.1,
    directional: 0.6,
    topWeight: 0.25,
    frontOnly: true,
  },
  projection: { emissive: 1.0, albedo: 0.35, frontOnly: true },
  lights: {
    key: 6,
    rim: 1.6,
    fill: 0.9,
    ambient: 0.12,
    exposure: 1.0,
    toneMap: 'neutral',
    shadows: true,
  },
  show: {
    panels: true,
    labels: true,
    card: true,
    reflector: true,
    post: true,
    bloom: 0.55,
    grainFx: 0.035,
    vignette: 0.7,
    intro: true,
    overlay: 'none',
    overlayOpacity: 0.5,
  },
}

const STORAGE_KEY = 'utex-hero3d-v1'

export function loadConfig(): Hero3DConfig {
  if (typeof window === 'undefined') return defaultConfig
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig
    const p = JSON.parse(raw) as Partial<Hero3DConfig>
    return {
      mode: p.mode ?? defaultConfig.mode,
      framing: { ...defaultConfig.framing, ...p.framing },
      parallax: { ...defaultConfig.parallax, ...p.parallax },
      material: { ...defaultConfig.material, ...p.material },
      gold: { ...defaultConfig.gold, ...p.gold },
      projection: { ...defaultConfig.projection, ...p.projection },
      lights: { ...defaultConfig.lights, ...p.lights },
      show: { ...defaultConfig.show, ...p.show },
    }
  } catch {
    return defaultConfig
  }
}

export function saveConfig(config: Hero3DConfig) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
