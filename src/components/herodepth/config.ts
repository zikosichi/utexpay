export type EdgeMode = 'stretch' | 'cut'
import { DEFAULT_DIMS } from './boxGeometry'
import type { BoxDims } from './boxGeometry'

export type DebugView = 'none' | 'mesh' | 'depth' | 'normal' | 'mask' | 'light' | 'edges' | 'wire' | 'boxes'
export type Overlay = 'none' | 'blocks' | 'hero'
export type PlateSource = 'render' | 'boxes'
export type BoxKey = 'slab' | 'personal' | 'business' | 'payments'

/**
 * A hand-match nudge for one box, in the hero's units.
 * Applied as:  world' = centre + scale * (world - centre) + move
 * where `centre` is that box's own world bounding-box centre before the tweak.
 */
export interface BoxTweak {
  tx: number
  ty: number
  tz: number
  sx: number
  sy: number
  sz: number
}

export const IDENTITY_BOX: BoxTweak = { tx: 0, ty: 0, tz: 0, sx: 1, sy: 1, sz: 1 }

export interface HeroDepthConfig {
  framing: {
    /** structure width as a fraction of the viewport width */
    widthFraction: number
    /** where the structure's centre sits vertically (0 top … 1 bottom) */
    anchorY: number
    /** reproduce the reference render's slight camera roll */
    roll: boolean
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
  depth: {
    /** grid cells across the image width */
    density: number
    /** what happens where depth jumps: rubber-sheet or drop the triangle */
    edge: EdgeMode
    /** drop a triangle once it is stretched this many times past its rest size */
    cut: number
    /** draw the fitted geometry in flat dark bronze behind the plate, so a disocclusion shows metal, not black */
    backing: boolean
    backingColor: string
    /** deepens the whole structure about the block fronts' plane (1 = true depth) */
    scale: number
    /** blend the raw depth map over the render, through the same warp, to check registration */
    mapOverlay: number
  }
  light: {
    enabled: boolean
    color: string
    /** broad sheen (low exponent) */
    sheen: number
    sheenPow: number
    /** tight specular (high exponent) */
    spec: number
    specPow: number
    /** diffuse shading shift vs the baked light direction */
    shade: number
    /** world units the light travels sideways at the viewport edge */
    travel: number
    height: number
    distance: number
    /** glint on the gold inlay lines */
    glint: number
    glintPow: number
    /** 0 = whole line glints, 1 = only near the pointer */
    glintLocal: number
  }
  show: {
    intro: boolean
    overlay: Overlay
    overlayOpacity: number
    debug: DebugView
  }
  /** per-box hand matching against the render (glTF mesh only) */
  boxes: Record<BoxKey, BoxTweak>
  /** which image the plate shows, and the camera it was shot from */
  plate: {
    source: PlateSource
    yaw: number
    pitch: number
    widthFraction: number
  }
  /** a fixed camera, so a baked image is repeatable */
  view: {
    locked: boolean
    yaw: number
    pitch: number
  }
  /** real boxes, built from dimensions instead of the friend's mesh */
  geometry: {
    procedural: boolean
    radius: number
    dims: Record<BoxKey, BoxDims>
  }
}

export const defaultConfig: HeroDepthConfig = {
  framing: { widthFraction: 0.87, anchorY: 0.69, roll: true },
  parallax: { yaw: 7, pitch: 3.5, shift: 0.3, damping: 0.07, idle: 0.8 },
  depth: { density: 418, edge: 'cut', cut: 4, backing: true, backingColor: '#1a1410', scale: 1.6, mapOverlay: 0 },
  light: {
    enabled: true,
    color: '#ffd9a6',
    sheen: 0.05,
    sheenPow: 10,
    spec: 0.35,
    specPow: 60,
    shade: 0.08,
    travel: 16,
    height: 8.5,
    distance: 11,
    glint: 1.0,
    glintPow: 40,
    glintLocal: 0.5,
  },
  show: {
    intro: true,
    overlay: 'none',
    overlayOpacity: 0.5,
    debug: 'none',
  },
  boxes: {
    slab: { ...IDENTITY_BOX },
    personal: { ...IDENTITY_BOX },
    business: { ...IDENTITY_BOX },
    payments: { ...IDENTITY_BOX },
  },
  plate: { source: 'boxes', yaw: -19, pitch: 0, widthFraction: 0.65 },
  view: { locked: true, yaw: -19, pitch: 0 },
  geometry: {
    procedural: true,
    radius: 0.16,
    dims: {
      slab: { ...DEFAULT_DIMS.slab },
      personal: { ...DEFAULT_DIMS.personal },
      business: { ...DEFAULT_DIMS.business },
      payments: { ...DEFAULT_DIMS.payments },
    },
  },
}

const STORAGE_KEY = 'utex-herodepth-v8'
/** previous key — read once so an existing tuning session isn't lost when the schema grows */
const LEGACY_KEYS = ['utex-herodepth-v7']

export function loadConfig(): HeroDepthConfig {
  if (typeof window === 'undefined') return defaultConfig
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) for (const k of LEGACY_KEYS) raw = raw ?? window.localStorage.getItem(k)
    if (!raw) return defaultConfig
    const p = JSON.parse(raw) as Partial<HeroDepthConfig>
    return {
      framing: { ...defaultConfig.framing, ...p.framing },
      parallax: { ...defaultConfig.parallax, ...p.parallax },
      depth: { ...defaultConfig.depth, ...p.depth },
      light: { ...defaultConfig.light, ...p.light },
      show: { ...defaultConfig.show, ...p.show },
      boxes: {
        slab: { ...IDENTITY_BOX, ...p.boxes?.slab },
        personal: { ...IDENTITY_BOX, ...p.boxes?.personal },
        business: { ...IDENTITY_BOX, ...p.boxes?.business },
        payments: { ...IDENTITY_BOX, ...p.boxes?.payments },
      },
      plate: { ...defaultConfig.plate, ...p.plate },
      view: { ...defaultConfig.view, ...p.view },
      geometry: {
        ...defaultConfig.geometry,
        ...p.geometry,
        dims: {
          slab: { ...DEFAULT_DIMS.slab, ...p.geometry?.dims?.slab },
          personal: { ...DEFAULT_DIMS.personal, ...p.geometry?.dims?.personal },
          business: { ...DEFAULT_DIMS.business, ...p.geometry?.dims?.business },
          payments: { ...DEFAULT_DIMS.payments, ...p.geometry?.dims?.payments },
        },
      },
    }
  } catch {
    return defaultConfig
  }
}

export function saveConfig(config: HeroDepthConfig) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
