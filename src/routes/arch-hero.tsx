import { createFileRoute } from '@tanstack/react-router'

import { ArchHero } from '#/components/ArchHero'

export const Route = createFileRoute('/arch-hero')({
  component: ArchHeroPage,
  head: () => ({
    meta: [{ title: 'Arch Hero — UTEX Pay Hero Experiment' }],
  }),
})

function ArchHeroPage() {
  return <ArchHero />
}
