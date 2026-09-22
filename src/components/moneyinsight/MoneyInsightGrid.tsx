import type { LedgerItem } from './MoneyInsightBento'
import './money-insight-grid.css'
import { playMark, settleMark } from './markPlay'

/* Version 04 (lines) and 05 (plain) of the inventory: a hairline grid, or the same grouping without it. No fills, no cards — the eight views sit in cells
   whose shared 1px rules run on past the grid and cross, with a tick at every intersection, like
   drafting paper. The content is grouped into the three questions the dashboard answers, one
   column each, and every item is cut to its mark, its name and one sentence. */

const GROUPS: { question: string; items: [string, string][] }[] = [
  { question: 'Who pays you', items: [
    ['Countries', 'Where your customers pay from, and how well payments go through there.'],
    ['Issuing banks', 'Which banks your customers’ cards come from, and how each one treats you.'],
    ['Card schemes and methods', 'Visa, Mastercard, Apple Pay, iDEAL and the rest, side by side.'],
  ] },
  { question: 'Why payments fail', items: [
    ['Acceptance rate', 'The share of attempts that go through, hour by hour.'],
    ['Decline reasons', 'Every failed payment with the reason the bank gave, ranked.'],
    ['Refunds and chargebacks', 'Refunds you issued and disputes raised, each with its deadline.'],
  ] },
  { question: 'When money lands', items: [
    ['Settlements', 'When today’s payments reach your balance, down to the transaction.'],
    ['Payouts', 'When settled money moves on to your own bank account, and what each one cost.'],
    ['Banking cash flow', 'Money in against money out, across every account and currency.'],
  ] },
]

/* The ninth item has no row in the chart section's inventory, so its mark lives here: the
   settlements stack in reverse — coins lift off one by one and an arrow carries them out. */
const EXTRA_MARKS: Record<string, React.ReactNode> = {
  Payouts: <svg viewBox="0 0 48 28" fill="none" aria-hidden="true"><rect className="mi-coin-out" x="2" y="20" width="15" height="4.5" rx="2.25" fill="var(--mi-gold-3)" /><rect className="mi-coin-out" x="2" y="14.5" width="15" height="4.5" rx="2.25" fill="var(--mi-gold-2)" /><rect className="mi-coin-out" x="2" y="9" width="15" height="4.5" rx="2.25" fill="var(--mi-gold)" /><path className="mi-draw" pathLength="1" d="M22 22v-9c0-4.4 3.6-8 8-8h14" stroke="var(--mi-gold)" strokeWidth="1.6" strokeLinecap="round" /><path className="mi-draw mi-draw--late" pathLength="1" d="m40 .5 4.5 4.5L40 9.5" stroke="var(--mi-gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
}
const COLS = GROUPS.length
const ROWS = 1 + Math.max(...GROUPS.map((g) => g.items.length))

export type GridMode = 'lines' | 'plain' | 'rows'

export function GridTrack({ items, id, mode = 'lines' }: { items: LedgerItem[]; id: string; mode?: GridMode }) {
  const marks = new Map<string, React.ReactNode>([...Object.entries(EXTRA_MARKS), ...items.map((item) => [item.name, item.mark] as const)])
  const lines = mode === 'lines'
  let n = 0
  if (mode === 'rows') {
    /* One grid, filled column by column, so the three item rows line up across the questions and a
       rule can run the full width above each row. Cells carry the rules; the column gap is padding. */
    const depth = Math.max(...GROUPS.map((g) => g.items.length))
    return <div className="mi-track mi-track--grid mi-track--rows" id={id}>
      <div className="mi-track-head mi-track-head--blocks">
        <p className="mi-track-eyebrow">Also on your dashboard</p>
        <h3 className="mi-track-title">Three questions it answers.<br />Nine ways it answers them.</h3>
        <p className="mi-track-lead">Every view below is cut from the same payments as the chart. Point at any of them and the rest narrow to match.</p>
      </div>
      <div className="mig mig--rows" style={{ '--cols': COLS, '--depth': depth } as React.CSSProperties}>
        {GROUPS.map(({ question, items: group }, c) => <div key={question} className="mig-col" role="list" aria-label={question}>
          <p className="mig-q"><span>0{c + 1}</span>{question}</p>
          {Array.from({ length: depth }, (_, r) => {
            const entry = group[r]
            if (!entry) return <div key={`empty-${r}`} className="mig-cell is-empty" aria-hidden="true" />
            const [name, line] = entry
            const i = n++
            return <div key={name} role="listitem" className="mig-cell" tabIndex={0} style={{ '--i': i } as React.CSSProperties} onPointerEnter={playMark} onAnimationEnd={settleMark}>
              <span className="mi-mark">{marks.get(name)}</span>
              <strong>{name}</strong>
              <p>{line}</p>
            </div>
          })}
        </div>)}
      </div>
    </div>
  }
  return <div className="mi-track mi-track--grid" id={id}>
    <div className="mi-track-head mi-track-head--blocks">
      <p className="mi-track-eyebrow">Also on your dashboard</p>
      <h3 className="mi-track-title">Three questions it answers.<br />Eight ways it answers them.</h3>
      <p className="mi-track-lead">Every view below is cut from the same payments as the chart, so a click on any of them narrows the rest.</p>
    </div>
    <div className={`mig${lines ? '' : ' mig--plain'}`} style={{ '--cols': COLS, '--rows': ROWS } as React.CSSProperties}>
      {lines && <div className="mig-lines" aria-hidden="true">
        {Array.from({ length: COLS + 1 }, (_, c) => <i key={`v${c}`} className="mig-v" style={{ '--c': c } as React.CSSProperties} />)}
        {Array.from({ length: ROWS + 1 }, (_, r) => <i key={`h${r}`} className="mig-h" style={{ '--r': r } as React.CSSProperties} />)}
        {Array.from({ length: (COLS + 1) * (ROWS + 1) }, (_, k) => <b key={`x${k}`} className="mig-x" style={{ '--c': k % (COLS + 1), '--r': Math.floor(k / (COLS + 1)) } as React.CSSProperties} />)}
      </div>}
      {GROUPS.map(({ question, items: group }, c) => <div key={question} className="mig-col" role="list" aria-label={question}>
        <p className="mig-q"><span>0{c + 1}</span>{question}</p>
        {group.map(([name, line]) => {
          const i = n++
          return <div key={name} role="listitem" className="mig-cell" tabIndex={0} style={{ '--i': i } as React.CSSProperties} onPointerEnter={playMark} onAnimationEnd={settleMark}>
            <span className="mi-mark">{marks.get(name)}</span>
            <strong>{name}</strong>
            <p>{line}</p>
          </div>
        })}
      </div>)}
    </div>
  </div>
}
