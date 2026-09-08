import { createFileRoute } from '@tanstack/react-router'

import { HeroDepth } from '#/components/herodepth/HeroDepth'

export const Route = createFileRoute('/hero-depth')({
  component: HeroDepthPage,
  head: () => ({
    meta: [{ title: 'Depth Hero Lab — UTEX Pay' }],
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

function HeroDepthPage() {
  return <HeroDepth />
}
