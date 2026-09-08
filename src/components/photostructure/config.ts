import type { PersonalVariant } from './personalVariants'

export type ViewMode = 'photo' | 'source' | 'mesh'
export type PhotoFocus = 'full' | 'personal' | 'business' | 'payments'
export type PhotoOptions = { motion: boolean; range: number; response: number; mode: ViewMode; focus: PhotoFocus; layout: PersonalVariant }
export interface PhotoScene {
  move(x: number, y: number): void
  reset(): void
  replayIntro(): void
  update(options: PhotoOptions): void
  dispose(): void
}
export const DEFAULT_OPTIONS: PhotoOptions = { motion: true, range: 6, response: .3, mode: 'photo', focus: 'full', layout: 'figure' }
export const SOURCE = '/photostructure/bronze-source.webp'
