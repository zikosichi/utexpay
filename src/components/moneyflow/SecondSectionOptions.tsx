import { useState } from 'react'
import { DashboardStackSection } from '#/components/dashboardstack/DashboardStackSection'
import { FeatureGridSection } from '#/components/featuregrid/FeatureGridSection'
import './second-section-options.css'

const OPTIONS = [
  { id: 'convergence', number: '01', label: 'Convergence' },
  { id: 'account-os', number: '02', label: 'Account OS' },
  { id: 'card-dock', number: '03', label: 'Card dock' },
  { id: 'dashboard-stack', number: '04', label: 'Dashboard stack' },
  { id: 'feature-grid', number: '05', label: 'Feature grid' },
] as const

type OptionId = (typeof OPTIONS)[number]['id']

export function parseSectionOption(value: unknown): OptionId {
  return OPTIONS.find((option) => option.id === value)?.id ?? 'convergence'
}

function UtExMark() {
  return <svg viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <path d="M17 3 31 17 17 31 3 17 17 3Z" stroke="currentColor" />
    <path d="m17 10 7 7-7 7-7-7 7-7Z" stroke="currentColor" />
  </svg>
}

function HubPoint({ className, eyebrow, title, copy }: {
  className: string
  eyebrow: string
  title: string
  copy: string
}) {
  return <div className={`card-hub__point ${className}`}>
    <span>{eyebrow}</span>
    <h3>{title}</h3>
    <p>{copy}</p>
  </div>
}

export function BronzeCardSection() {
  return <section className="card-hub" id="card-hub" aria-labelledby="card-hub-heading">
    <div className="card-hub__inner">
      <header className="card-hub__intro">
        <span className="section-kicker">One account · four directions</span>
        <h2 id="card-hub-heading">One card at the centre<br />of how you move money.</h2>
        <p>Get paid, hold funds, spend and send—without moving money between products.</p>
      </header>

      <div className="card-hub__stage" aria-label="A UTEX card connects banking, spending, transfers and incoming payments.">
        <div className="card-hub__rings" aria-hidden="true">
          <span /><span /><i className="card-hub__runner card-hub__runner--one" /><i className="card-hub__runner card-hub__runner--two" />
        </div>
        <HubPoint className="card-hub__point--bank" eyebrow="Bank" title="€28,142.55" copy="EUR · GBP · USD" />
        <HubPoint className="card-hub__point--spend" eyebrow="Spend" title="Team cards" copy="Limits and approvals" />
        <HubPoint className="card-hub__point--send" eyebrow="Send" title="Global transfers" copy="SEPA · SWIFT · UTEX" />
        <HubPoint className="card-hub__point--paid" eyebrow="Get paid" title="Card payments" copy="Settled to this account" />

        <div className="card-hub__core">
          <div className="card-hub__account-disc"><UtExMark /><span>Your UTEX account</span></div>
          <div className="card-hub__card-wrap">
            <span className="card-hub__card-glow" aria-hidden="true" />
            <img src="/utex-card.png" alt="UTEX Pay gold card" />
            <span className="card-hub__card-shine" aria-hidden="true" />
          </div>
        </div>
      </div>

      <p className="card-hub__footnote">The same balance, whether money is arriving or leaving.</p>
    </div>
  </section>
}

const LEDGER_ROWS = [
  { type: 'Card payment', name: 'Studio Pro', amount: '+€240.00', tone: 'positive' },
  { type: 'Salary', name: 'Sofia Miller', amount: '−€2,400.00', tone: 'negative' },
  { type: 'Top-up', name: 'Visa •••• 4242', amount: '+€500.00', tone: 'positive' },
] as const

export function LivingLedgerSection() {
  return <section className="living-ledger" id="living-ledger" aria-labelledby="living-ledger-heading">
    <div className="living-ledger__inner">
      <div className="living-ledger__copy">
        <span className="section-kicker">Money in and money out</span>
        <h2 id="living-ledger-heading">One takes payments.<br />Another does banking.<br /><strong>UTEX does both.</strong></h2>
        <p>What your customers pay lands where you pay your team. Money in and money out, under one login.</p>
        <span className="living-ledger__rule"><i /> One login. One ledger. One place.</span>
      </div>

      <figure className="living-ledger__visual" aria-label="A unified UTEX ledger showing payments received and banking transactions in one account.">
        <div className="living-ledger__back-card" aria-hidden="true">
          <span>UTEX PAY</span><UtExMark />
        </div>
        <div className="living-ledger__sheet">
          <header>
            <div><span>Your UTEX account</span><strong>€28,142.55</strong></div>
            <span className="living-ledger__currencies">EUR · GBP · USD</span>
          </header>
          <ol>
            {LEDGER_ROWS.map((row, index) => <li key={row.name}>
              <span className="living-ledger__index">0{index + 1}</span>
              <div><strong>{row.type} · {row.name}</strong><span>{row.type === 'Card payment' ? 'Money in from your customer' : row.type === 'Salary' ? 'Money out to your team' : 'Money in from your card'}</span></div>
              <b className={`living-ledger__amount living-ledger__amount--${row.tone}`}>{row.amount}</b>
            </li>)}
          </ol>
          <footer><span>Payments and banking</span><strong><i /> Connected</strong></footer>
        </div>
        <figcaption>Personal · Business · Payments</figcaption>
      </figure>

      <ul className="living-ledger__benefits">
        <li><b>Bank</b><span>Accounts, IBANs and cards for your team.</span></li>
        <li><b>Spend</b><span>Limits, roles and approvals in the same place.</span></li>
        <li><b>Send</b><span>SEPA and SWIFT transfers in 50+ currencies.</span></li>
        <li><b>Get paid</b><span>Card payments settle to the same account.</span></li>
      </ul>
    </div>
  </section>
}

