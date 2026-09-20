import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { SectionHeading } from '#/components/SectionHeading'
import './money-insight.css'

/**
 * "See where your money goes" — pillar 4, Understand your money. One hourly volume chart carries the
 * section (direction B from the Paper exploration), then an inventory of what else the dashboard
 * tracks. The chart is a live port of the app's Hero Graph (Figma 3391:2820): the same 24 hours,
 * the same bar geometry, and the same hover reading — the hovered hour glows, every hour after it
 * goes grey, a dashed line drops to a time pill, and a ledger tooltip breaks the hour down. Until
 * someone points at it, the chart is just the chart.
 */

/** Figma bar heights in px (Hero Graph, Volume view), 15:00 → 14:00. 71px = €100. */
const HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
const IN = [78, 96, 110, 128, 149, 138, 114, 75, 39, 18, 2, 2, 2, 2, 11, 21, 39, 64, 82, 96, 107, 114, 103, 107]
const DECLINED = [0, 0, 30, 0, 0, 39, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 27, 0, 0, 0, 32, 0, 0]
const CANCELLED = [0, 18, 0, 28, 21, 14, 20, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21, 0, 13, 32, 18]
const PX_PER_100 = 71

/** Banking cash flow, the last 30 days on the business account (20 Aug → 18 Sep 2026), in euros.
    Shaped like a small business's month, tidied for the page: card revenue every day with quieter
    weekends, three client invoices landing, rent on the 1st, payroll on the 25th, supplier runs
    between. Drawn on the same 71px grid at 71px = €2k. */
const DAY0 = { day: 20, month: 7, weekday: 4 } // Thursday 20 August 2026
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_IN_AUG = 31
const INCOME_EUR = [620, 740, 380, 340, 2400, 860, 910, 780, 1180, 420, 360, 820, 3200, 940, 880, 1020, 460, 390, 900, 1060, 2800, 960, 1140, 480, 410, 1250, 1080, 1160, 980, 1220]
const SPENDING_EUR = [1900, 520, 260, 210, 640, 580, 1500, 470, 690, 320, 240, 720, 610, 1450, 660, 540, 300, 260, 620, 980, 640, 700, 760, 340, 280, 3100, 720, 610, 880, 560]
const EXPENSE: Record<number, string> = { 0: 'Rent', 6: 'Suppliers', 13: 'Suppliers', 19: 'Suppliers', 25: 'Payroll', 28: 'Suppliers' }
const INCOME_NOTE: Record<number, string> = { 4: 'Client invoice', 12: 'Client invoice', 20: 'Client invoice' }
const PX_PER_2K = 71
const INCOME = INCOME_EUR.map((e) => (e / 2000) * PX_PER_2K)
const SPENDING = SPENDING_EUR.map((e) => (e / 2000) * PX_PER_2K)
const dateOf = (i: number) => {
  const d = DAY0.day + i
  const month = d > DAYS_IN_AUG ? DAY0.month + 1 : DAY0.month
  const day = d > DAYS_IN_AUG ? d - DAYS_IN_AUG : d
  return { day, month, weekday: (DAY0.weekday + i) % 7 }
}
const shortDate = (i: number) => { const { day, month } = dateOf(i); return `${day} ${MONTH_SHORT[month]}` }
const longDate = (i: number) => { const { day, month, weekday } = dateOf(i); return `${WEEKDAY[weekday]}, ${day} ${MONTH_LONG[month]}` }

type Mode = 'processing' | 'banking'
type Bar = { h: number; kind: string; hasNext?: boolean }
type Row = { swatch?: string; label: string; value: string }
type Reading = { title: string; rows: Row[]; total: Row; minor: Row[] }
type View = {
  columns: number
  downPx: number
  legend: { swatch: string; label: string }[]
  yLines: { y: number; label: string }[]
  axis: { col: number; label: string }[]
  up: number[]
  down: Bar[][]
  reading: (i: number) => Reading
}

const money = (n: number) => `€${Math.round(n).toLocaleString('en-GB')}`
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

