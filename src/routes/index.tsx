import { createFileRoute } from '@tanstack/react-router'
import { AccountsHero } from '#/components/accountshero/AccountsHero'
import { SOURCE, ILLUMINATED_SOURCE } from '#/components/accountshero/config'
import { PersonalBankingSection } from '#/components/personalbanking/PersonalBankingSection'
import { GlobeHorizonSection } from '#/components/globehorizon/GlobeHorizonSection'

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [{ title: 'UTEX Pay — Start with an account' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Epilogue:wght@500&display=swap' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Mona+Sans:ital,wdth,wght@0,75..125,200..900;1,75..125,200..900&family=Onest:wght@100..900&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600&family=JetBrains+Mono:wght@400&family=IBM+Plex+Mono:wght@400;500&family=Oxanium:wght@400;500&family=Space+Grotesk:wght@400&display=swap' },
      { rel: 'preload', as: 'image', href: SOURCE },
      { rel: 'preload', as: 'image', href: ILLUMINATED_SOURCE, crossOrigin: 'anonymous' },
    ],
  }),
})

function HomePage() {
  return (
    <main className="utexpay-landing">
      <AccountsHero />
      <PersonalBankingSection />
      <GlobeHorizonSection />
    </main>
  )
}
