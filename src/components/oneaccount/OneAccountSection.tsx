import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import '../section-heading.css'
import './one-account.css'

// Pillar 1 — "One platform, not a stack" (Landing/03-messaging-pillars). Copy is the page-safe
// version: no named competitors, no "worldwide" in the headline.
// Two versions share the header: 01 Ledger is text-only (the section that says in words what the
// hero and tiles show); 02 Accordion, the default, opens one row at a time and shows the matching product
// screen inside it (the Bank / Move / Get paid windows from the dashboard stack, reused). Rows start
// collapsed; hovering a closed row peeks the top edge of its screen, clicking opens it fully.
export type AccountVersion = 'ledger' | 'accordion'

type Screen = { image: string; width: number; height: number; alt: string; focus?: 'top' | 'cards' }
type Detail = { label: string; value: string }
type Verb = { verb: string; text: string; status: string; on?: boolean; screen: Screen; details: Detail[] }

const SCREENS = '/dashboardstack/'
const VERBS: Verb[] = [
  { verb: 'Bank', text: 'Personal and business accounts with their own IBANs, in the currencies you work in. Open one on day one, add another when the business needs it.', status: 'Day one',
    screen: { image: 'bank-window.png', width: 1840, height: 1586, alt: 'UTEX Pay banking dashboard with a €23,787.55 balance, currency accounts, cash flow and a gold Mastercard.' },
    details: [
      { label: 'Accounts', value: 'Personal, business, or both under one login' },
      { label: 'Currencies', value: 'EUR, GBP and USD balances side by side' },
      { label: 'Details', value: 'Own IBAN and BIC for every account' },
    ] },
  // No dedicated Cards export yet: the banking dashboard cropped to its Accounts, Cash Flow and Cards widgets stands in.
  { verb: 'Spend', text: 'Cards for you and your team, with limits, roles and approvals. One activity log, so you know who spent what without asking.', status: 'Day one',
    screen: { image: 'bank-window.png', width: 1840, height: 1586, alt: 'UTEX Pay banking dashboard, the Accounts, Cash Flow and Cards widgets.', focus: 'cards' },
    details: [
      { label: 'Cards', value: 'Physical and virtual, one per person' },
      { label: 'Controls', value: 'Limits, roles and approvals per card' },
      { label: 'Log', value: 'Every card payment in one activity log' },
    ] },
  { verb: 'Send', text: 'SEPA, SWIFT and UTEX-to-UTEX transfers in 30+ currencies. Pay a supplier from the same balance your customers paid into.', status: 'Day one',
    screen: { image: 'move-window.png', width: 1863, height: 1620, alt: 'UTEX Pay accounts screen with euro and pound balances, Send, Request, Deposit and Convert actions, euro account details and recent transactions.' },
    details: [
      { label: 'Rails', value: 'SEPA, SWIFT and UTEX-to-UTEX' },
      { label: 'Currencies', value: '30+, converted inside the account' },
      { label: 'Contacts', value: 'Bank and UTEX recipients, saved once' },
    ] },
  { verb: 'Get paid', text: 'Card payments from your customers, settled into this account, not a second one. Switch it on the day you’re ready. Nothing to migrate.', status: 'Switch on', on: true,
    screen: { image: 'paid-window.png', width: 1865, height: 1666, alt: 'UTEX Pay processing dashboard with an estimated available balance of €32,310.00, payment volume, acceptance rate, a world map and decline reasons.' },
    details: [
      { label: 'Methods', value: 'Visa, Mastercard, Apple Pay, Google Pay, iDEAL' },
      { label: 'Checkout', value: 'Hosted payment page with 3‑D Secure' },
      { label: 'Settlement', value: 'Straight into this account' },
    ] },
]
const STRIP = ['One signup', 'One login', 'One ledger', 'Nothing to migrate']

// Hover peek: the hovered closed row shows the top PEEK px of its window while the other closed rows
// give up padding so the ledger keeps its height. Both values are tweened here, from one clock, so
// that however fast the pointer moves the per-row values always sum to the same total. Independent
// CSS transitions cannot promise that: a row leaving mid-animation restarts from a partial value.
const PEEK = 72
const PEEK_MS = 640
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.4)
type RowMetrics = { pad: number; peek: number }

