import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import type { MotionStyle, MotionValue } from 'motion/react'
import { ButtonLink } from '../Button'
import { SectionHeading } from '../SectionHeading'
import './magnetic-closing.css'

const LAYERS = [
  { name: 'Personal', value: '€28,142.55', detail: 'Available balance', index: 0,
    verb: 'Start', title: 'Make it yours.', description: 'A place for your everyday money.' },
  { name: 'Business', value: '3 team members', detail: 'Your business account', index: 1,
    verb: 'Build', title: 'Make room to grow.', description: 'An account for your business.' },
  { name: 'Payments', value: '€125.00 received', detail: 'Connected to your account', index: 2,
    verb: 'Connect', title: 'Bring it together.', description: 'Banking and payments, connected.' },
]

// Where the sticky card rides, as a fraction of the viewport height from the top: 45% from the
// bottom on desktop, 40% on phones and portrait tablets. Must match --mc-card-y in the CSS.
const CARD_Y_DESKTOP = .55
const CARD_Y_COMPACT = .6
// Rasterize at the largest pose, then animate down from it to keep the bitmap sharp.
const CARD_FAN_SCALE = 1.24
const COMPACT_LAYOUT_QUERY = '(max-width: 760px), (min-width: 761px) and (max-width: 1100px) and (orientation: portrait)'
function useCardY() {
  const [cardY, setCardY] = useState(() => typeof window !== 'undefined' && window.matchMedia(COMPACT_LAYOUT_QUERY).matches ? CARD_Y_COMPACT : CARD_Y_DESKTOP)
  useEffect(() => {
    const query = window.matchMedia(COMPACT_LAYOUT_QUERY)
    const update = () => setCardY(query.matches ? CARD_Y_COMPACT : CARD_Y_DESKTOP)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return cardY
}

function Chapter({ layer, charge }: { layer: typeof LAYERS[number]; charge: MotionValue<number> }) {
  const reduced = useReducedMotion()
  return <motion.div className="mc-chapter" style={{ '--mc-charge': reduced ? 1 : charge } as MotionStyle}>
    <span className="mc-chapter-line mc-chapter-line--left" aria-hidden="true"><i /></span>
    <span className="mc-chapter-line mc-chapter-line--right" aria-hidden="true"><i /></span>
    <div className="mc-chapter-marker">
      <span className="mc-chapter-number" aria-hidden="true">0{layer.index + 1}</span>
      <span className="mc-chapter-verb">{layer.verb}</span>
    </div>
    <div className="mc-chapter-copy">
      <h3>{layer.title}</h3>
      <p>{layer.description}</p>
    </div>
  </motion.div>
}

/** Each tile scrolls with the document. The two SVG halves have identical geometry,
 * with the sticky card between them in the stacking order. Labels live on the front face. */
function Layer({ layer, backClip, frontClip, cardY }: {
  layer: typeof LAYERS[number]
  backClip: string
  frontClip: string
  cardY: number
}) {
  const tile = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: tile, offset: [[.38, cardY + .15], [.38, cardY - .15]] })
  const [lit, setLit] = useState(false)
  const charge = useMotionValue(0)
  const glow = useMotionValue(0)
  // Scroll only switches state. Hysteresis avoids flickering around the contact point.
  const updateLight = (progress: number) => setLit(previous =>
    progress >= .36 ? true : progress <= .28 ? false : previous)
  useMotionValueEvent(scrollYProgress, 'change', updateLight)
  useEffect(() => { updateLight(scrollYProgress.get()) }, [scrollYProgress])
  useEffect(() => {
    if (reduced) { charge.set(1); glow.set(0); return }
    const lighting = animate(charge, lit ? 1 : 0, {
      duration: lit ? .65 : .45, ease: [.22, 1, .36, 1],
    })
    const contact = animate(glow, lit ? [glow.get(), 1, 0] : 0, {
      duration: lit ? .85 : .3, ease: 'easeInOut',
    })
    return () => { lighting.stop(); contact.stop() }
  }, [lit, reduced, charge, glow])
  const ink = useTransform(glow, [0, 1], ['#c7b48f', '#fff2da'])
  const bloom = useTransform(glow, [0, 1], ['drop-shadow(0 0 0px #ffd09a00) drop-shadow(0 0 0px #eaaa5600)', 'drop-shadow(0 0 8px #ffd09a80) drop-shadow(0 0 20px #eaaa564d)'])
  // Both halves must receive identical lighting or their cut becomes a visible diagonal.
  const surfaceLight = useTransform(glow, [0, 1], ['brightness(1)', 'brightness(1.1)'])
  const scaleTarget = useTransform(scrollYProgress, [0, .18, .46, .72, 1], [1, 1, 1.055, 1.018, 1], {
    ease: (v) => v * v * (3 - 2 * v),
  })
  const scale = useSpring(scaleTarget, { stiffness: 160, damping: 28, mass: .7, restDelta: .0001 })
  const position = { top: `calc(var(--mc-tile-start) + ${layer.index} * var(--mc-tile-gap))` }
  const half = (front: boolean, clip: string) => <div className={`mc-tile mc-tile--${front ? 'front' : 'back'}`} style={position}>
    <motion.svg aria-hidden="true" viewBox="0 240 1635 560" style={{ scale: reduced ? 1 : scale, transformOrigin: '50% 38%' }}>
    <g clipPath={`url(#${clip})`}>
      <motion.g style={{ filter: reduced ? 'none' : surfaceLight }}>
        <image className="mc-platform-art" href="/magnetic-platform.png" width="1635" height="962" />
      </motion.g>
      {front && <motion.g transform="matrix(1 .088 0 1 0 0)" className="mc-engraving" style={{ fill: reduced ? '#c7b48f' : ink, filter: reduced ? 'none' : bloom }}>
        <text x="210" y="512" dominantBaseline="central" className="mc-tile-name">{layer.name}</text>
        <text x="1110" y="507" textAnchor="end" className="mc-tile-value">{layer.value}</text>
        <text x="1110" y="538" textAnchor="end" className="mc-tile-detail">{layer.detail}</text>
      </motion.g>}
    </g>
    </motion.svg>
  </div>
  return <>
    <div ref={tile} className="mc-tile mc-tile--chapter" style={position} data-lit={lit}>
      <Chapter layer={layer} charge={charge} />
    </div>
    {half(false, backClip)}
    {half(true, frontClip)}
  </>
}