const VIEWS: Record<Mode, View> = {
  processing: {
    columns: HOURS.length,
    downPx: 53,
    legend: [{ swatch: 'in', label: 'Successful' }, { swatch: 'declined', label: 'Declined' }, { swatch: 'cancelled', label: 'Cancelled' }],
    yLines: [{ y: 2, label: '€200' }, { y: 1, label: '€100' }, { y: 0, label: '€0' }],
    axis: HOURS.map((h, i) => ({ col: i, label: hh(h) })).filter((_, i) => i % 2 === 1),
    up: IN,
    down: HOURS.map((_, i) => [
      ...(DECLINED[i] > 0 ? [{ h: DECLINED[i], kind: 'declined', hasNext: CANCELLED[i] > 0 }] : []),
      ...(CANCELLED[i] > 0 ? [{ h: CANCELLED[i], kind: 'cancelled' }] : []),
    ]),
    reading: (i) => {
      const s = IN[i], d = DECLINED[i], c = CANCELLED[i]
      const total = s + d + c
      const hour = HOURS[i]
      const euro = (px: number) => money((px / PX_PER_100) * 100)
      return {
        title: `${hour >= 15 ? 'Yesterday' : 'Today'}, ${hh(hour)} – ${hh((hour + 1) % 24)}`,
        rows: [{ swatch: 'in', label: 'Successful', value: euro(s) }, { swatch: 'declined', label: 'Declined', value: euro(d) }, { swatch: 'cancelled', label: 'Cancelled', value: euro(c) }],
        total: { label: 'Total volume', value: euro(total) },
        minor: [{ label: 'Acceptance rate', value: total ? `${((s / total) * 100).toFixed(1)}%` : '—' }, { label: 'Transactions', value: String(Math.max(1, Math.round(total / 24))) }],
      }
    },
  },
  banking: {
    columns: INCOME.length,
    downPx: 149,
    legend: [{ swatch: 'in', label: 'Income' }, { swatch: 'spending', label: 'Spending' }],
    yLines: [{ y: 2, label: '€4k' }, { y: 1, label: '€2k' }, { y: 0, label: '€0' }, { y: -1, label: '−€2k' }, { y: -2, label: '−€4k' }],
    axis: [0, 5, 10, 15, 20, 25, 29].map((col) => ({ col, label: shortDate(col) })),
    up: INCOME,
    down: SPENDING.map((h) => [{ h, kind: 'spending' }]),
    reading: (i) => {
      const income = INCOME_EUR[i], spending = SPENDING_EUR[i], net = income - spending
      const weekend = dateOf(i).weekday === 0 || dateOf(i).weekday === 6
      return {
        title: longDate(i),
        rows: [{ swatch: 'in', label: 'Income', value: money(income) }, { swatch: 'spending', label: 'Spending', value: money(spending) }],
        total: { label: net >= 0 ? 'Net in' : 'Net out', value: `${net >= 0 ? '+' : '−'}${money(Math.abs(net))}` },
        minor: [
          { label: 'Transactions', value: String(weekend ? Math.max(1, Math.round(spending / 40)) : Math.round((income + spending) / 90) + 3) },
          { label: INCOME_NOTE[i] ? 'Largest in' : 'Largest out', value: INCOME_NOTE[i] ?? EXPENSE[i] ?? (weekend ? 'Cards' : 'Cards and subscriptions') },
        ],
      }
    },
  },
}

