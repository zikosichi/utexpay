import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { CURRENCIES } from '../account-preview-data'
import { Counter } from './Counter'
import './panels.css'

function Building() {
  return <svg width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 28V4h14v24M19 13h8v15M2 28h28M10 28v-6h4v6M9 8h2m3 0h2M9 12h2m3 0h2M9 16h2m3 0h2M22 17h2m-2 4h2" /></svg>
}
// Visa wordmark: Simple Icons (CC0), https://github.com/simple-icons/simple-icons/blob/develop/icons/visa.svg
function CardIcon({ network }: { network: 'Visa' | 'Mastercard' }) {
  return <span className="ah-card-icon" data-network={network} aria-hidden="true">
    {network === 'Visa' ? <svg width="96" height="64" viewBox="-6 0 36 24" fill="none">
      <rect x="-5.5" y=".5" width="35" height="23" rx="3.5" fill="#f5f5f0" stroke="#d4d5d5"/>
      <path fill="#1434cb" d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>
    </svg> : <svg width="96" height="64" viewBox="0 0 36 24" fill="none">
      <rect x=".5" y=".5" width="35" height="23" rx="3.5" fill="#242526" stroke="#60605a"/>
      <circle cx="14" cy="12" r="6" fill="#eb001b"/>
      <circle cx="22" cy="12" r="6" fill="#f79e1b"/>
      <path d="M18 7.528a6 6 0 0 1 0 8.944a6 6 0 0 1 0-8.944" fill="#ff5f00"/>
    </svg>}
  </span>
}
function Detail({ title, amount, status, fields, onBack }: { title: string; amount: string; status: string; fields: [string, string][]; onBack: () => void }) {
  const back = useRef<HTMLButtonElement>(null)
  useEffect(() => { back.current?.focus({ preventScroll: true }) }, [])
  return <div className="ah-detail" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onBack() } }}>
    <button ref={back} type="button" className="ah-back" onClick={onBack}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      Back
    </button>
    <p className="ah-eyebrow">{title}</p>
    <p className="ah-total">{amount}</p>
    <p className="ah-detail-status"><i/>{status}</p>
    <dl className="ah-detail-fields">{fields.map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
  </div>
}
/** Two screens stacked like a native navigation controller: the list slides away to the
    left and dims while the detail pushes in from the right; back reverses it. The screen
    that is out of view is inert and skipped by the reflection painter. */
