export type GlobeAppearance = { size: number; density: number; radius: number }

export const defaultAppearance: GlobeAppearance = { size: 55, density: 100, radius: 130 }
export const appearanceStorageKey = 'utexpay.globe.appearance.v4'
export const previousAppearanceStorageKey = 'utexpay.globe.appearance.v3'
export const legacyAppearanceStorageKey = 'utexpay.globe.appearance.v1'
export const appearanceLimits = {
  size: { min: 50, max: 180, step: 5 },
  density: { min: 25, max: 200, step: 5 },
  radius: { min: 25, max: 200, step: 5 },
} as const

export function normalizeAppearance(value: unknown): GlobeAppearance {
  const input = value && typeof value === 'object' ? value as Partial<GlobeAppearance> : {}
  const clamp = (key: keyof GlobeAppearance) => {
    const number = input[key], { min, max, step } = appearanceLimits[key]
    return typeof number === 'number' && Number.isFinite(number)
      ? Math.min(max, Math.max(min, Math.round(number / step) * step))
      : defaultAppearance[key]
  }
  return { size: clamp('size'), density: clamp('density'), radius: clamp('radius') }
}