const TRACK: { name: string; value: string; kind: string; mark: React.ReactNode }[] = [
  {
    name: 'Acceptance rate', value: '87.6%, up 1.2 pts on yesterday', kind: 'spark',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><path className="mi-draw" pathLength="1" d="M1 22 8 18l7 2 7-9 7 3 7-8 7 3 4-5" stroke="var(--mi-gold)" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  },
  {
    name: 'Decline reasons', value: '176 today, insufficient funds first', kind: 'donut',
    /* Segments carry pathLength=100 so their share is a plain percentage; on hover each one draws
       itself clockwise in turn, the way the app's donut fills in. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><g transform="rotate(-90 24 14)"><circle cx="24" cy="14" r="10" stroke="var(--mi-rule)" strokeWidth="5" /><circle className="mi-seg" cx="24" cy="14" r="10" pathLength={100} stroke="var(--mi-gold)" strokeWidth="5" strokeDasharray="38 100" style={{ '--seg': 38, '--n': 0 } as React.CSSProperties} /><circle className="mi-seg" cx="24" cy="14" r="10" pathLength={100} stroke="var(--mi-gold-2)" strokeWidth="5" strokeDasharray="24 100" strokeDashoffset={-38} style={{ '--seg': 24, '--n': 1 } as React.CSSProperties} /><circle className="mi-seg" cx="24" cy="14" r="10" pathLength={100} stroke="var(--mi-gold-3)" strokeWidth="5" strokeDasharray="18 100" strokeDashoffset={-62} style={{ '--seg': 18, '--n': 2 } as React.CSSProperties} /></g></svg>,
  },
  {
    name: 'Countries', value: 'UK 42%, Germany 23%, NL 12%', kind: 'dots',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><circle className="mi-dot" cx="10" cy="9" r="2.4" fill="var(--mi-gold)" /><circle className="mi-dot" cx="20" cy="6" r="2.4" fill="var(--mi-gold)" /><circle className="mi-dot" cx="26" cy="12" r="2.4" fill="var(--mi-gold-2)" /><circle className="mi-dot" cx="16" cy="16" r="2.4" fill="var(--mi-gold-3)" /><circle className="mi-dot" cx="36" cy="10" r="2.4" fill="var(--mi-dim)" /><circle className="mi-dot" cx="40" cy="20" r="2.4" fill="var(--mi-dim)" /><circle className="mi-dot" cx="8" cy="22" r="2.4" fill="var(--mi-dim)" /><circle className="mi-dot" cx="30" cy="22" r="2.4" fill="var(--mi-dim)" /></svg>,
  },
  {
    name: 'Issuing banks', value: 'Barclays 31%, Revolut 18%', kind: 'rank',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect className="mi-rank" x="2" y="4" width="40" height="4" rx="2" fill="var(--mi-gold)" /><rect className="mi-rank" x="2" y="12" width="24" height="4" rx="2" fill="var(--mi-gold-2)" /><rect className="mi-rank" x="2" y="20" width="12" height="4" rx="2" fill="var(--mi-dim)" /></svg>,
  },
  {
    name: 'Card schemes and methods', value: 'Visa, Mastercard, Apple Pay, iDEAL', kind: 'cards',
    /* A fanned hand: one card upright in the middle, two behind it rotated to either side. On hover
       the hand closes behind the middle card and fans back open with a little overshoot. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect className="mi-card mi-card--l" x="14" y="6" width="20" height="15" rx="3" fill="var(--mi-dim)" /><rect className="mi-card mi-card--r" x="14" y="6" width="20" height="15" rx="3" fill="var(--mi-gold-2)" /><rect className="mi-card mi-card--c" x="14" y="6" width="20" height="15" rx="3" fill="var(--mi-gold)" /><rect className="mi-card mi-card--c mi-chip" x="17" y="10" width="5" height="4" rx="1" fill="#00000040" /></svg>,
  },
  {
    name: 'Refunds and chargebacks', value: '€86 refunded, one case open', kind: 'lines',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><path className="mi-draw" pathLength="1" d="M1 18l7 2 7-3 7 4 7-5 7 3 7-4 4 3" stroke="var(--mi-red)" strokeWidth="1.6" strokeLinejoin="round" /><path className="mi-draw mi-draw--late" pathLength="1" d="M1 10l7-1 7 2 7-3 7 2 7-3 7 2 4-1" stroke="var(--mi-grey)" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  },
  {
    name: 'Settlements', value: 'Tomorrow, into your balance', kind: 'timeline',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><path d="M11 14h6M23 14h6M35 14h5" stroke="var(--mi-rule)" strokeWidth="1.4" /><circle cx="8" cy="14" r="3" fill="var(--mi-dim)" /><circle cx="20" cy="14" r="3" fill="var(--mi-dim)" /><circle cx="32" cy="14" r="3" fill="var(--mi-dim)" /><circle className="mi-settle" cx="44" cy="14" r="3.5" fill="var(--mi-gold)" /></svg>,
  },
  {
    name: 'Banking cash flow', value: 'Income against spending', kind: 'flow',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect className="mi-flow mi-flow--up" x="3" y="4" width="6" height="10" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="3" y="15" width="6" height="6" rx="1.5" fill="var(--mi-bar-deep)" /><rect className="mi-flow mi-flow--up" x="13" y="6" width="6" height="8" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="13" y="15" width="6" height="9" rx="1.5" fill="var(--mi-bar-deep)" /><rect className="mi-flow mi-flow--up" x="23" y="2" width="6" height="12" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="23" y="15" width="6" height="5" rx="1.5" fill="var(--mi-bar-deep)" /><rect className="mi-flow mi-flow--up" x="33" y="5" width="6" height="9" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="33" y="15" width="6" height="7" rx="1.5" fill="var(--mi-bar-deep)" /><rect x="2" y="14" width="44" height="1" fill="var(--mi-rule-strong)" /></svg>,
  },
]

/* Motion is opt-in from the client, the same contract the feature grid uses: `data-motion` enables
   the hidden pre-entry state, `has-entered` plays the entrance once (bars grow, then the inventory
   ticks in). Prerendered HTML and reduced-motion readers see everything. */
function useEntrance(section: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = section.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    root.dataset.motion = ''
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      root.classList.add('has-entered')
      observer.disconnect()
    }, { threshold: .25 })
    observer.observe(root)
    return () => { observer.disconnect(); delete root.dataset.motion }
  }, [section])
}

