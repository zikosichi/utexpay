const ASSETS = '/featuregrid/currencies'

/** Figma `Article` 4855:9675 — one frosted panel holding the total and the three currency
    accounts. The amounts are the design's own illustrative figures, shortened to whole units;
    the hero's `CURRENCIES` carries a different, longer set, so this keeps its own copy. */
const ACCOUNTS = [
  { code: 'EUR', symbol: '€', value: '€18,432', tone: 'eur' },
  { code: 'GBP', symbol: '£', value: '£12,540', tone: 'gbp' },
  { code: 'USD', symbol: '$', value: '$2,540', tone: 'usd' },
] as const

export function TotalBalancePanel() {
  return <div className="fg-balance-panel">
    <div className="fg-balance-total">
      <p className="fg-balance-label">Total Balance</p>
      <p className="fg-balance-amount">€18,432.55</p>
    </div>
    <ul className="fg-balance-accounts">
      {ACCOUNTS.map((account) => <li className="fg-balance-account" key={account.code}>
        <span className="fg-currency-badge" aria-hidden="true">
          <img src={`${ASSETS}/${account.tone}.png`} alt="" width="55" height="40" />
          <span>{account.symbol}</span>
        </span>
        <span className="fg-balance-account-info">
          <span className="fg-balance-account-code">{account.code}</span>
          <span className="fg-balance-account-value">{account.value}</span>
        </span>
      </li>)}
    </ul>
  </div>
}
