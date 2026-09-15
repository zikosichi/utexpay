/** Figma `CheckoutDemo` 4855:22966 — the payment-processing tile is one still: the Northstar
    bottle scene (`image 154`, 1653 × 664, right edge on the tile's right edge) under a black
    70% → 0 shade with a centred caption. The design has no control, so nothing here is interactive. */
export function CheckoutScene() {
  return <article className="fg-tile fg-checkout">
    <img className="fg-checkout-scene" src="/featuregrid/pay-scene-1978.webp"
      srcSet="/featuregrid/pay-scene-1100.webp 1100w, /featuregrid/pay-scene-1978.webp 1977w"
      sizes="(max-width: 900px) 140vw, 1653px"
      width="1977" height="795" loading="lazy" decoding="async" draggable="false"
      alt="A matte green Northstar water bottle standing on a marble slab in warm evening light." />
    <div className="fg-checkout-shade" aria-hidden="true" />
    <div className="fg-checkout-copy"><h4>Make it easy to Pay</h4><p>A simple checkout for your customers. Every payment in view</p></div>
  </article>
}
