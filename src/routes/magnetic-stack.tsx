import { createFileRoute } from '@tanstack/react-router'

import { MagneticStackHero } from '#/components/MagneticStackHero'

export const Route = createFileRoute('/magnetic-stack')({
  component: MagneticStackPage,
  head: () => ({
    meta: [{ title: 'Magnetic Stack — UTEX Pay Hero Experiment' }],
  }),
})

function MagneticStackPage() {
  return <MagneticStackHero />
}
