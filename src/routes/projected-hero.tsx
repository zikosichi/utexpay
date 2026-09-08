import { createFileRoute } from '@tanstack/react-router'

import { ProjectedHero } from '#/components/ProjectedHero'

export const Route = createFileRoute('/projected-hero')({
  component: ProjectedHeroPage,
  head: () => ({
    meta: [{ title: 'Projected Hero — UTEX Pay' }],
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

function ProjectedHeroPage() {
  return <ProjectedHero />
}
