import { createFileRoute } from '@tanstack/react-router'
import { AccountsHero } from '#/components/accountshero/AccountsHero'
import { SOURCE, ILLUMINATED_SOURCE } from '#/components/accountshero/config'
import { PersonalBankingSection } from '#/components/personalbanking/PersonalBankingSection'
import { GlobeHorizonSection } from '#/components/globehorizon/GlobeHorizonSection'
import { MoneyInsightSection } from '#/components/moneyinsight/MoneyInsightSection'
import { TrustFaqSection } from '#/components/trustfaq/TrustFaqSection'
import { SiteFooter } from '#/components/sitefooter/SiteFooter'
import { MagneticClosingSection } from '#/components/magneticclosing/MagneticClosingSection'

export const Route = createFileRoute('/version-5')({
  component: () => <main className="utexpay-landing feature-grid-alternative"><AccountsHero /><PersonalBankingSection initialVersion="features" /><MoneyInsightSection /><TrustFaqSection /><GlobeHorizonSection /><MagneticClosingSection /><SiteFooter /></main>,
  head: () => ({
    meta: [{ title: 'UTEX Pay — Version 5 · Feature grid' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Epilogue:wght@500&family=Mona+Sans:ital,wdth,wght@0,75..125,200..900;1,75..125,200..900&family=Onest:wght@100..900&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600&family=JetBrains+Mono:wght@400&family=IBM+Plex+Mono:wght@400;500&family=Oxanium:wght@400;500&family=Space+Grotesk:wght@400&display=swap' },
      { rel: 'preload', as: 'image', href: SOURCE },
      { rel: 'preload', as: 'image', href: ILLUMINATED_SOURCE, crossOrigin: 'anonymous' },
    ],
  }),
})
