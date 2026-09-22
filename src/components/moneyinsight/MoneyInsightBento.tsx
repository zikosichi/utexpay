import { useState, type ReactNode } from 'react'
import './money-insight-bento.css'
import { playMark, settleMark } from './markPlay'

/* Version 03 of the inventory: instead of eight equal tiles, three real pieces of the processing
   dashboard float on a stage (the conversion widget's Country/Banks tabs, the top-decline-reasons
   donut, the upcoming-settlements timeline), and every item sits in a typographic ledger beside
   them. Pointing at a ledger row lifts its piece and dims the others; rows without a piece just
   read. Pieces are ports of Figma `3568:16668` (Conversion Widget), `3568:16669` (Top Decline
   Reasons) and `3568:38781` (Upcoming settlements card): panel material, Plus Jakarta Sans +
   Manrope, the app's gold ramp. Figures are placeholders. */

export type LedgerItem = { name: string; desc: string; kind: string; mark: ReactNode; piece?: Piece }
type Piece = 'conv' | 'banks' | 'donut' | 'settle'

const DECLINES = [
  { name: 'Insufficient funds', share: 38, count: 67, color: '#d4941c' },
  { name: '3DS failed', share: 24, count: 42, color: '#f5c542' },
  { name: 'Risk rules', share: 18, count: 31, color: '#fbeba3' },
  { name: 'Expired card', share: 9, count: 16, color: '#fffbeb' },
  { name: 'Other', share: 11, count: 20, color: '#5a5650' },
]
const CONVERSION = {
  country: { head: 'Country', rows: [['GB', 'United Kingdom', 52, 73], ['DE', 'Germany', 6, 8], ['NL', 'Netherlands', 5, 7], ['SE', 'Sweden', 3, 4], ['NO', 'Norway', 2, 3]] },
  banks: { head: 'Bank', rows: [['GB', 'Barclays', 16, 23], ['GB', 'HSBC', 12, 17], ['GB', 'Monzo', 8, 11], ['GB', 'Revolut', 6, 8], ['DE', 'Deutsche Bank', 4, 6]] },
} as const
const SEG_GAP = 1.6

function DonutPiece({ active }: { active: boolean }) {
  const [lit, setLit] = useState(-1)
  let offset = 0
  return <figure className={`mib-piece mib-donut${active ? ' is-active' : ''}`} data-piece="donut" aria-label="Top decline reasons: 176 declines today, 12.4% of attempts. Insufficient funds 38%, 3DS failed 24%, risk rules 18%, expired card 9%, other 11%.">
    <div className="mib-head">Top decline reasons</div>
    <div className="mib-donut-body">
      <div className="mib-ring">
        <svg viewBox="0 0 204 204" aria-hidden="true">
          <g transform="rotate(-90 102 102)">
            {DECLINES.map((d, i) => {
              const start = offset
              offset += d.share
              return <circle key={d.name} className={`mib-seg${lit === i ? ' is-lit' : ''}`} cx="102" cy="102" r="91" pathLength={100} stroke={d.color} strokeDasharray={`${d.share - SEG_GAP} 100`} strokeDashoffset={-start} style={{ '--n': i, '--seg': d.share - SEG_GAP } as React.CSSProperties} />
            })}
          </g>
        </svg>
        <div className="mib-ring-center"><strong>176</strong><span>declines · 12.4%</span></div>
      </div>
      <ul className="mib-legend" onMouseLeave={() => setLit(-1)}>
        {DECLINES.map((d, i) => <li key={d.name} className={lit === i ? 'is-lit' : undefined} onMouseEnter={() => setLit(i)}>
          <span className="mib-legend-main"><i style={{ background: d.color }} />{d.name}<b>{d.share}%</b></span>
          <span className="mib-legend-count">{d.count} declines</span>
        </li>)}
      </ul>
    </div>
  </figure>
}

