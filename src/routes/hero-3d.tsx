import { createFileRoute } from '@tanstack/react-router'

import { Hero3D } from '#/components/hero3d/Hero3D'

export const Route = createFileRoute('/hero-3d')({
  component: Hero3DPage,
  head: () => ({
    meta: [{ title: 'Hero 3D Lab — UTEX Pay' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      },
    ],
  }),
})

function Hero3DPage() {
  return <Hero3D />
}
