export type Vec3 = [number, number, number]

export interface BlockConfig {
  label: string
  position: Vec3
  size: Vec3
  radius: number
}

export interface ProjectionConfig {
  projector: {
    position: Vec3
    target: Vec3
    fov: number
  }
  blocks: BlockConfig[]
  view: {
    overlayOpacity: number
    showHelper: boolean
    clayView: boolean
    wireframe: boolean
    autoRotate: boolean
    parallax: boolean
    parallaxAmount: number
  }
}

export const defaultConfig: ProjectionConfig = {
  projector: {
    position: [-1.2, 3.2, 16],
    target: [0, 2.2, 0],
    fov: 26,
  },
  blocks: [
    {
      label: 'Base',
      position: [0, 0.3, 0],
      size: [17, 0.6, 4.6],
      radius: 0.06,
    },
    {
      label: 'Personal',
      position: [-5.4, 1.85, 0],
      size: [5.4, 2.5, 3.2],
      radius: 0.32,
    },
    {
      label: 'Business',
      position: [-0.1, 2.2, 0],
      size: [5.2, 3.2, 3.2],
      radius: 0.32,
    },
    {
      label: 'Payments',
      position: [5.1, 2.6, 0],
      size: [5.2, 4.0, 3.2],
      radius: 0.32,
    },
  ],
  view: {
    overlayOpacity: 0,
    showHelper: false,
    clayView: false,
    wireframe: false,
    autoRotate: false,
    parallax: false,
    parallaxAmount: 1.5,
  },
}

const STORAGE_KEY = 'utex-projection-lab-v1'

export function loadConfig(): ProjectionConfig {
  if (typeof window === 'undefined') return defaultConfig
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig
    const parsed = JSON.parse(raw) as Partial<ProjectionConfig>
    return {
      projector: { ...defaultConfig.projector, ...parsed.projector },
      blocks:
        Array.isArray(parsed.blocks) && parsed.blocks.length === defaultConfig.blocks.length
          ? parsed.blocks
          : defaultConfig.blocks,
      view: { ...defaultConfig.view, ...parsed.view },
    }
  } catch {
    return defaultConfig
  }
}

export function saveConfig(config: ProjectionConfig) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
