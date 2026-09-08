export interface StudioOptions {
  motion: boolean
  range: number
  baseYaw: number
  baseTilt: number
  baseRoll: number
  brightness: number
  reflections: number
  screens: boolean
  clay: boolean
}

export const DEFAULTS: StudioOptions = {
  motion: true, range: 12, baseYaw: -5.3, baseTilt: 13.5, baseRoll: 0,
  brightness: 1.05, reflections: .65, screens: true, clay: false,
}
export const VIEW_STORAGE_KEY = 'utex-studio-starting-view-v1'

export function readStartingView(value: string | null): Pick<StudioOptions, 'baseYaw' | 'baseTilt' | 'baseRoll' | 'range'> {
  const defaults = { baseYaw: DEFAULTS.baseYaw, baseTilt: DEFAULTS.baseTilt, baseRoll: DEFAULTS.baseRoll, range: DEFAULTS.range }
  try {
    const saved = JSON.parse(value || '{}')
    const valid = (v: unknown, fallback: number, min: number, max: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback
    return { baseYaw: valid(saved.baseYaw, defaults.baseYaw, -25, 25), baseTilt: valid(saved.baseTilt, defaults.baseTilt, 5, 30), baseRoll: valid(saved.baseRoll, defaults.baseRoll, -15, 15), range: valid(saved.range, defaults.range, 4, 24) }
  } catch { return defaults }
}

export function viewAngles(options: StudioOptions, x: number, y: number) {
  return { yaw: options.baseYaw + x * options.range, tilt: Math.max(3, Math.min(38, options.baseTilt + y * options.range * .32)) }
}
