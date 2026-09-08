/** HTML content shown on the recessed screens. Styled in hero3d.css. */

export function PersonalPanel() {
  return (
    <div className="h3d-p">
      <div className="h3d-p-label">TOTAL BALANCE</div>
      <div className="h3d-p-big">€ 28,142.55</div>
      <div className="h3d-p-rule" />
      <div className="h3d-p-row">
        <span className="h3d-p-dot eur">€</span>EUR
        <span className="h3d-p-amt">€18,432.55</span>
        <span className="h3d-p-chev">›</span>
      </div>
      <div className="h3d-p-row">
        <span className="h3d-p-dot usd">$</span>USD
        <span className="h3d-p-amt">$5,820.40</span>
        <span className="h3d-p-chev">›</span>
      </div>
      <div className="h3d-p-row">
        <span className="h3d-p-dot gbp">£</span>GBP
        <span className="h3d-p-amt">£3,540.00</span>
        <span className="h3d-p-chev">›</span>
      </div>
    </div>
  )
}

export function BusinessPanel() {
  return (
    <div className="h3d-p">
      <div className="h3d-p-label">TEAM &amp; APPROVALS</div>
      <div className="h3d-p-stat">
        Team members<span className="h3d-p-n">7</span>
      </div>
      <div className="h3d-p-avatars">
        <span className="h3d-p-av" />
        <span className="h3d-p-av" />
        <span className="h3d-p-av" />
        <span className="h3d-p-av" />
        <span className="h3d-p-av" />
        <span className="h3d-p-more">+2</span>
      </div>
      <div className="h3d-p-rule" />
      <div className="h3d-p-stat">
        Pending approvals<span className="h3d-p-n">2</span>
      </div>
      <div className="h3d-p-gold">€4,250.00</div>
    </div>
  )
}

export function PaymentsPanel() {
  return (
    <div className="h3d-p">
      <div className="h3d-p-ok">
        <span className="h3d-p-tick">✓</span>Card payment received
      </div>
      <div className="h3d-p-sum">
        €125.00 from
        <br />
        Acme Cycling Ltd
      </div>
      <div className="h3d-p-rule" />
      <div className="h3d-p-sum h3d-p-sum2">
        Processing volume
        <br />
        <span className="h3d-p-muted">This month</span>
      </div>
      <div className="h3d-p-chart">
        {[14, 22, 19, 34, 46, 41, 58, 72, 86, 100].map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function CardFace() {
  return (
    <div className="h3d-cardface">
      <div className="h3d-cardface-chip" />
      <div className="h3d-cardface-logo">
        <span className="u">UTEX</span>
        <span className="p">PAY</span>
      </div>
      <div className="h3d-cardface-foot">
        <div>
          <div className="h3d-cardface-num">•••• 4532</div>
          <div className="h3d-cardface-name">Sam Gold</div>
        </div>
        <div className="h3d-cardface-mc">
          <i />
          <i />
        </div>
      </div>
    </div>
  )
}
