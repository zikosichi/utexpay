/** Hero headline shortlist for Sandro (Sep 22). Zviad cut 25 candidates down to these eight;
    every line follows the landing brand foundation (Landing/01-brand-positioning): the B + D voice,
    the Bank · Spend · Send · Get paid verb spine, the approved taglines, no "worldwide" and no
    named competitors in a headline. `lines` break as authored on desktop; phones re-flow them.
    The full 25 (three rounds) are in Landing/01-brand-positioning/04-hero-headline-options.md. */
export type HeroHeadlineId = 'here' | 'verbs' | 'grows' | 'first' | 'paid' | 'plain' | 'checkout' | 'triple'

export type HeroHeadline = {
  id: HeroHeadlineId
  /** Short label for the switcher tooltip and the control panel. */
  name: string
  lines: string[]
  support: string
  /** Why it is on the list, for whoever is flipping through. */
  note: string
}

export const HERO_HEADLINES: HeroHeadline[] = [
  {
    id: 'here', name: 'Bank here. Get paid here.',
    lines: ['Bank here.', 'Get paid here.'],
    support: 'One account for money in and money out. What your customers pay lands where you pay your team.',
    note: 'Zviad’s pick, Sep 22. Pillar 1 in six words: banking and getting paid are one account, not two vendors.',
  },
  {
    id: 'verbs', name: 'Bank. Spend. Send. Get paid.',
    lines: ['Bank. Spend.', 'Send. Get paid.'],
    support: 'One place for all of it. Start with a personal or business account, and switch on card payments the day you’re ready.',
    note: 'The verb spine Sandro picked on Aug 25, as the headline. Four concrete things, two per line.',
  },
  {
    id: 'grows', name: 'The bank that grows with you.',
    lines: ['The bank that', 'grows with you.'],
    support: 'From your first account to your first payment. Add business banking and card payments when you’re ready — your money stays in the same place.',
    note: 'The approved lead tagline, moved up to the hero. The closing section would then take “From your first payment to your whole business.”',
  },
  {
    id: 'first', name: 'From your first account to your first payment.',
    lines: ['From your first account', 'to your first payment.'],
    support: 'A personal account, a business account, card payments from your customers — each one a switch, not a new bank.',
    note: 'The approved supporting line promoted to the headline. Says the arc without a metaphor.',
  },
  {
    id: 'paid', name: 'Get paid where you bank.',
    lines: ['Get paid', 'where you bank.'],
    support: 'Business banking and card payments in the same account. What your customers pay is yours the moment it clears.',
    note: 'Payments-led. Off the banking-first brief, but it is the line the merchant persona came for.',
  },
  {
    id: 'plain', name: 'Banking and payments. One account.',
    lines: ['Banking and payments.', 'One account.'],
    support: 'Hold, spend and send your money, and take card payments from your customers — all from the place you already bank.',
    note: 'Direction A, plain and confident. Says exactly what UTEX is for a visitor who reads nothing else.',
  },
  {
    id: 'checkout', name: 'Your bank. Your checkout. One account.',
    lines: ['Your bank. Your checkout.', 'One account.'],
    support: 'Business banking and card acceptance under one login. Money in and money out in one place.',
    note: 'Pillar 1 in nouns, for a visitor who already knows they need both.',
  },
  {
    id: 'triple', name: 'Send here. Spend here. Get paid here.',
    lines: ['Send here. Spend here.', 'Get paid here.'],
    support: 'One account for the whole of it — personal or business, with card payments the day you’re ready.',
    note: 'The verb spine in the “here” register (Bank is the place, so it drops out).',
  },
]

export const DEFAULT_HERO_HEADLINE: HeroHeadlineId = 'first'
export const HERO_HEADLINE_STORAGE_KEY = 'utex-hero-headline'

export function heroHeadline(id: HeroHeadlineId): HeroHeadline {
  return HERO_HEADLINES.find((candidate) => candidate.id === id) ?? HERO_HEADLINES[0]
}

export function isHeroHeadlineId(value: unknown): value is HeroHeadlineId {
  return typeof value === 'string' && HERO_HEADLINES.some((candidate) => candidate.id === value)
}