/* The reading follows the pointer across the plot and disappears when the pointer leaves. The hour
   (line, pill, greying) snaps to the column under the cursor; the ledger itself trails the cursor
   on an eased follower so it glides rather than jumps, and drifts to the other side of the cursor
   near the right edge instead of flipping. The follower writes one CSS variable per frame and never
   re-renders React. */
const TIP_GAP = 22
const SWITCH_MS = 340
/* Every gridline and scale label the chart can ever show. They stay mounted across views so they
   glide to their new position instead of being rebuilt; a view that has no line at that step just
   fades it out. */
const GRID_YS = [2, 1, 0, -1, -2]
const TIP_EASE = .14
function useHover(plot: React.RefObject<HTMLDivElement | null>, chart: React.RefObject<HTMLElement | null>, columns: number) {
  const [index, setIndex] = useState(0)
  const [pointing, setPointing] = useState(false)
  const target = useRef(0)
  const current = useRef(0)
  const frame = useRef(0)
  const wasPointing = useRef(false)

  const tick = useCallback(() => {
    const el = plot.current, fig = chart.current
    if (!el || !fig) { frame.current = 0; return }
    const delta = target.current - current.current
    current.current += delta * TIP_EASE
    fig.style.setProperty('--mi-tip', `${current.current.toFixed(2)}px`)
    if (Math.abs(delta) > .25) frame.current = requestAnimationFrame(tick)
    else { current.current = target.current; fig.style.setProperty('--mi-tip', `${target.current}px`); frame.current = 0 }
  }, [plot, chart])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const el = plot.current, fig = chart.current
    if (!el || !fig) return
    const { left, width } = el.getBoundingClientRect()
    const x = event.clientX - left
    const next = Math.min(columns - 1, Math.max(0, Math.floor((x / width) * columns)))
    const tipWidth = fig.querySelector<HTMLElement>('.mi-tooltip')?.offsetWidth ?? 280
    // Past 60% the ledger sits to the left of the cursor; the follower eases across the switch.
    target.current = x > width * .6 ? x - tipWidth - TIP_GAP : x + TIP_GAP
    if (!wasPointing.current) { current.current = target.current; fig.style.setProperty('--mi-tip', `${target.current}px`) }
    wasPointing.current = true
    setPointing(true)
    setIndex(next)
    if (!frame.current) frame.current = requestAnimationFrame(tick)
  }, [plot, chart, tick, columns])
  const onPointerLeave = useCallback(() => { wasPointing.current = false; setPointing(false) }, [])

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current) }, [])

  return { index, pointing, onPointerMove, onPointerLeave }
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return <div className="mi-toggle" role="group" aria-label="Which side of the account to chart">
    <button type="button" aria-pressed={mode === 'banking'} onClick={() => onChange('banking')}>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 6.5 8 3l6 3.5M3 7v5M7 7v5M9 7v5M13 7v5M2 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Banking
    </button>
    <button type="button" aria-pressed={mode === 'processing'} onClick={() => onChange('processing')}>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="4" width="12" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.3" /><path d="M2 7h12M5 10.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      Processing
    </button>
  </div>
}