export function parseAccountVersion(value: unknown): AccountVersion {
  return value === 'ledger' || value === '1' || value === '01' ? 'ledger' : 'accordion'
}

export function OneAccountSection({ initialVersion = 'accordion' }: { initialVersion?: AccountVersion }) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const [version, setVersion] = useState<AccountVersion>(initialVersion)
  // -1 = all collapsed (the default); hovering a closed row peeks the top of its screen.
  const [open, setOpen] = useState(-1)
  const [hovered, setHovered] = useState(-1)
  const ledger = useRef<HTMLDivElement>(null)
  const tween = useRef<{ raf: number; values: RowMetrics[] }>({ raf: 0, values: [] })
  const hoverCapable = useRef(false)
  useEffect(() => { hoverCapable.current = window.matchMedia('(hover: hover)').matches }, [])

  useEffect(() => {
    const root = ledger.current
    if (!root || version !== 'accordion') return
    const rows = [...root.querySelectorAll<HTMLElement>('.oa-row--acc')]
    const base = parseFloat(getComputedStyle(root).getPropertyValue('--oa-row-pad')) || 40
    const state = tween.current
    if (state.values.length !== rows.length) state.values = rows.map(() => ({ pad: base, peek: 0 }))

    const peekRow = hovered >= 0 && hovered !== open ? hovered : -1
    const siblings = rows.map((_, i) => i).filter((i) => i !== open && i !== peekRow)
    // Each sibling gives up its share of PEEK, split across its top and bottom padding.
    const shrink = peekRow >= 0 && siblings.length ? Math.min(PEEK / siblings.length / 2, base - 8) : 0
    const targets: RowMetrics[] = rows.map((_, i) => ({
      pad: peekRow >= 0 && siblings.includes(i) ? base - shrink : base,
      peek: i === peekRow ? PEEK : 0,
    }))
    const from = state.values.map((v) => ({ ...v }))
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    const write = () => rows.forEach((row, i) => {
      row.style.setProperty('--pad', `${state.values[i].pad}px`)
      row.style.setProperty('--peek', `${state.values[i].peek}px`)
    })
    const step = (now: number) => {
      // A frame timestamp can precede `start`; clamp so no value ever goes negative (a negative
      // max-height is invalid and would drop the constraint entirely).
      const p = instant ? 1 : easeOut(Math.min(1, Math.max(0, (now - start) / PEEK_MS)))
      state.values = from.map((f, i) => ({
        pad: Math.max(0, f.pad + (targets[i].pad - f.pad) * p),
        peek: Math.max(0, f.peek + (targets[i].peek - f.peek) * p),
      }))
      write()
      if (p < 1) state.raf = requestAnimationFrame(step)
    }
    cancelAnimationFrame(state.raf)
    state.raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(state.raf)
  }, [hovered, open, version])

  // Every panel state (closed 0, peek 72px, open) is one max-height transition, so the open
  // height has to be a real number: measure each panel's content and expose it as --panel-h.
  useLayoutEffect(() => {
    const root = ledger.current
    if (!root || version !== 'accordion') return
    const panels = [...root.querySelectorAll<HTMLElement>('.oa-panel')]
    const measure = () => {
      for (const panel of panels) {
        const inner = panel.firstElementChild as HTMLElement | null
        if (inner) panel.style.setProperty('--panel-h', `${inner.scrollHeight}px`)
      }
    }
    measure()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(measure)
    for (const panel of panels) if (panel.firstElementChild) ro.observe(panel.firstElementChild)
    return () => ro.disconnect()
  }, [version])

  // `/?account=ledger` opens the text-only version 01 on the main route; accordion is the default.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('account')
    if (requested) setVersion(parseAccountVersion(requested))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { el?.classList.add('is-in'); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { el.classList.add('is-in'); io.disconnect() }
    }, { rootMargin: '0px 0px -18% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return <section id="one-account" ref={ref} className="one-account" data-version={version} aria-labelledby={`${id}-title`}>
    <div className="oa-versions" role="group" aria-label="One account section version">
      <button type="button" aria-label="Ledger" aria-pressed={version === 'ledger'} onClick={() => setVersion('ledger')}><span aria-hidden="true">01</span><span className="oa-version-name" aria-hidden="true">Ledger</span></button>
      <button type="button" aria-label="Accordion with product screens" aria-pressed={version === 'accordion'} onClick={() => setVersion('accordion')}><span aria-hidden="true">02</span><span className="oa-version-name" aria-hidden="true">Accordion</span></button>
    </div>
    <div className="oa-inner">
      <header className="oa-header">
        <div className="oa-heading">
          <p className="section-heading__eyebrow">One account</p>
          <h2 id={`${id}-title`} className="section-heading__title">One takes payments. Another does banking. <span className="oa-accent">UTEX does all of it.</span></h2>
        </div>
        <div className="oa-lead">
          <p>Most businesses run on a bank on one side, a processor on the other and a transfers app in between, stitched together by hand every month.</p>
          <p>UTEX puts money in and money out in the same place, under one login. Open the account first. Add the rest as you grow.</p>
        </div>
      </header>

      {version === 'ledger' ? <ol className="oa-ledger">
        {VERBS.map(({ verb, text, status, on }, i) => <li key={verb} className="oa-row" style={{ '--i': i } as React.CSSProperties}>
          <span className="oa-index" aria-hidden="true">0{i + 1}</span>
          <h3 className="oa-verb">{verb}</h3>
          <p className="oa-text">{text}</p>
          <span className="oa-status" data-on={on || undefined}>
            {on && <span className="oa-toggle" aria-hidden="true" />}{status}
          </span>
        </li>)}
      </ol> : <div className="oa-ledger oa-accordion" ref={ledger}>
        {VERBS.map(({ verb, text, status, on, screen, details }, i) => {
          const isOpen = open === i
          return <div key={verb} className="oa-row oa-row--acc" data-open={isOpen || undefined} style={{ '--i': i } as React.CSSProperties}
            onPointerEnter={(event) => { if (hoverCapable.current && event.pointerType !== 'touch') setHovered(i) }}
            onPointerLeave={() => setHovered((current) => (current === i ? -1 : current))}>
            <h3 className="oa-acc-heading">
              <button type="button" className="oa-row-head" id={`${id}-acc-${i}`} aria-expanded={isOpen} aria-controls={`${id}-panel-${i}`}
                onClick={(event) => {
                  if (!isOpen) { setOpen(i); return }
                  // Closing hands the panel's live height to the tween, so the collapse starts where the open state was.
                  const row = event.currentTarget.closest<HTMLElement>('.oa-row--acc')
                  const panel = row?.querySelector<HTMLElement>('.oa-panel')
                  if (row && panel && tween.current.values[i]) {
                    const height = panel.getBoundingClientRect().height
                    tween.current.values[i].peek = height
                    row.style.setProperty('--peek', `${height}px`)
                  }
                  setOpen(-1)
                }}>
                <span className="oa-index" aria-hidden="true">0{i + 1}</span>
                <span className="oa-verb">{verb}</span>
                <span className="oa-text">{text}</span>
                <span className="oa-status" data-on={on || undefined}>
                  {on && <span className="oa-toggle" aria-hidden="true" />}{status}
                </span>
              </button>
            </h3>
            <div className="oa-panel" id={`${id}-panel-${i}`} role="region" aria-labelledby={`${id}-acc-${i}`} inert={!isOpen} aria-hidden={!isOpen}>
              <div className="oa-panel-inner">
                <dl className="oa-details">
                  {details.map(({ label, value }) => <div key={label} className="oa-detail"><dt>{label}</dt><dd>{value}</dd></div>)}
                </dl>
                <div className="oa-window" data-focus={screen.focus ?? 'top'}>
                  <img className="oa-screen" src={`${SCREENS}${screen.image}`} width={screen.width} height={screen.height} alt={screen.alt} loading="lazy" decoding="async" draggable="false" />
                </div>
              </div>
            </div>
          </div>
        })}
      </div>}

      <p className="oa-strip">{STRIP.map((item, i) => <span key={item}>{i > 0 && <span className="oa-dot" aria-hidden="true">·</span>}{item}</span>)}</p>
    </div>
  </section>
}
