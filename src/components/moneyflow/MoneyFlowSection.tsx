import { useEffect, useId, useRef, useState } from 'react'
import './money-flow.css'

type Transaction = {
  label: string
  amount: string
  icon: 'card' | 'bank' | 'transfer'
}

const INCOMING: Transaction[] = [
  { label: 'Customer payment', amount: '+€240.00', icon: 'card' },
  { label: 'Client transfer', amount: '+€1,500.00', icon: 'bank' },
]

const OUTGOING: Transaction[] = [
  { label: 'Team card', amount: '−€82.50', icon: 'card' },
  { label: 'Supplier transfer', amount: '−€1,200.00', icon: 'transfer' },
]

const BENEFITS = [
  { title: 'Receive', description: 'Card payments and transfers land here.' },
  { title: 'Use', description: 'Pay your team, cards and suppliers.' },
  { title: 'Understand', description: 'Follow money in and out in one ledger.' },
]

// Both card pairs and the account share y=300. Each lower curve mirrors its
// upper curve around that axis; the right-hand pair also mirrors the left.
const CONNECTIONS = [
  { phase: 'in', d: 'M252 244H306Q330 244 330 268V276Q330 300 354 300H410' },
  { phase: 'in', d: 'M252 356H306Q330 356 330 332V324Q330 300 354 300H410' },
  { phase: 'out', d: 'M838 300H894Q918 300 918 276V268Q918 244 942 244H996' },
  { phase: 'out', d: 'M838 300H894Q918 300 918 324V332Q918 356 942 356H996' },
] as const

function Beam({ d, phase }: { d: string; phase: 'in' | 'out' }) {
  return <g className={`money-flow__beam money-flow__beam--${phase}`}>
    <path className="money-flow__beam-halo" d={d} pathLength="1" />
    <path className="money-flow__beam-tail" d={d} pathLength="1" />
    <path className="money-flow__beam-head" d={d} pathLength="1" />
  </g>
}

