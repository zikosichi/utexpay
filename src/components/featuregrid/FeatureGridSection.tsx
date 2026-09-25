import { useEffect, useId, useRef } from 'react'
import { SectionHeading } from '#/components/SectionHeading'
import { BUSINESS_SCENES, BusinessTiles } from './BusinessTiles'
import { CheckoutScene } from './CheckoutScene'
import { TotalBalancePanel } from './TotalBalancePanel'
import { CoffeeSteam } from './CoffeeSteam'
import { ImageDirections, PERSONAL_SCENES, useImageDirection } from './ImageDirections'
import { useStudio } from '../studio'
import './feature-grid.css'

// The chapter index under the heading: one line per chapter, linking to it. First form of the
// numbered in-page navigation Sandro asked for on Sep 18.
const CHAPTERS = [
  { href: '#feature-personal', name: 'Personal', text: 'Balances, cards and daily spending in one view, with accounts in the currencies you use.' },
  { href: '#feature-business', name: 'Business', text: 'Company money, team cards and supplier payments, with roles and an activity log.' },
  { href: '#feature-payments', name: 'Payments', text: 'Card payments from your customers, settled into the account you already run.' },
]

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
  const studio = useStudio()
  const [personalScene, selectPersonalScene] = useImageDirection('personalScene', PERSONAL_SCENES, 'full-composition')
  const [businessScene, selectBusinessScene] = useImageDirection('businessScene', BUSINESS_SCENES, 'human')

  return <div className="feature-grid" ref={grid} aria-labelledby={`${id}-title`}>
    <SectionHeading id={`${id}-title`} eyebrow="Banking & payments" description="Three ways to use UTEX. One account underneath all of them.">
      For you. <br className="fg-phone-break" />For your business.<br />For your customers.
    </SectionHeading>
    <nav className="fg-index" aria-label="In this section">
      <ol>
        {CHAPTERS.map(({ href, name, text }, i) => <li key={href}>
          <a href={href}><span className="fg-index-num" aria-hidden="true">0{i + 1}</span><span className="fg-index-name">{name}</span><span className="fg-index-text">{text}</span></a>
        </li>)}
      </ol>
    </nav>
    <section className="fg-chapter fg-chapter--directions" id="feature-personal" aria-labelledby={`${id}-personal`}>
      <ImageDirections label="Personal image direction" controls={`${id}-personal-scene`} options={PERSONAL_SCENES} selected={personalScene} onSelect={selectPersonalScene} />
      <header className="fg-chapter-heading"><p>Personal banking</p><h3 id={`${id}-personal`}>Make room for everyday life.</h3><p className="fg-chapter-lead">Accounts in the currencies you use and a card ready the day you open it. Balances and spending in one view.</p></header>
      <div className="fg-row fg-row--personal">
        <article className="fg-tile fg-money" data-scene={personalScene}>
          <div id={`${id}-personal-scene`} className="fg-money-art" data-scene={personalScene}>
            {/* Outside ?studio only the chosen direction is in the DOM, so the others are never downloaded. */}
            {PERSONAL_SCENES.filter((item) => studio || item.id === personalScene).map((item) => <img key={item.id}
              className={`fg-scene fg-money-phone${personalScene === item.id ? ' is-selected' : ''}`}
              src={item.src} srcSet={`${item.small} 640w, ${item.src} ${'width' in item ? item.width : 1254}w`}
              sizes="(max-width: 620px) 100vw, (max-width: 900px) 70vw, 600px"
              width={'width' in item ? item.width : 1254} height={'height' in item ? item.height : 'width' in item ? item.width : 1254} loading="lazy" decoding="async" draggable="false"
              alt={personalScene === item.id ? item.alt : ''} aria-hidden={personalScene !== item.id || undefined} />)}
          </div>
          <div className="fg-tile-heading"><h4>Your money,<br />ready to use.</h4><p>Currency accounts<br />and cards, together.</p></div>
          <div className="fg-money-ui">
            <TotalBalancePanel />
          </div>
        </article>
        <article className="fg-tile fg-spending">
          <div className="fg-spending-art">
            <img className="fg-spending-scene" src="/featuregrid/coffee-card-scene-1122.webp"
              srcSet="/featuregrid/coffee-card-scene-640.webp 640w, /featuregrid/coffee-card-scene-1122.webp 1122w"
              sizes="(max-width: 900px) 100vw, (max-width: 1400px) 40vw, 594px"
              width="1122" height="1402" loading="lazy" decoding="async" draggable="false" alt="" aria-hidden="true" />
            <div className="fg-receipt" role="img" aria-label="A card payment of €4.50 for coffee, just now">
              <span className="fg-receipt-avatar" aria-hidden="true"><img src="/featuregrid/coffee-script.svg" width="20" height="20" alt="" draggable="false" /></span>
              <span className="fg-receipt-text"><span>Coffee</span><small>Card payment · Just now</small></span>
              <strong>−€4.50</strong>
            </div>
          </div>
          <CoffeeSteam />
          <div className="fg-tile-heading"><h4>Keep up with<br />your spending.</h4><p>Every little moment,<br />all in view.</p></div>
        </article>
      </div>
    </section>
    <section className="fg-chapter fg-chapter--directions" id="feature-business" aria-labelledby={`${id}-business`}>
      <header className="fg-chapter-heading"><p>Business banking</p><h3 id={`${id}-business`}>Give your business its own space.</h3><p className="fg-chapter-lead">Open it to run the business. Everything you need next is something you switch on, not somewhere you move to.</p></header>
      <ImageDirections label="Business image direction" controls={`${id}-business-scene`} options={BUSINESS_SCENES} selected={businessScene} onSelect={selectBusinessScene} />
      <BusinessTiles scene={businessScene} sceneId={`${id}-business-scene`} />
    </section>
    <section className="fg-chapter" id="feature-payments" aria-labelledby={`${id}-payments`}>
      <header className="fg-chapter-heading"><p>Payment processing</p><h3 id={`${id}-payments`}>From checkout to confirmation.</h3><p className="fg-chapter-lead">What your customers pay lands in the account you already run. Yours the moment it clears, no payout to wait for.</p></header>
      <CheckoutScene />
    </section>
  </div>
}
