import './dashboard-visual.css'

export type DashboardVersion = 'dashboard' | 'concept'

const SCENES = {
  dashboard: {
    name: 'pad-scene-v1', width: 1122, height: 1402,
    description: 'Illustrative UTEX Pay personal banking dashboard on a champagne-metal pad, with currency accounts, a gold card and recent activity, photographed in warm studio light.',
  },
  concept: {
    name: 'pad-scene-v6', width: 1254, height: 1254,
    description: 'UTEX Pay personal banking dashboard on a short, nearly square, edge-to-edge glass display with a hairline metal edge, showing balances, currency accounts, cash flow and cards against warm amber light fading into black.',
  },
} as const

/** The pad, screen, glass and studio are one render, with a single camera and lighting setup. */
export function DashboardSceneImage({ preview = false, variant = 'dashboard' }: { preview?: boolean; variant?: DashboardVersion }) {
  const scene = SCENES[variant]
  const source = `/personalbanking/${scene.name}`
  return <img className={preview ? 'personal-banking__pad-preview' : 'dashboard-scene__image'}
    data-variant={variant}
    src={`${source}-${scene.width}.webp`} srcSet={`${source}-640.webp 640w, ${source}-960.webp 960w, ${source}-${scene.width}.webp ${scene.width}w`}
    sizes={preview ? '(max-width: 899px) 100vw, 800px' : `(max-width: 599px) ${variant === 'concept' ? '100vw' : '120vw'}, (max-width: 1049px) 950px, (max-width: 1799px) 65vw, 1100px`}
    width={scene.width} height={scene.height} loading={preview ? 'eager' : 'lazy'} decoding="async" draggable="false"
    alt={scene.description} />
}

export function DashboardVisual({ variant = 'dashboard' }: { variant?: DashboardVersion }) {
  return <div className={`dashboard-scene dashboard-scene--${variant}`}><DashboardSceneImage variant={variant} /></div>
}