function TransactionIcon({ icon }: Pick<Transaction, 'icon'>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {icon === 'card' && <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>}
    {icon === 'bank' && <path d="M4 9l8-5 8 5M4 20h16M7 11v6M12 11v6M17 11v6" />}
    {icon === 'transfer' && <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" />}
  </svg>
}

function TransactionLane({ direction, title, transactions }: {
  direction: 'in' | 'out'
  title: string
  transactions: Transaction[]
}) {
  return <div className={`money-flow__lane money-flow__lane--${direction}`}>
    <h3>{title}</h3>
    <ul className="money-flow__transactions">
      {transactions.map(({ label, amount, icon }) => <li className="money-flow__transaction" key={label}>
        <span className="money-flow__icon"><TransactionIcon icon={icon} /></span>
        <span className="money-flow__transaction-label">{label}</span>
        <span className="money-flow__amount">{amount}</span>
      </li>)}
    </ul>
  </div>
}

function Account() {
  return <div className="money-flow__bank">
    <h3>Bank</h3>
    <div className="money-flow__account">
      <div className="money-flow__account-face">
        <span className="money-flow__account-light" aria-hidden="true" />
        <div className="money-flow__account-heading">
          <span>Your UTEX account</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth=".9" aria-hidden="true">
            <path d="M10 2l8 8-8 8-8-8ZM10 6l4 4-4 4-4-4Z" />
          </svg>
        </div>
        <div className="money-flow__balance">
          <p className="money-flow__balance-value"><span className="sr-only">Example balance: </span>€28,142.55</p>
          <p className="money-flow__account-note">One login · One ledger</p>
        </div>
        <ul className="money-flow__currencies" aria-label="Account currencies">
          {['EUR', 'GBP', 'USD'].map((currency) => <li key={currency}>{currency}</li>)}
        </ul>
      </div>
    </div>
    <p className="money-flow__caption">One account, from in to out</p>
  </div>
}

function MobileConnection({ phase }: { phase: 'in' | 'out' }) {
  const gradientId = useId()
  return <svg className="money-flow__mobile-connection" width="24" height="64" viewBox="0 0 24 64" fill="none" aria-hidden="true">
    <defs><linearGradient id={gradientId} x1="12" y1={phase === 'in' ? 8 : 56} x2="12" y2={phase === 'in' ? 56 : 8} gradientUnits="userSpaceOnUse">
      <stop stopColor="#6D5839" stopOpacity=".45" /><stop offset=".45" stopColor="#AE8C52" stopOpacity=".8" /><stop offset="1" stopColor="#DBC298" stopOpacity=".95" />
    </linearGradient></defs>
    <path d="M12 8v48" stroke={`url(#${gradientId})`} strokeWidth="1.7" strokeLinecap="round" />
    <Beam d="M12 8v48" phase={phase} />
  </svg>
}

/** Paper: Flow refinement 01 — Sculpted connections. All amounts are illustrative. */
export function MoneyFlowSection() {
  const id = useId()
  const gradientId = `${id}-flow`
  const stage = useRef<HTMLElement>(null)
  const [flowActive, setFlowActive] = useState(false)

  useEffect(() => {
    const element = stage.current
    if (!element) return
    let visible = false
    const update = () => setFlowActive(visible && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    }, { threshold: .1 })
    observer.observe(element)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return <section className="money-flow" id="why-utex" aria-labelledby={`${id}-heading`}>
    <div className="money-flow__inner">
      <header className="money-flow__intro">
        <h2 id={`${id}-heading`}>One takes payments. Another does banking.<br className="money-flow__desktop-break" /> UTEX does all of it — in one account.</h2>
        <p className="money-flow__description">What your customers pay lands where you pay your team.<br className="money-flow__desktop-break" /> Your money stays in the same place.</p>
      </header>

      <figure ref={stage} className="money-flow__stage" data-flow-active={flowActive} aria-label="Example money flow: customer payments and client transfers enter your UTEX account, which you use for team cards and supplier transfers.">
        <svg className="money-flow__connections" viewBox="0 0 1248 488" fill="none" aria-hidden="true">
          <defs>{(['in', 'out'] as const).map((phase) => <linearGradient key={phase} id={`${gradientId}-${phase}`} x1={phase === 'in' ? 252 : 996} y1="300" x2={phase === 'in' ? 410 : 838} y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6D5839" stopOpacity=".45" /><stop offset=".45" stopColor="#AE8C52" stopOpacity=".8" /><stop offset="1" stopColor="#DBC298" stopOpacity=".95" />
          </linearGradient>)}</defs>
          {CONNECTIONS.map(({ d, phase }) => <path className="money-flow__connection" key={d} d={d} stroke={`url(#${gradientId}-${phase})`} strokeWidth="1.7" strokeLinecap="round" />)}
          {CONNECTIONS.map(({ d, phase }) => <Beam key={d} d={d} phase={phase} />)}
          <circle cx="252" cy="244" r="2.5" fill="#C0A779" /><circle cx="252" cy="356" r="2.5" fill="#C0A779" />
          <circle cx="996" cy="244" r="2.5" fill="#C0A779" /><circle cx="996" cy="356" r="2.5" fill="#C0A779" />
        </svg>
        <TransactionLane direction="in" title="Get paid" transactions={INCOMING} />
        <MobileConnection phase="in" />
        <Account />
        <MobileConnection phase="out" />
        <TransactionLane direction="out" title="Spend & send" transactions={OUTGOING} />
      </figure>

      <ol className="money-flow__benefits">
        {BENEFITS.map(({ title, description }, index) => <li key={title}>
          <span className="money-flow__benefit-number" aria-hidden="true">0{index + 1}</span>
          <div><h3>{title}</h3><p>{description}</p></div>
        </li>)}
      </ol>
    </div>
  </section>
}
