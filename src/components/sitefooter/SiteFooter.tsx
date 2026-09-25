import './site-footer.css'

/**
 * Three short columns: what the product is (each link lands on the section of this page that shows
 * it), then the support and company pages a small EMI site actually has. Legal sits in the bottom row with the licence
 * line. Pages that don't exist yet use hash anchors so the prerender crawler doesn't follow them
 * into a 404, which fails the build on Vercel (`failOnError`).
 */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Personal account', href: '/#banking' },
      { label: 'Business account', href: '/#one-account' },
      { label: 'Cards', href: '/#banking' },
      { label: 'International transfers', href: '/#international-payments' },
      { label: 'Accept payments', href: '/#insights' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help and FAQs', href: '/#questions' },
      { label: 'Developers', href: '/#developers' },
      { label: 'Security', href: '/#security' },
      { label: 'System status', href: '/#status' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About UTEX', href: '/#about' },
      { label: 'Careers', href: '/#careers' },
      { label: 'Contact', href: 'mailto:hello@utexpay.com' },
    ],
  },
]

// Complaints is required of a regulated EMI, cookies of any EU/UK site; both are cheap to add.
const LEGAL = [
  { label: 'Privacy', href: '/#privacy' },
  { label: 'Terms', href: '/#terms' },
  { label: 'Cookies', href: '/#cookies' },
  { label: 'Complaints', href: '/#complaints' },
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
          <ul className="sf-links sf-links--legal">
            {LEGAL.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}
          </ul>
        </div>
      </div>
    </div>
  </footer>
}
