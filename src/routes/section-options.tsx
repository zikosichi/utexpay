import { createFileRoute } from '@tanstack/react-router'
import { PhotoStructure } from '#/components/photostructure/PhotoStructure'
import { ILLUMINATED_SOURCE } from '#/components/photostructure/config'
import { panelImage } from '#/components/photostructure/surfaces'
import type { PanelName } from '#/components/photostructure/surfaces'
import { parseSectionOption, SecondSectionOptions } from '#/components/moneyflow/SecondSectionOptions'

const PANELS: PanelName[] = ['personal-title', 'personal-figure', 'business-title', 'business-panel', 'payments-title', 'payments-panel']

export const Route = createFileRoute('/section-options')({
  validateSearch: (search) => ({ direction: parseSectionOption(search.direction) }),
  component: SectionOptionsPage,
  head: () => ({
    meta: [{ title: 'UTEX Pay — Second-section directions' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Epilogue:wght@500&family=Mona+Sans:wdth,wght@75..125,200..900&display=swap' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600&family=JetBrains+Mono:wght@400&family=IBM+Plex+Mono:wght@400;500&family=Oxanium:wght@400;500&family=Space+Grotesk:wght@400&display=swap' },
      ...PANELS.map((name) => ({ rel: 'preload', as: 'image', href: panelImage(name) })),
      { rel: 'preload', as: 'image', href: ILLUMINATED_SOURCE },
      { rel: 'preload', as: 'image', href: '/utex-card.png' },
    ],
  }),
})

function SectionOptionsPage() {
  const { direction } = Route.useSearch()
  return <main>
    <PhotoStructure />
    <SecondSectionOptions key={direction} initialOption={direction} />
  </main>
}
