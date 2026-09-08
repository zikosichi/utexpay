import { createFileRoute } from '@tanstack/react-router'
import { HeroStudio } from '#/components/herostudio/HeroStudio'

export const Route = createFileRoute('/hero-studio')({
  component: HeroStudio,
  head: () => ({
    meta: [{ title: 'UTEX Pay — Studio Hero' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500&family=Plus+Jakarta+Sans:wght@600&family=IBM+Plex+Mono:wght@400;500&display=swap' },
    ],
  }),
})
