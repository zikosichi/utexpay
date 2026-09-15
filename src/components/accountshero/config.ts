
export type ViewMode = 'photo' | 'source' | 'mesh'
export type LightingPreset = 'unlit' | 'backdrop' | 'illuminated'
export type PhotoFocus = 'full' | 'personal' | 'business' | 'payments'
import type { HintSettings } from './nudge'
export type { HintStyle, HintSettings } from './nudge'
export type CardAppearance = {
  cardEye: number; cardReflection: number; cardTopLight: number; cardBottomLight: number
  cardShadowYaw: number; cardShadowHeight: number; cardShadowStrength: number; cardShadowSoftness: number
  cardGrainSize: number; cardTextureStrength: number; cardTextureRelief: number; cardTextureRoughness: number
}
export type PhotoOptions = CardAppearance & HintSettings & { motion: boolean; range: number; cardYaw: number; cardPerspective: number; cardLightYaw: number; cardLightStrength: number; response: number; mode: ViewMode; focus: PhotoFocus; lighting: LightingPreset; backgroundLight: number; lightSpread: number; floorReflection: number; overheadLight: number }
export interface PhotoScene {
  move(x: number, y: number): void
  reset(): void
  replayIntro(): void
  update(options: PhotoOptions): void
  dispose(): void
}
export const CARD_YAW_LIMIT = 40
export const CARD_YAW_STORAGE_KEY = 'utex-accounts-card-yaw'
export const CARD_PERSPECTIVE_STORAGE_KEY = 'utex-accounts-card-perspective'
export const CARD_PERSPECTIVE_LIMIT = .25
export const CARD_LIGHT_STORAGE_KEY = 'utex-accounts-card-light'
export const CARD_LIGHT_YAW_LIMIT = 60
/** The card's own appearance, separate from the scene lighting. Approved values are the defaults. */
export const CARD_APPEARANCE_STORAGE_KEY = 'utex-accounts-card-appearance'
export const CARD_APPEARANCE_LIMITS: Record<keyof CardAppearance, [number, number]> = {
  cardEye: [2, 40], cardReflection: [0, 2], cardTopLight: [.3, 1.6], cardBottomLight: [0, 1.2],
  cardShadowYaw: [-85, 85], cardShadowHeight: [1, 18], cardShadowStrength: [0, 1], cardShadowSoftness: [0, .4],
  cardGrainSize: [.25, 4], cardTextureStrength: [0, 3], cardTextureRelief: [0, 5], cardTextureRoughness: [.15, 1],
}
export const DEFAULT_CARD_TEXTURE = { cardGrainSize: .55, cardTextureStrength: 1.45, cardTextureRelief: 1, cardTextureRoughness: .33 }
export const DEFAULT_CARD_APPEARANCE: CardAppearance = {
  ...DEFAULT_CARD_TEXTURE,
  cardEye: 12, cardReflection: 1.05, cardTopLight: .98, cardBottomLight: .66,
  cardShadowYaw: 38, cardShadowHeight: 11.5, cardShadowStrength: .7, cardShadowSoftness: .23,
}
/** The idle interactivity cue. Interval is the average gap in seconds; each gap varies around it. */
export const HINT_STORAGE_KEY = 'utex-accounts-hints-v2'
export const DEFAULT_HINTS: HintSettings = { hintStyle: 'both', hintStrength: .85, hintInterval: 3.2, hintLift: false }
/** The studio key light orbits the card at this radius; only its angle and height are adjustable. */
export const CARD_SHADOW_RADIUS = 9.9
export const DEFAULT_OPTIONS: PhotoOptions = { ...DEFAULT_CARD_APPEARANCE, ...DEFAULT_HINTS, motion: true, range: 6, cardYaw: -11.5, cardPerspective: .01, cardLightYaw: -27, cardLightStrength: 1.2, response: .3, mode: 'photo', focus: 'full', lighting: 'illuminated', backgroundLight: .85, lightSpread: .75, floorReflection: .4, overheadLight: .55 }
export const COMPOSITION_SCALE = .92
export const SOURCE = '/photostructure/bronze-source.webp'
export const ILLUMINATED_SOURCE = '/photostructure/bronze-source-illuminated-v1.webp'