function ConversionPiece({ tab, onTab, active }: { tab: 'country' | 'banks'; onTab: (t: 'country' | 'banks') => void; active: boolean }) {
  const view = CONVERSION[tab]
  const top = view.rows[0][3]
  return <figure className={`mib-piece mib-conv${active ? ' is-active' : ''}`} data-piece="conv" aria-label={`Conversion by ${view.head.toLowerCase()}: ${view.rows.map((r) => `${r[1]} ${r[3]}%`).join(', ')}.`}>
    <div className="mib-tabs" role="tablist" aria-label="Conversion by">
      <span className="is-off">Map</span>
      <button type="button" role="tab" aria-selected={tab === 'country'} onClick={() => onTab('country')}>Country</button>
      <button type="button" role="tab" aria-selected={tab === 'banks'} onClick={() => onTab('banks')}>Banks</button>
      <span className="is-off">Method</span>
    </div>
    <div className="mib-conv-cols"><span>{view.head}</span><span>Conversion</span></div>
    <ol key={tab} className="mib-conv-rows">
      {view.rows.map(([code, name, tx, pct], i) => <li key={name} style={{ '--w': `${Math.max(14, (pct / top) * 100)}%`, '--i': i } as React.CSSProperties}>
        <span className="mib-conv-bar" aria-hidden="true" />
        <span className="mib-tile" aria-hidden="true">{code}</span>
        <span className="mib-conv-name"><strong>{name}</strong><small>{tx} tx</small></span>
        <b>{pct}%</b>
      </li>)}
    </ol>
    <div className="mib-conv-foot">Show all</div>
  </figure>
}

function SettlementPiece({ active }: { active: boolean }) {
  return <figure className={`mib-piece mib-settle${active ? ' is-active' : ''}`} data-piece="settle" aria-label="Upcoming settlements: next settlement tomorrow, about 32,310 euros. Settles every Wednesday.">
    <div className="mib-settle-hero">
      <div>
        <span className="mib-badge">Next settlement · tomorrow</span>
        <strong className="mib-amount">€ 32,310.00</strong>
      </div>
      <span className="mib-settle-note">Settles every Wednesday</span>
    </div>
    <div className="mib-timeline" aria-hidden="true">
      <span className="mib-today">today</span>
      <div className="mib-track">
        <i className="mib-dot" /><span className="mib-line is-past" /><i className="mib-dot is-now" /><span className="mib-line" /><i className="mib-dot" /><span className="mib-line" /><i className="mib-dot" /><span className="mib-line" />
      </div>
      <div className="mib-labels">
        <span><em>Wed, 1 Jul</em><small><b>€ 41,010.00 ·</b> paid</small></span>
        <span className="is-next"><em>Wed, 8 Jul</em><small>≈ € 32,310.00 · next</small></span>
        <span><em>Wed, 15 Jul</em><small>weekly</small></span>
        <span><em>Wed, 22 Jul</em><small>weekly</small></span>
      </div>
    </div>
  </figure>
}

export function BentoTrack({ items, id }: { items: LedgerItem[]; id: string }) {
  const [active, setActive] = useState<Piece | null>(null)
  const [tab, setTab] = useState<'country' | 'banks'>('country')
  const point = (piece?: Piece) => {
    setActive(piece ?? null)
    if (piece === 'banks') setTab('banks')
    else if (piece === 'conv') setTab('country')
  }
  const convActive = active === 'conv' || active === 'banks'
  return <div className="mi-track mi-track--bento" id={id}>
    <div className="mi-track-head mi-track-head--blocks">
      <p className="mi-track-eyebrow">Also on your dashboard</p>
      <h3 className="mi-track-title">Eight more things it can tell you.</h3>
      <p className="mi-track-lead">Each one is a view of the same payments, so any of them narrows the rest. Three of them, exactly as they sit in the app.</p>
    </div>
    <div className="mib-body">
      <div className={`mib-stage${active ? ' has-active' : ''}`} data-active={active ?? undefined}>
        <ConversionPiece tab={tab} onTab={setTab} active={convActive} />
        <DonutPiece active={active === 'donut'} />
        <SettlementPiece active={active === 'settle'} />
      </div>
      <ol className="mib-ledger" onMouseLeave={() => point()}>
        {items.map(({ name, desc, kind, mark, piece }, i) => <li key={name} data-kind={kind} data-piece={piece} tabIndex={0} style={{ '--i': i } as React.CSSProperties}
          onMouseEnter={() => point(piece)} onFocus={() => point(piece)} onBlur={() => point()} onPointerEnter={playMark} onAnimationEnd={settleMark}>
          <span className="mib-index" aria-hidden="true">0{i + 1}</span>
          <span className="mi-mark">{mark}</span>
          <span className="mib-ledger-text"><strong>{name}</strong><p>{desc}</p></span>
        </li>)}
      </ol>
    </div>
  </div>
}