function Stack({ view, list, detail }: { view: 'list' | 'detail'; list: ReactNode; detail: ReactNode }) {
  const showingDetail = view === 'detail'
  return <div className="ah-stack" data-view={view}>
    <div className="ah-screen ah-screen-list" inert={showingDetail} data-reflect-skip={showingDetail ? 'true' : undefined}>{list}</div>
    <div className="ah-screen ah-screen-detail" inert={!showingDetail} data-reflect-skip={showingDetail ? undefined : 'true'}>{detail}</div>
  </div>
}
/** Keeps the last opened record mounted while the detail screen slides out. */
function useShown(active: number | null) {
  const [shown, setShown] = useState<number | null>(active)
  useEffect(() => {
    if (active !== null) { setShown(active); return }
    const timer = setTimeout(() => setShown(null), 550)
    return () => clearTimeout(timer)
  }, [active])
  return active ?? shown
}
function Panel({ name, children }: { name: string; children: ReactNode }) {
  return <div className="ah-panel"><div className={`ah-glass ah-${name}`}>
    <div className="ah-card-shade" aria-hidden="true" data-reflect-skip="true"><div className="ah-card-shadow"/></div>
    {children}
  </div></div>
}
function Personal() {
  const [selected, setSelected] = useState<number | null>(null)
  const currency = selected === null ? null : CURRENCIES[selected]
  return <Panel name="personal">
    <div className="ah-balance-heading"><p className="ah-eyebrow">{currency?.label ?? 'Total balance'}</p></div>
    <p className="ah-total" aria-live="polite"><Counter value={currency?.value ?? '€28,142.55'} /></p>
    <div className="ah-currencies" role="group" aria-label="Currency accounts">
      {CURRENCIES.map((item,index) => <button type="button" className="ah-currency ah-key" key={item.code} aria-label={`${item.code} account, ${item.value}`} aria-pressed={selected === index} onClick={() => setSelected(selected === index ? null : index)}>
        <span className="ah-currency-label"><span className={`ah-coin ${item.tone}`} aria-hidden="true">{item.symbol}</span><span>{item.code}</span></span>
        <span className="ah-currency-amount">{item.value}</span>
      </button>)}
    </div>
  </Panel>
}
const TRANSFERS = [
  { label: 'Client transfer', amount: '+€4,800.00', date: 'Today, 10:24', direction: 'incoming', reference: 'INV-2026-1048', status: 'Received', account: 'Company EUR account' },
  { label: 'Supplier payment', amount: '−€1,250.00', date: 'Yesterday, 16:17', direction: 'outgoing', reference: 'INV-2026-1047', status: 'Completed', account: 'Company EUR account' },
]
function Business() {
  const [active, setActive] = useState<number | null>(null)
  const shown = useShown(active)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const close = () => { const index = active; setActive(null); requestAnimationFrame(() => { if (index !== null) rows.current[index]?.focus({ preventScroll: true }) }) }
  const transfer = shown === null ? null : TRANSFERS[shown]
  return <Panel name="business">
    <Stack view={active === null ? 'list' : 'detail'}
      list={<>
        <div className="ah-company"><span className="ah-building"><Building/></span><div><p className="ah-eyebrow">Company account</p><p className="ah-company-name">Northstar Trading Ltd</p></div></div>
        <p className="ah-total">€84,250.00</p>
        <div className="ah-transfers">{TRANSFERS.map((transfer,index) => <button type="button" ref={(node) => { rows.current[index] = node }} className="ah-transfer ah-key" key={transfer.reference} onClick={() => setActive(index)} aria-label={`View ${transfer.label.toLowerCase()}, ${transfer.amount}`}>
          <span className={`ah-arrow ${transfer.direction}`} aria-hidden="true">{transfer.direction === 'incoming' ? '↓' : '↑'}</span>
          <span className="ah-transaction"><span>{transfer.label}</span><span className={`ah-value ${index === 0 ? 'ah-positive' : ''}`}>{transfer.amount}</span><small>{transfer.date}</small></span>
        </button>)}</div>
      </>}
      detail={transfer && <Detail title={transfer.label} amount={transfer.amount} status={transfer.status} onBack={close}
        fields={[["Account",transfer.account],["Date",transfer.date],["Reference",transfer.reference]]}/>} />
  </Panel>
}
const PERIODS = {
  Today: { total: '€3,840.00', count: 24, payments: [
    { network: 'Visa', last4: '4242', order: '1048', amount: '+€125.00', time: '10:24' },
    { network: 'Mastercard', last4: '8190', order: '1047', amount: '+€240.00', time: '09:46' },
  ] },
  Yesterday: { total: '€3,260.00', count: 19, payments: [
    { network: 'Visa', last4: '6012', order: '1046', amount: '+€98.00', time: '16:32' },
    { network: 'Mastercard', last4: '8190', order: '1045', amount: '+€185.00', time: '15:18' },
  ] },
} as const
function Segments<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  const index = options.indexOf(value)
  return <div className="ah-segments" role="tablist" aria-label={label} style={{ '--i': index, '--n': options.length } as CSSProperties}>
    {options.map((option) => <button key={option} type="button" role="tab" aria-selected={option === value} onClick={() => onChange(option)}>{option}</button>)}
  </div>
}
function Payments() {
  const [period, setPeriod] = useState<keyof typeof PERIODS>('Today')
  const [active, setActive] = useState<number | null>(null)
  const shown = useShown(active)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const data = PERIODS[period]
  const close = () => { const index = active; setActive(null); requestAnimationFrame(() => { if (index !== null) rows.current[index]?.focus({ preventScroll: true }) }) }
  const payment = shown === null ? null : data.payments[shown]
  return <Panel name="payments">
    <Stack view={active === null ? 'list' : 'detail'}
      list={<>
        <div className="ah-payment-heading"><span>Card payments</span><Segments label="Payment period" options={['Today', 'Yesterday'] as const} value={period} onChange={(value) => { setPeriod(value) }} /></div>
        <p className="ah-total" aria-live="polite"><Counter value={data.total} /></p><p className="ah-subtitle">{data.count} payments received</p>
        <div className="ah-payment-list">{data.payments.map((payment,index) => <button type="button" ref={(node) => { rows.current[index] = node }} className="ah-processing-payment ah-key" key={payment.order} onClick={() => setActive(index)} aria-label={`Open receipt for order ${payment.order}`}>
          <CardIcon network={payment.network}/><span className="ah-transaction"><span className="ah-card-name">{payment.network} •• {payment.last4}</span><span className="ah-value ah-positive">{payment.amount}</span><small>Order #{payment.order}</small><small className="ah-paid"><i aria-hidden="true"/>Paid</small></span>
        </button>)}</div>
      </>}
      detail={payment && <Detail title="Card payment" amount={payment.amount} status="Paid" onBack={close}
        fields={[["Order",`#${payment.order}`],["Card",`${payment.network} •• ${payment.last4}`],["Received",`${period}, ${payment.time}`]]}/>} />
  </Panel>
}
export const PANELS = { personal: Personal, business: Business, payments: Payments }