export function MoneyInsightSection() {
  const id = useId()
  const section = useRef<HTMLElement>(null)
  const plot = useRef<HTMLDivElement>(null)
  const chart = useRef<HTMLElement>(null)
  const [mode, setMode] = useState<Mode>('processing')
  const [switching, setSwitching] = useState(false)
  const switchTimer = useRef(0)
  /* Switching views: the bars fold down to the baseline, then the new view's bars grow up in
     their place (keys carry the mode so they remount and replay the entrance). Reduced motion
     swaps instantly. */
  const changeMode = useCallback((next: Mode) => {
    if (next === mode || switching) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setMode(next); return }
    setSwitching(true)
    window.clearTimeout(switchTimer.current)
    switchTimer.current = window.setTimeout(() => { setMode(next); setSwitching(false) }, SWITCH_MS)
  }, [mode, switching])
  useEffect(() => () => window.clearTimeout(switchTimer.current), [])
  const view = VIEWS[mode]
  const { index: rawIndex, pointing, onPointerMove, onPointerLeave } = useHover(plot, chart, view.columns)
  useEntrance(section)

  const index = Math.min(rawIndex, view.columns - 1)
  const center = `${((index + .5) / view.columns) * 100}%`
  const r = view.reading(index)
  /* Before anyone points, no column is "current": every bar keeps its colour and nothing is dimmed. */
  const state = (i: number) => !pointing ? '' : i === index ? ' is-hover' : i > index ? ' is-after' : ''

  return <section ref={section} id="insights" className="money-insight" aria-labelledby={`${id}-title`}>
    <div className="mi-inner">
      <SectionHeading className="mi-heading" id={`${id}-title`} eyebrow="Understand your money" description="Card volume hour by hour. Income against spending day by day. Both in the same dashboard, both readable in ten seconds.">
        See where your money goes.<br />At a glance.
      </SectionHeading>

      <figure ref={chart} className={`mi-chart${switching ? ' is-switching' : ''}`} data-mode={mode} data-pointing={pointing || undefined} style={{ '--mi-center': center, '--mi-index': index, '--mi-cols': view.columns, '--mi-down-px': view.downPx } as React.CSSProperties}>
        <figcaption className="mi-sr-only">{mode === 'processing' ? 'Card payment volume over the last 24 hours: successful payments above the line, declined and cancelled below.' : 'Business account cash flow over nine months: income above the line, spending below.'} Move across the chart to read any column.</figcaption>
        <div className="mi-chart-head">
          <div key={mode} className="mi-legend" aria-hidden="true">
            {view.legend.map(({ swatch, label }) => <span key={label}><i className={`mi-swatch mi-swatch--${swatch}`} />{label}</span>)}
          </div>
          <ModeToggle mode={mode} onChange={changeMode} />
        </div>
        <div className="mi-grid-area">
          <div className="mi-ylabels" aria-hidden="true">
            {GRID_YS.map((y) => { const line = view.yLines.find((l) => l.y === y); return <span key={y} className={line ? undefined : 'is-off'} style={{ '--y': y } as React.CSSProperties}>{line && <i key={line.label}>{line.label}</i>}</span> })}
          </div>
          <div ref={plot} className="mi-plot" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
            {GRID_YS.filter((y) => y !== 0).map((y) => <div key={y} className={`mi-gridline${view.yLines.some((l) => l.y === y) ? '' : ' is-off'}`} style={{ '--y': y } as React.CSSProperties} aria-hidden="true" />)}
            <div className="mi-bars mi-bars--up" aria-hidden="true">
              {view.up.map((h, i) => <span key={`${mode}-${i}`} className={`mi-bar${state(i)}${h === 0 ? ' is-empty' : ''}`} style={{ '--h': h, '--i': i } as React.CSSProperties} />)}
            </div>
            <div className="mi-baseline" aria-hidden="true" />
            <div className="mi-bars mi-bars--down" aria-hidden="true">
              {view.down.map((stack, i) => <span key={`${mode}-${i}`} className={`mi-stack${pointing && i > index ? ' is-after' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                {stack.map(({ h, kind, hasNext }, j) => <span key={j} className={`mi-bar mi-bar--${kind}${hasNext ? ' has-next' : ''}${h === 0 ? ' is-empty' : ''}`} style={{ '--h': h } as React.CSSProperties} />)}
              </span>)}
            </div>
            <div className="mi-hover-line" aria-hidden="true" />
            <div className="mi-tooltip" role="status" aria-live="polite" aria-hidden={!pointing}>
              <p className="mi-tooltip-title">{r.title}</p>
              <dl className="mi-tooltip-rows">
                {r.rows.map(({ swatch, label, value }) => <div key={label}><dt><i className={`mi-swatch mi-swatch--${swatch}`} />{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <dl className="mi-tooltip-rows mi-tooltip-rows--total">
                <div className="is-total"><dt>{r.total.label}</dt><dd>{r.total.value}</dd></div>
                {r.minor.map(({ label, value }) => <div key={label} className="is-minor"><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            </div>
          </div>
        </div>
        <div key={mode} className="mi-axis" aria-hidden="true">
          {view.axis.map(({ col, label }) => <span key={label} className={pointing && col > index ? 'is-after' : undefined} style={{ '--col': col } as React.CSSProperties}>{label}</span>)}
          <span className="mi-pill">{mode === 'processing' ? hh(HOURS[index]) : shortDate(index)}</span>
        </div>
      </figure>

      <div className="mi-track">
        <div className="mi-track-head">
          <p className="mi-track-eyebrow">One chart of many. Also on your dashboard</p>
          <p className="mi-track-note">Click any of them and the rest narrows to match.</p>
        </div>
        <ul className="mi-track-list">
          {TRACK.map(({ name, value, kind, mark }, i) => <li key={name} data-kind={kind} tabIndex={0} style={{ '--i': i } as React.CSSProperties}>
            <span className="mi-mark">{mark}</span>
            <span className="mi-track-text"><strong>{name}</strong><span>{value}</span></span>
          </li>)}
        </ul>
      </div>
    </div>
  </section>
}
