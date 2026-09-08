import type { ReactNode } from 'react'
import { AccountFigure, TeamFigure, VolumeFigure } from './figures'
import { PanelWindow } from './PanelWindow'
import type { PersonalVariant } from './personalVariants'
import type { PanelName } from './surfaces'
import './panel-sheet.css'
import './personal-box.css'
import './personal-variants.css'
import './personal-inlays.css'
import './commerce-boxes.css'

/**
 * The DOM behind every baked panel image. Nothing here reaches the hero at
 * runtime: `/panel-bake?surface=<name>` renders one of these flat and
 * `scripts/bake-panels.mjs` screenshots it into `public/photostructure/panels/`,
 * where `scene.ts` picks it up as a texture on the bronze.
 */

/** `value` drops the symbol: the inlay medallion already carries it. */
const balances = [
  { code: 'EUR', symbol: '€', amount: '€18,432.55', value: '18,432.55', tone: 'euro', name: 'Euro' },
  { code: 'USD', symbol: '$', amount: '$5,820.40', value: '5,820.40', tone: 'dollar', name: 'US dollar' },
  { code: 'GBP', symbol: '£', amount: '£3,540.00', value: '3,540.00', tone: 'pound', name: 'British pound' },
]

function Coin({ currency }: { currency: typeof balances[number] }) {
  return <span className={`sheet-medallion personal-coin--${currency.tone}`} aria-hidden="true"><span>{currency.symbol}</span></span>
}

function Balance({ label = 'Total balance' }: { label?: string }) {
  return <div className="pv-balance"><p className="pv-eyebrow">{label}</p><p className="pv-total"><span>€</span>28,142<span className="pv-cents">.55</span></p></div>
}

function SplitBalance() {
  return <div className="pv-layout pv-split">
    <div className="pv-overview"><Balance /><p className="pv-account-note"><span className="pv-status-dot" />Personal account<span className="pv-note-divider">/</span>3 currencies</p></div>
    <div className="pv-side-accounts"><p className="pv-eyebrow">Your currencies</p><ul aria-label="Currency balances">
      {balances.map((currency) => <li key={currency.code}><Coin currency={currency} /><span className="pv-code">{currency.code}</span><span className="pv-amount">{currency.amount}</span></li>)}
    </ul></div>
  </div>
}

function CurrencyInlays() {
  return <div className="pv-layout personal-inlays">
    <p className="panel-eyebrow">Total balance</p>
    <p className="panel-hero">€28,142.55</p>
    <ul className="inlay-grid" aria-label="Currency balances">{balances.map((currency) => <PanelWindow as="li" key={currency.code}>
      <div className="inlay-heading">
        <span className="inlay-symbol" aria-hidden="true">{currency.symbol}</span>
        <span className="panel-label">{currency.code}</span>
      </div>
      <p className="panel-value inlay-amount">{currency.value}</p>
    </PanelWindow>)}</ul>
  </div>
}

function BalanceActivity() {
  return <div className="pv-layout pv-activity">
    <div className="pv-overview"><Balance /><div className="pv-currency-pills" aria-label="Currencies"><span>EUR</span><span>USD</span><span>GBP</span></div></div>
    <div className="pv-feed"><p className="pv-eyebrow">Recent activity</p><ul aria-label="Illustrative recent activity">
      <li><span className="pv-transfer-icon" aria-hidden="true">↙</span><div><p>Bank transfer</p><span>Received</span></div><strong className="pv-positive">+€1,250</strong></li>
      <li><span className="pv-transfer-icon" aria-hidden="true">↗</span><div><p>Card payment</p><span>Completed</span></div><strong>−€48.00</strong></li>
    </ul><p className="pv-feed-footer">Personal account<span aria-hidden="true">↗</span></p></div>
  </div>
}

function EngravedBalance() {
  return <div className="pv-layout pv-engraved"><Balance /><ul aria-label="Currency balances">{balances.map((currency) => <li key={currency.code}>
    <span className="pv-engraved-code">{currency.code}</span><span className="pv-engraved-amount">{currency.amount}</span>
  </li>)}</ul></div>
}

function ClassicBalance() {
  return <div className="sheet">
    <p className="sheet-label">Total balance</p>
    <p className="sheet-total"><span>€</span> 28,142.55</p>
    <ul className="sheet-rows" aria-label="Currency balances">{balances.map((currency) => <li className="sheet-row" key={currency.code}>
      <Coin currency={currency} /><span className="sheet-name">{currency.code}</span><span className="sheet-amount">{currency.amount}</span><span className="sheet-chevron" aria-hidden="true">›</span>
    </li>)}</ul>
  </div>
}

function Title({ name }: { name: string }) {
  return <div className="personal-title personal-face"><h2>{name}</h2></div>
}

function PersonalPanel({ variant }: { variant: PersonalVariant }) {
  return <div className={`${variant === 'figure' ? 'figure-panel' : 'personal-panel'} personal-face personal-panel--${variant}`}>
    {variant === 'figure' ? <section className="figure-stack"><AccountFigure /></section> : <section className="personal-glass">
      <div className="personal-glass-grain" aria-hidden="true" />
      <div className="personal-glass-reflection" aria-hidden="true" />
      {variant === 'split' && <SplitBalance />}
      {variant === 'tiles' && <CurrencyInlays />}
      {variant === 'activity' && <BalanceActivity />}
      {variant === 'engraved' && <EngravedBalance />}
      {variant === 'classic' && <ClassicBalance />}
    </section>}
  </div>
}

/** No bezel and no glass: the figure is cut straight into the bronze face. */
function CommercePanel({ id, children }: { id: 'business' | 'payments'; children: ReactNode }) {
  return <div className={`figure-panel personal-face commerce-panel commerce-panel--${id}`}>
    <section className="figure-stack">{children}</section>
  </div>
}

export const PANELS: Record<PanelName, () => ReactNode> = {
  'personal-title': () => <Title name="Personal" />,
  'personal-figure': () => <PersonalPanel variant="figure" />,
  'personal-split': () => <PersonalPanel variant="split" />,
  'personal-tiles': () => <PersonalPanel variant="tiles" />,
  'personal-activity': () => <PersonalPanel variant="activity" />,
  'personal-engraved': () => <PersonalPanel variant="engraved" />,
  'personal-classic': () => <PersonalPanel variant="classic" />,
  'business-title': () => <Title name="Business" />,
  'business-panel': () => <CommercePanel id="business"><TeamFigure /></CommercePanel>,
  'payments-title': () => <Title name="Payments" />,
  'payments-panel': () => <CommercePanel id="payments"><VolumeFigure /></CommercePanel>,
}
