import { createFileRoute } from '@tanstack/react-router'
import { GlobeHorizonSection } from '#/components/globehorizon/GlobeHorizonSection'

export const Route = createFileRoute('/globe-horizon')({
  component: () => <main><GlobeHorizonSection /></main>,
  head: () => ({
    meta: [{ title: 'UTEX Pay — Across borders' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600&family=JetBrains+Mono:wght@400&display=swap' },
    ],
  }),
})