/** Rotate the original card artwork as a whole through the slots. */
function Card({ tier }: { tier: 'gold' | 'obsidian' | 'platinum' }) {
  return <img className="mc-card-art" src={`/magneticclosing/card-${tier}.png`}
    width="999" height="636" alt="" draggable={false} />
}

export function MagneticClosingSection() {
  const clearMarker = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const cardY = useCardY()
  // Card pose follows scroll directly, with no spring or motion after scrolling stops.
  const { scrollYProgress } = useScroll({ target: clearMarker, offset: [[0, cardY - .18], [0, cardY - .34]] })
  const fan = useTransform(scrollYProgress, [0, 1], [0, 1], { ease: (v) => v * v * (3 - 2 * v) })
  // The fixed frame is laid out at the largest pose; translation retains the original
  // SVG distance while each card can be composited independently.
  const finalLift = `${-100 / (480 * CARD_FAN_SCALE) * 100}%`
  const cardLift = useTransform(fan, [0, .45, 1], ['0%', '0%', finalLift])
  const leftX = useTransform(fan, value => `calc(${-value} * var(--mc-fan-spread))`)
  const rightX = useTransform(fan, value => `calc(${value} * var(--mc-fan-spread))`)
  const sideY = useTransform(fan, [0, 1], ['0%', `${40 / 480 * 100}%`])
  // Transparent render margins differ slightly; keep the hidden variants from
  // peeking past the gold silhouette while the cards travel as a single card.
  const sideOpacity = useTransform(fan, [0, .12], [0, 1])
  // A vertical shear matches the slot slope while keeping both side edges vertical.
  // Remove the shear as the cards open into their normal landscape poses.
  const cardShear = useTransform(fan, [0, 1], [5, 0])
  const leftRotate = useTransform(fan, [0, 1], [0, -102])
  const rightRotate = useTransform(fan, [0, 1], [0, -78])
  const mainRotate = useTransform(fan, [0, 1], [0, -90])
  const cardScale = useTransform(fan, [0, 1], [1 / CARD_FAN_SCALE, 1])

  return <section id="grow-with-utex" className="magnetic-closing" aria-labelledby="mc-title">
    <div className="mc-atmosphere" aria-hidden="true" />
    <p className="mc-chapters-eyebrow">One account. Three possibilities.</p>
    <div className="mc-journey">
      <svg className="mc-clip-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`${id}-back`}><polygon points="0,0 1635,0 1635,514 0,384" /></clipPath>
          <clipPath id={`${id}-front`}><polygon points="0,383 1635,513 1635,962 0,962" /></clipPath>
        </defs>
      </svg>
      {LAYERS.map(layer => <Layer key={`${layer.name}-${cardY}`} layer={layer} cardY={cardY} backClip={`${id}-back`} frontClip={`${id}-front`} />)}
      <div className="mc-card-sticky">
        <div className="mc-card-scene" role="img" aria-label="A UTEX card connecting personal banking, business and payments" style={{ '--mc-fan-scale': CARD_FAN_SCALE } as MotionStyle}>
          <motion.div className="mc-card-pose" style={{ y: reduced ? finalLift : cardLift, skewY: reduced ? 0 : cardShear, scale: reduced ? 1 : cardScale }}>
            <motion.div className="mc-card" style={{ opacity: reduced ? 1 : sideOpacity, x: reduced ? 'calc(-1 * var(--mc-fan-spread))' : leftX, y: reduced ? `${30 / 480 * 100}%` : sideY, rotate: reduced ? -102 : leftRotate }}>
              <Card tier="obsidian" />
            </motion.div>
            <motion.div className="mc-card" style={{ opacity: reduced ? 1 : sideOpacity, x: reduced ? 'var(--mc-fan-spread)' : rightX, y: reduced ? `${30 / 480 * 100}%` : sideY, rotate: reduced ? -78 : rightRotate }}>
              <Card tier="platinum" />
            </motion.div>
            <motion.div className="mc-card" style={{ rotate: reduced ? -90 : mainRotate }}><Card tier="gold" /></motion.div>
          </motion.div>
        </div>
      </div>
      <div ref={clearMarker} className="mc-clear-marker" aria-hidden="true" />
    </div>
    <ol className="mc-reduced-chapters">
      {LAYERS.map(layer => <li key={layer.name}>
        <span>0{layer.index + 1} / {layer.verb}</span>
        <h3>{layer.title}</h3><p>{layer.description}</p>
      </li>)}
    </ol>
    <motion.div className="mc-closing-copy" initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .15 }}
      transition={{ duration: reduced ? 0 : .55, ease: [.22, 1, .36, 1] }}>
      <SectionHeading id="mc-title" eyebrow="One account. Room to grow."
        description="Personal banking, business and payments. Ready for whatever comes next.">
        The bank that grows with you.
      </SectionHeading>
      <div className="mc-actions">
        <ButtonLink href="/#signup">Open an account</ButtonLink>
        <ButtonLink href="/#demo" variant="secondary">Try live demo</ButtonLink>
      </div>
      <p className="mc-products">Personal <span>·</span> Business <span>·</span> Payments</p>
    </motion.div>
  </section>
}
