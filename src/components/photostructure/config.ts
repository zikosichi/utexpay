import type { PersonalVariant } from './personalVariants'

export type ViewMode = 'photo' | 'source' | 'mesh'
export type LightingPreset = 'unlit' | 'backdrop' | 'illuminated'
export type PhotoFocus = 'full' | 'personal' | 'business' | 'payments'
export type PhotoOptions = { motion: boolean; range: number; response: number; mode: ViewMode; focus: PhotoFocus; layout: PersonalVariant; lighting: LightingPreset; backgroundLight: number; lightSpread: number; floorReflection: number; overheadLight: number }
export interface PhotoScene {
  move(x: number, y: number): void
  reset(): void
  replayIntro(): void
  update(options: PhotoOptions): void
  dispose(): void
}
export const DEFAULT_OPTIONS: PhotoOptions = { motion: true, range: 6, response: .3, mode: 'photo', focus: 'full', layout: 'figure', lighting: 'illuminated', backgroundLight: .85, lightSpread: .75, floorReflection: .4, overheadLight: .55 }
export const SOURCE = '/photostructure/bronze-source.webp'
export const ILLUMINATED_SOURCE = '/photostructure/bronze-source-illuminated-v1.webp'
