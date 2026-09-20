import { useEffect, useId, useRef } from 'react'
import { SectionHeading } from '#/components/SectionHeading'
import { BusinessTiles } from './BusinessTiles'
import { CheckoutScene } from './CheckoutScene'
import { TotalBalancePanel } from './TotalBalancePanel'
import { CoffeeSteam } from './CoffeeSteam'
import './feature-grid.css'

/* Motion is opt-in from the client: `data-motion` on the grid enables the hidden pre-entry state,
   so prerendered HTML and no-JS readers see every tile. Each chapter gets `has-entered` once (the
   entrance stagger and one-shot moments) and `is-in` while on screen (the loops, so nothing ticks
   off-screen). Reduced motion is handled in CSS, where the hidden state is never applied. */
function useChapterMotion(grid: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = grid.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    root.dataset.motion = ''
    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        target.classList.toggle('is-in', isIntersecting)
        if (isIntersecting) target.classList.add('has-entered')
      }
    }, { threshold: .2 })
    for (const chapter of root.querySelectorAll('.fg-chapter')) observer.observe(chapter)
    return () => { observer.disconnect(); delete root.dataset.motion }
  }, [grid])
}

export function FeatureGridSection() {
  const id = useId()
  const grid = useRef<HTMLDivElement>(null)
  useChapterMotion(grid)

  return <div className="feature-grid" ref={grid} aria-labelledby={`${id}-title`}>
    <SectionHeading id={`${id}-title`} eyebrow="Banking & payments" description="For your everyday, your business and the customers you serve.">
      One place.<br />More possibilities.
    </SectionHeading>
    <section className="fg-chapter" aria-labelledby={`${id}-personal`}>
      <header className="fg-chapter-heading"><p>Personal banking</p><h3 id={`${id}-personal`}>Make room for everyday life.</h3></header>
      <div className="fg-row fg-row--personal">
        <article className="fg-tile fg-money">
          <img className="fg-scene fg-money-phone" src="/personalbanking/phone-scene-1254.webp"
            srcSet="/personalbanking/phone-scene-640.webp 640w, /personalbanking/phone-scene-960.webp 960w, /personalbanking/phone-scene-1254.webp 1254w"
            sizes="(max-width: 620px) 100vw, (max-width: 900px) 70vw, 600px"
            width="1254" height="1254" loading="lazy" decoding="async" draggable="false"
            alt="Illustrative UTEX Pay personal banking interface on a phone, with a gold card and recent transactions." />
          <div className="fg-tile-heading"><h4>Your money,<br />ready to use.</h4><p>Currency accounts<br />and cards, together.</p></div>
          <div className="fg-money-ui">
            <TotalBalancePanel />
          </div>
        </article>
        <article className="fg-tile fg-spending">
          <img className="fg-spending-scene" src="/featuregrid/coffee-card-scene-1122.webp"
            srcSet="/featuregrid/coffee-card-scene-640.webp 640w, /featuregrid/coffee-card-scene-1122.webp 1122w"
            sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 594px"
            width="1122" height="1402" loading="lazy" decoding="async" draggable="false" alt="" aria-hidden="true" />
          <CoffeeSteam />
          <div className="fg-tile-heading"><h4>Keep up with<br />your spending.</h4><p>Every little moment,<br />all in view.</p></div>
          <div className="fg-receipt" role="img" aria-label="A card payment of €4.50 for coffee, just now">
            <span className="fg-receipt-avatar" aria-hidden="true"><img src="/featuregrid/coffee-script.svg" width="20" height="20" alt="" draggable="false" /></span>
            <span className="fg-receipt-text"><span>Coffee</span><small>Card payment · Just now</small></span>
            <strong>−€4.50</strong>
          </div>
        </article>
      </div>
    </section>
    <section className="fg-chapter" aria-labelledby={`${id}-business`}>
      <header className="fg-chapter-heading"><p>Business banking</p><h3 id={`${id}-business`}>Give your business its own space.</h3></header>
      <BusinessTiles />
    </section>
    <section className="fg-chapter" id="feature-payments" aria-labelledby={`${id}-payments`}>
      <header className="fg-chapter-heading"><p>Payment processing</p><h3 id={`${id}-payments`}>From checkout to confirmation.</h3></header>
      <CheckoutScene />
    </section>
  </div>
}
