import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { SectionHeading } from '#/components/SectionHeading'
import './money-insight.css'
import { BentoTrack, type LedgerItem } from './MoneyInsightBento'
import { GridTrack } from './MoneyInsightGrid'
import { playMark, settleMark } from './markPlay'

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

/* The inventory. `value` is the one-line live reading (placeholder figures), `desc` the two-sentence
   explanation the block version shows. Marks are tiny animated charts, not icon-set glyphs: each
   one replays its own motion on hover. The four Sandro could not read on Sep 18 (countries,
   issuing banks, settlements, cash flow) were redrawn as a pinned globe, a bank facade, coins
   settling and wider in/out bars. */
const TRACK: (LedgerItem & { value: string })[] = [
  {
    name: 'Acceptance rate', value: '87.6%, up 1.2 pts on yesterday', kind: 'spark',
    desc: 'The share of payment attempts that go through, hour by hour. When it moves, you see which country, bank or method moved it.',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><path className="mi-draw" pathLength="1" d="M1 22 8 18l7 2 7-9 7 3 7-8 7 3 4-5" stroke="var(--mi-gold)" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  },
  {
    name: 'Decline reasons', value: '176 today, insufficient funds first', kind: 'donut', piece: 'donut',
    desc: 'Every failed payment carries the reason the bank gave. Insufficient funds, expired card, suspected fraud: grouped, counted and ranked, so you know what to fix.',
    /* Segments carry pathLength=100 so their share is a plain percentage; on hover each one draws
       itself clockwise in turn, the way the app's donut fills in. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><g transform="rotate(-90 24 14)"><circle cx="24" cy="14" r="10" stroke="var(--mi-rule)" strokeWidth="5" /><circle className="mi-seg" cx="24" cy="14" r="10" pathLength={100} stroke="var(--mi-gold)" strokeWidth="5" strokeDasharray="38 100" style={{ '--seg': 38, '--n': 0 } as React.CSSProperties} /><circle className="mi-seg" cx="24" cy="14" r="10" pathLength={100} stroke="var(--mi-gold-2)" strokeWidth="5" strokeDasharray="24 100" strokeDashoffset={-38} style={{ '--seg': 24, '--n': 1 } as React.CSSProperties} /><circle className="mi-seg" cx="24" cy="14" r="10" pathLength={100} stroke="var(--mi-gold-3)" strokeWidth="5" strokeDasharray="18 100" strokeDashoffset={-62} style={{ '--seg': 18, '--n': 2 } as React.CSSProperties} /></g></svg>,
  },
  {
    name: 'Countries', value: 'UK 42%, Germany 23%, NL 12%', kind: 'globe', piece: 'conv',
    desc: 'Where your customers pay from, by volume and by acceptance. Spot a market that is growing, or one where more payments fail than they should.',
    /* A globe: outer circle and meridian draw themselves, then three pins pop onto it. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><circle className="mi-draw" pathLength="1" cx="24" cy="14" r="12" stroke="var(--mi-rule-strong)" strokeWidth="1.4" /><ellipse className="mi-draw mi-draw--late" pathLength="1" cx="24" cy="14" rx="5.5" ry="12" stroke="var(--mi-rule-strong)" strokeWidth="1.2" /><path className="mi-draw mi-draw--late" pathLength="1" d="M12.5 14h23M14.8 8.5h18.4M14.8 19.5h18.4" stroke="var(--mi-rule-strong)" strokeWidth="1.2" /><circle className="mi-pin" cx="19" cy="9.5" r="2.6" fill="var(--mi-gold)" /><circle className="mi-pin" cx="28.5" cy="12" r="2.6" fill="var(--mi-gold-2)" /><circle className="mi-pin" cx="22" cy="18.5" r="2.6" fill="var(--mi-gold-3)" /></svg>,
  },
  {
    name: 'Issuing banks', value: 'Barclays 31%, Revolut 18%', kind: 'bank', piece: 'banks',
    desc: 'Which banks your customers hold their cards with, and how each one treats your payments. When one bank starts declining, you see it that day.',
    /* A bank facade: the columns rise one after another, then the pediment settles on top. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect x="5" y="23.5" width="38" height="2.5" rx="1" fill="var(--mi-dim)" /><rect className="mi-col" x="10" y="11" width="4" height="11" rx="1" fill="var(--mi-gold)" /><rect className="mi-col" x="18" y="11" width="4" height="11" rx="1" fill="var(--mi-gold)" /><rect className="mi-col" x="26" y="11" width="4" height="11" rx="1" fill="var(--mi-gold)" /><rect className="mi-col" x="34" y="11" width="4" height="11" rx="1" fill="var(--mi-gold)" /><path className="mi-roof" d="M24 1.5 43 8.5H5L24 1.5Z" fill="var(--mi-gold-2)" /></svg>,
  },
  {
    name: 'Card schemes and methods', value: 'Visa, Mastercard, Apple Pay, iDEAL', kind: 'cards',
    desc: 'Visa, Mastercard, Apple Pay, Google Pay, iDEAL and the rest, side by side. See what your customers reach for and where each method wins or loses.',
    /* A fanned hand: one card upright in the middle, two behind it rotated to either side. On hover
       the hand closes behind the middle card and fans back open with a little overshoot. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect className="mi-card mi-card--l" x="14" y="6" width="20" height="15" rx="3" fill="var(--mi-dim)" /><rect className="mi-card mi-card--r" x="14" y="6" width="20" height="15" rx="3" fill="var(--mi-gold-2)" /><rect className="mi-card mi-card--c" x="14" y="6" width="20" height="15" rx="3" fill="var(--mi-gold)" /><rect className="mi-card mi-card--c mi-chip" x="17" y="10" width="5" height="4" rx="1" fill="#00000040" /></svg>,
  },
  {
    name: 'Refunds and chargebacks', value: '€86 refunded, one case open', kind: 'lines',
    desc: 'Refunds you issued and disputes your customers raised, tracked against volume. Each case shows its deadline, its evidence and where it stands.',
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><path className="mi-draw" pathLength="1" d="M1 18l7 2 7-3 7 4 7-5 7 3 7-4 4 3" stroke="var(--mi-red)" strokeWidth="1.6" strokeLinejoin="round" /><path className="mi-draw mi-draw--late" pathLength="1" d="M1 10l7-1 7 2 7-3 7 2 7-3 7 2 4-1" stroke="var(--mi-grey)" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  },
  {
    name: 'Settlements', value: 'Tomorrow, into your balance', kind: 'coins', piece: 'settle',
    desc: 'When today’s card payments land in your balance, and which payments make up the amount. Every settlement reconciles back to its transactions.',
    /* Money arriving: an arrow draws in from the left and three coins drop onto the stack. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><path className="mi-draw" pathLength="1" d="M2 5h12c4.4 0 8 3.6 8 8v7" stroke="var(--mi-gold)" strokeWidth="1.6" strokeLinecap="round" /><path className="mi-draw mi-draw--late" pathLength="1" d="m17.5 16 4.5 4.5 4.5-4.5" stroke="var(--mi-gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><rect className="mi-coin" x="31" y="20" width="15" height="4.5" rx="2.25" fill="var(--mi-gold-3)" /><rect className="mi-coin" x="31" y="14.5" width="15" height="4.5" rx="2.25" fill="var(--mi-gold-2)" /><rect className="mi-coin" x="31" y="9" width="15" height="4.5" rx="2.25" fill="var(--mi-gold)" /></svg>,
  },
  {
    name: 'Banking cash flow', value: 'Income against spending', kind: 'flow',
    desc: 'Money in against money out, day by day, across every account and currency. Rent, payroll and client invoices fall where you expect them to.',
    /* Three in/out pairs on a baseline, with an arrow at each end of the flow. */
    mark: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect className="mi-flow mi-flow--up" x="9" y="4" width="8" height="10" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="9" y="15" width="8" height="5" rx="1.5" fill="var(--mi-bar-deep)" /><rect className="mi-flow mi-flow--up" x="20" y="7" width="8" height="7" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="20" y="15" width="8" height="8" rx="1.5" fill="var(--mi-bar-deep)" /><rect className="mi-flow mi-flow--up" x="31" y="2" width="8" height="12" rx="1.5" fill="var(--mi-bar)" /><rect className="mi-flow mi-flow--down" x="31" y="15" width="8" height="4" rx="1.5" fill="var(--mi-bar-deep)" /><rect x="7" y="14" width="34" height="1" fill="var(--mi-rule-strong)" /><path className="mi-arrow mi-arrow--in" d="M3 12V4M.5 6.5 3 4l2.5 2.5" stroke="var(--mi-bar)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path className="mi-arrow mi-arrow--out" d="M45 16v8m-2.5-2.5L45 24l2.5-2.5" stroke="var(--mi-bar-deep)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
]

/* Two directions for the inventory, switchable from the bar on the right like the other sections:
   01 the original two-row list, 02 a 4×2 grid of bordered blocks with a paragraph each (Sep 18
   review: the page needs more text; Arseny asked for the captions to become small paragraphs). */
type Version = 'inventory' | 'blocks' | 'bento' | 'grid' | 'grouped' | 'rows'
const VERSIONS: { value: Version; label: string }[] = [{ value: 'inventory', label: 'Inventory' }, { value: 'blocks', label: 'Blocks' }, { value: 'bento', label: 'Bento' }, { value: 'grid', label: 'Hairline grid' }, { value: 'grouped', label: 'Grouped, no grid' }, { value: 'rows', label: 'Rows' }]
const DEFAULT_VERSION: Version = 'rows'

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
  const [version, setVersion] = useState<Version>(DEFAULT_VERSION)
  const [switching, setSwitching] = useState(false)
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('insights')
    if (requested === 'inventory' || requested === 'blocks' || requested === 'bento' || requested === 'grid' || requested === 'grouped' || requested === 'rows') setVersion(requested)
  }, [])
  const changeVersion = useCallback((next: Version) => {
    setVersion(next)
    const url = new URL(window.location.href)
    url.searchParams.set('insights', next)
    window.history.replaceState(window.history.state, '', url)
  }, [])
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

  const blocks = version === 'blocks'
  return <section ref={section} id="insights" className="money-insight" data-version={version} aria-labelledby={`${id}-title`}>
    <div className="mi-version-bar">
      <div className="mi-versions" role="group" aria-label="Inventory visual direction">
        {VERSIONS.map(({ value, label }, i) => <button type="button" key={value} aria-label={`${label} — Version ${i + 1}`}
          aria-pressed={version === value} aria-controls={`${id}-track`} onClick={() => changeVersion(value)}>
          <span aria-hidden="true">0{i + 1}</span><span className="mi-version-name" aria-hidden="true">{label}</span>
        </button>)}
      </div>
    </div>
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

      {version === 'bento' ? <BentoTrack items={TRACK} id={`${id}-track`} /> : version === 'grid' ? <GridTrack items={TRACK} id={`${id}-track`} /> : version === 'grouped' ? <GridTrack items={TRACK} id={`${id}-track`} mode="plain" /> : version === 'rows' ? <GridTrack items={TRACK} id={`${id}-track`} mode="rows" /> : <div className={`mi-track${blocks ? ' mi-track--blocks' : ''}`} id={`${id}-track`}>
        {blocks ? <div className="mi-track-head mi-track-head--blocks">
          <p className="mi-track-eyebrow">Also on your dashboard</p>
          <h3 className="mi-track-title">Eight more things it can tell you.</h3>
          <p className="mi-track-lead">Each one is a view of the same payments. Click any of them and the chart, and the rest, narrow to match.</p>
        </div> : <div className="mi-track-head">
          <p className="mi-track-eyebrow">One chart of many. Also on your dashboard</p>
          <p className="mi-track-note">Click any of them and the rest narrows to match.</p>
        </div>}
        <ul className={`mi-track-list${blocks ? ' mi-track-list--blocks' : ''}`}>
          {TRACK.map(({ name, value, kind, desc, mark }, i) => <li key={name} data-kind={kind} tabIndex={0} style={{ '--i': i } as React.CSSProperties} onPointerEnter={playMark} onAnimationEnd={settleMark}>
            <span className="mi-mark">{mark}</span>
            <span className="mi-track-text">
              <strong>{name}</strong>
              <span className="mi-track-value">{value}</span>
              {blocks && <p className="mi-track-desc">{desc}</p>}
            </span>
          </li>)}
        </ul>
      </div>}
    </div>
  </section>
}
