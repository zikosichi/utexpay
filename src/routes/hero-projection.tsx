import { createFileRoute } from '@tanstack/react-router'
import { PhotoStructure } from '#/components/photostructure/PhotoStructure'
import { panelImage } from '#/components/photostructure/surfaces'
import type { PanelName } from '#/components/photostructure/surfaces'

/** The six bakes the hero opens with; the other Personal layouts load on demand. */
const PANELS: PanelName[] = ['personal-title', 'personal-figure', 'business-title', 'business-panel', 'payments-title', 'payments-panel']

export const Route = createFileRoute('/hero-projection')({
  component: PhotoStructure,
  head: () => ({
    meta: [{ title: 'UTEX Pay — Start with an account' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500&family=Plus+Jakarta+Sans:wght@600&family=IBM+Plex+Mono:wght@400;500&family=Oxanium:wght@400;500&family=Space+Grotesk:wght@400&display=swap' },
      ...PANELS.map((name) => ({ rel: 'preload', as: 'image', href: panelImage(name) })),
    ],
  }),
})
