import './site-footer.css'

/**
 * Sitemap by verb, the way the Aug 25 page map calls for it: Bank · Spend · Send · Get paid,
 * plus Developers. Section anchors match the hero navigation so the links resolve on this page.
 */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Bank',
    links: [
      { label: 'Personal accounts', href: '/#banking' },
      { label: 'Business accounts', href: '/#banking' },
      { label: 'IBANs and top-ups', href: '/#banking' },
      { label: 'Cards', href: '/#banking' },
    ],
  },
  {
    title: 'Spend',
    links: [
      { label: 'Team cards', href: '/#banking' },
      { label: 'Limits and approvals', href: '/#banking' },
      { label: 'Roles', href: '/#banking' },
      { label: 'Activity log', href: '/#banking' },
    ],
  },
  {
    title: 'Send',
    links: [
      { label: 'SEPA', href: '/#international-payments' },
      { label: 'SWIFT', href: '/#international-payments' },
      { label: 'UTEX to UTEX', href: '/#international-payments' },
      { label: '30+ currencies', href: '/#international-payments' },
    ],
  },
  {
    title: 'Get paid',
    links: [
      { label: 'Card payments', href: '/#payments' },
      { label: 'Hosted checkout', href: '/#payments' },
      { label: 'Dashboard', href: '/#payments' },
      { label: 'Settlement', href: '/#payments' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Documentation', href: '/#developers' },
      { label: 'API reference', href: '/#developers' },
      { label: 'Webhooks', href: '/#developers' },
      { label: 'Test mode', href: '/#developers' },
    ],
  },
]

const COMPANY = [
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Contact', href: 'mailto:hello@utexpay.com' },
  { label: 'Log in', href: '/#login' },
]

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Security', href: '/security' },
]

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="sf-inner">
      <div className="sf-top">
        <div className="sf-brand">
          <a className="sf-wordmark" href="/" aria-label="UTEX Pay home">
            <img src="/brand/utex-pay-white.svg" width="886" height="174" alt="UTEX Pay" />
          </a>
          <p className="sf-tagline">The bank that grows with you.</p>
          <p className="sf-support">From your first account to your first payment.</p>
        </div>

        <nav className="sf-columns" aria-label="Footer">
          {COLUMNS.map(({ title, links }) => <div className="sf-column" key={title}>
            <p className="sf-column-title">{title}</p>
            <ul>
              {links.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}
            </ul>
          </div>)}
        </nav>
      </div>

      <div className="sf-bottom">
        {/* Regulatory wording is gated on the EMI / UK-licence answer from UTEX. Placeholder until then. */}
        <p className="sf-regulatory" data-placeholder="true">
          Regulatory and safeguarding line to be confirmed with UTEX: licence, regulator and how customer funds are held.
        </p>
        <div className="sf-meta">
          <p className="sf-copyright">© 2026 UTEX Pay</p>
          <ul className="sf-links">
            {COMPANY.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}
          </ul>
          <ul className="sf-links sf-links--legal">
            {LEGAL.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}
          </ul>
        </div>
      </div>
    </div>
  </footer>
}