function StreamIcon({ type }: { type: 'payment' | 'bank' | 'card' | 'send' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'payment' && <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>}
    {type === 'bank' && <path d="m4 9 8-5 8 5M4 20h16M7 11v6M12 11v6M17 11v6" />}
    {type === 'card' && <><rect x="5" y="2.8" width="14" height="18.4" rx="2.5" /><path d="M8 8h8M8 16h4" /></>}
    {type === 'send' && <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" />}
  </svg>
}

export function ConvergenceSection() {
  return <section className="convergence" id="convergence" aria-labelledby="convergence-heading">
    <div className="convergence__inner">
      <header className="convergence__intro">
        <span className="section-kicker">Not connected. Built together.</span>
        <h2 id="convergence-heading">Payments and banking,<br /><strong>finally in the same system.</strong></h2>
        <p>Money arrives through UTEX Payments and is ready to use in your UTEX account.</p>
      </header>

      <figure className="convergence__stage" aria-label="Payments and banking converge inside one UTEX account.">
        <div className="convergence__beam convergence__beam--left" aria-hidden="true"><i /></div>
        <div className="convergence__beam convergence__beam--right" aria-hidden="true"><i /></div>

        <article className="convergence__wing convergence__wing--payments">
          <header><span>01</span><strong>Payments</strong><i>Live</i></header>
          <div className="convergence__metric"><span>Processed today</span><strong>€18,420.00</strong></div>
          <div className="convergence__chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="convergence__event"><StreamIcon type="payment" /><span>Card payment</span><b>+€240.00</b></div>
        </article>

        <div className="convergence__core">
          <div className="convergence__core-cap"><UtExMark /></div>
          <div className="convergence__core-face">
            <span>Your UTEX account</span>
            <strong>€28,142.55</strong>
            <small>One balance · Ready to use</small>
            <div><b>EUR</b><b>GBP</b><b>USD</b></div>
          </div>
          <span className="convergence__core-light" aria-hidden="true" />
        </div>

        <article className="convergence__wing convergence__wing--banking">
          <header><span>02</span><strong>Banking</strong><i>Ready</i></header>
          <div className="convergence__account-row"><StreamIcon type="bank" /><div><span>Business account</span><b>GB29 UTEX 8413 1643</b></div></div>
          <div className="convergence__account-row"><StreamIcon type="card" /><div><span>Team cards</span><b>12 active · 3 virtual</b></div></div>
          <div className="convergence__event"><StreamIcon type="send" /><span>Supplier transfer</span><b>−€1,200.00</b></div>
        </article>
      </figure>

      <ol className="convergence__steps">
        <li><span>01</span><b>Accept</b><p>Take card payments online.</p></li>
        <li><span>02</span><b>Settle</b><p>Funds land in your account.</p></li>
        <li><span>03</span><b>Use</b><p>Pay, transfer or issue cards.</p></li>
      </ol>
    </div>
  </section>
}

const OS_ROWS = [
  { label: 'Card payment · Northstar', time: '12:42', amount: '+€620.00', positive: true },
  { label: 'Team card · Product', time: '11:18', amount: '−€84.50', positive: false },
  { label: 'Client transfer · Orbital', time: '09:06', amount: '+€2,400.00', positive: true },
] as const

export function AccountOSSection() {
  return <section className="account-os" id="account-os" aria-labelledby="account-os-heading">
    <div className="account-os__inner">
      <header className="account-os__intro">
        <span className="section-kicker">The account is the product</span>
        <h2 id="account-os-heading">Run the money side<br />of your business <strong>here.</strong></h2>
        <p>Payments, balances, team cards and transfers—one live operating surface.</p>
      </header>

      <figure className="account-os__scene" aria-label="A UTEX account operating surface combining payments, balances, cards and transfers.">
        <div className="account-os__shadow" aria-hidden="true" />
        <div className="account-os__rail account-os__rail--payments" aria-hidden="true"><span>PAYMENTS</span><i /></div>
        <div className="account-os__rail account-os__rail--banking" aria-hidden="true"><span>BANKING</span><i /></div>
        <div className="account-os__surface">
          <header>
            <div className="account-os__brand"><UtExMark /><b>UTEX</b><span>Account</span></div>
            <nav aria-label="Account areas"><b>Overview</b><span>Payments</span><span>Cards</span><span>Transfers</span></nav>
            <span className="account-os__status"><i /> Live</span>
          </header>
          <div className="account-os__body">
            <aside>
              <span>Total balance</span>
              <strong>€28,142.55</strong>
              <small>Across 3 currencies</small>
              <div className="account-os__currency"><b>EUR</b><span>€24,820.10</span></div>
              <div className="account-os__currency"><b>GBP</b><span>£1,840.00</span></div>
              <div className="account-os__currency"><b>USD</b><span>$1,620.40</span></div>
            </aside>
            <div className="account-os__activity">
              <div className="account-os__activity-head"><b>One activity feed</b><span>Money in + money out</span></div>
              <ol>{OS_ROWS.map((row) => <li key={row.label}>
                <span className={`account-os__dot ${row.positive ? 'account-os__dot--in' : ''}`} />
                <div><b>{row.label}</b><span>{row.time}</span></div>
                <strong className={row.positive ? 'account-os__amount--in' : ''}>{row.amount}</strong>
              </li>)}</ol>
            </div>
          </div>
          <footer><span>One login</span><span>One ledger</span><b>Everything reconciled</b></footer>
        </div>
        <div className="account-os__float account-os__float--settled"><span>Settled today</span><strong>€8,420</strong><small>142 payments</small></div>
        <div className="account-os__float account-os__float--cards"><span>Team cards</span><strong>12 active</strong><small>€2,180 spent</small></div>
      </figure>
    </div>
  </section>
}

export function CardDockSection() {
  return <section className="card-dock" id="card-dock" aria-labelledby="card-dock-heading">
    <div className="card-dock__inner">
      <header className="card-dock__intro">
        <span className="section-kicker">One account. Ready for everything.</span>
        <h2 id="card-dock-heading">Get paid into the account<br />your business already runs on.</h2>
        <p>Payments arrive. Your card, team and transfers are ready.</p>
      </header>

      <figure className="card-dock__stage" aria-label="A UTEX card docks into the same account that receives customer payments and sends business transfers.">
        <div className="card-dock__incoming">
          <span>Money in</span>
          <div><StreamIcon type="payment" /><p>Customer payment<b>+€240.00</b></p></div>
          <div><StreamIcon type="bank" /><p>Client transfer<b>+€1,500.00</b></p></div>
        </div>

        <div className="card-dock__machine">
          <span className="card-dock__halo" aria-hidden="true" />
          <div className="card-dock__card">
            <img src="/utex-card.png" alt="UTEX Pay gold card" />
            <i aria-hidden="true" />
          </div>
          <div className="card-dock__slot" aria-hidden="true"><i /></div>
          <div className="card-dock__account">
            <div><span>Your UTEX account</span><UtExMark /></div>
            <strong>€28,142.55</strong>
            <small>EUR · GBP · USD</small>
          </div>
          <div className="card-dock__base" aria-hidden="true"><span /><span /><span /></div>
        </div>

        <div className="card-dock__outgoing">
          <span>Ready to use</span>
          <div><StreamIcon type="card" /><p>Team cards<b>12 active</b></p></div>
          <div><StreamIcon type="send" /><p>Global transfers<b>50+ currencies</b></p></div>
        </div>
      </figure>

      <p className="card-dock__caption"><i /> No transfers between products. No second balance to reconcile.</p>
    </div>
  </section>
}

export function SecondSectionOptions({ initialOption = 'convergence' }: { initialOption?: OptionId }) {
  const [active, setActive] = useState<OptionId>(initialOption)

  return <div className="section-options">
    <nav className="section-options__bar" aria-label="Second-section design options">
      <div>
        <span className="section-options__eyebrow">Section 02 · Exploration round 02</span>
        <strong>New directions</strong>
      </div>
      <div className="section-options__tabs" role="tablist" aria-label="Design directions">
        {OPTIONS.map((option) => <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={active === option.id}
          onClick={() => setActive(option.id)}
        ><span>{option.number}</span>{option.label}</button>)}
      </div>
    </nav>

    <div className="section-options__canvas" role="tabpanel">
      {active === 'convergence' && <ConvergenceSection />}
      {active === 'account-os' && <AccountOSSection />}
      {active === 'card-dock' && <CardDockSection />}
      {active === 'dashboard-stack' && <DashboardStackSection />}
      {active === 'feature-grid' && <FeatureGridSection />}
    </div>
  </div>
}
