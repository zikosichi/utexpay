import { useId, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ButtonLink } from '../Button'
import { SectionHeading } from '../SectionHeading'
import './magnetic-closing.css'

const LAYERS = [
  { name: 'Personal', value: '€28,142.55', detail: 'Available balance', index: 0 },
  { name: 'Business', value: '3 team members', detail: 'Your business account', index: 1 },
  { name: 'Payments', value: '€125.00 received', detail: 'Connected to your account', index: 2 },
]

/** Each tile scrolls with the document. The two SVG halves have identical geometry,
 * with the sticky card between them in the stacking order. Labels live on the front face. */
function Tile({ layer, front, clip }: {
  layer: typeof LAYERS[number]
  front: boolean
  clip: string
}) {
  const tile = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: tile, offset: ['0.38 65%', '0.38 35%'] })
  const glowTarget = useTransform(scrollYProgress, [0, .25, .5, .68, 1], [0, .2, 1, .45, 0])
  const glow = useSpring(glowTarget, { stiffness: 160, damping: 28, mass: .7 })
  const ink = useTransform(glow, [0, 1], ['#c7b48f', '#fff6cf'])
  const bloom = useTransform(glow, [0, 1], ['drop-shadow(0 0 0px #ffd47700) drop-shadow(0 0 0px #f5ae3c00)', 'drop-shadow(0 0 12px #ffd477) drop-shadow(0 0 28px #f5ae3c)'])
  // Both halves must receive identical lighting or their cut becomes a visible diagonal.
  const surfaceLight = useTransform(glow, [0, 1], ['brightness(1)', 'brightness(1.2)'])
  const scaleTarget = useTransform(scrollYProgress, [0, .18, .46, .72, 1], [1, 1, 1.055, 1.018, 1], {
    ease: (v) => v * v * (3 - 2 * v),
  })
  const scale = useSpring(scaleTarget, { stiffness: 160, damping: 28, mass: .7, restDelta: .0001 })
  return <div ref={tile} className={`mc-tile mc-tile--${front ? 'front' : 'back'}`}
    style={{ top: `calc(var(--mc-tile-start) + ${layer.index} * var(--mc-tile-gap))` }} aria-hidden="true">
    <motion.svg viewBox="0 240 1635 560" style={{ scale: reduced ? 1 : scale, transformOrigin: '50% 38%' }}>
    <g clipPath={`url(#${clip})`}>
      <motion.image href="/magnetic-platform.png" width="1635" height="962"
        style={{ filter: reduced ? 'none' : surfaceLight }} />
      {front && <motion.g transform="matrix(1 .088 0 1 0 0)" className="mc-engraving" style={{ fill: reduced ? '#c7b48f' : ink, filter: reduced ? 'none' : bloom }}>
        <text x="210" y="505" className="mc-tile-name">{layer.name}</text>
        <text x="1110" y="495" textAnchor="end" className="mc-tile-value">{layer.value}</text>
        <text x="1110" y="526" textAnchor="end" className="mc-tile-detail">{layer.detail}</text>
      </motion.g>}
    </g>
    </motion.svg>
  </div>
}

/** Exact Figma artwork, rotated as a whole so its proportions and lettering stay intact. */
function Card({ tier }: { tier: 'gold' | 'obsidian' | 'platinum' }) {
  return <image className="mc-card-art" href={`/magneticclosing/card-${tier}.png`}
    width="480" height="305.586" transform="translate(305.586 0) rotate(90)" />
}

export function MagneticClosingSection() {
  const clearMarker = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const id = useId().replace(/:/g, '')
  // Card pose follows scroll directly, with no spring or motion after scrolling stops.
  const { scrollYProgress } = useScroll({ target: clearMarker, offset: ['start 32%', 'start 16%'] })
  const fan = useTransform(scrollYProgress, [0, 1], [0, 1], { ease: (v) => v * v * (3 - 2 * v) })
  const cardLift = useTransform(fan, [0, .45, 1], [0, 0, -100])
  const leftX = useTransform(fan, [0, 1], [0, -310])
  const rightX = useTransform(fan, [0, 1], [0, 310])
  const sideY = useTransform(fan, [0, 1], [0, 40])
  // A vertical shear matches the slot slope while keeping both side edges vertical.
  // Remove the shear as the cards open into their normal landscape poses.
  const cardShear = useTransform(fan, [0, 1], [5, 0])
  const leftRotate = useTransform(fan, [0, 1], [0, -102])
  const rightRotate = useTransform(fan, [0, 1], [0, -78])
  const mainRotate = useTransform(fan, [0, 1], [0, -90])
  const cardScale = useTransform(fan, [0, 1], [1, 1.08])

  return <section id="grow-with-utex" className="magnetic-closing" aria-labelledby="mc-title">
    <div className="mc-atmosphere" aria-hidden="true" />
    <div className="mc-journey">
      {LAYERS.map(layer => <Tile key={`${layer.name}-back`} layer={layer} front={false} clip={`${id}-back`} />)}
      <div className="mc-card-sticky">
        <svg className="mc-card-scene" viewBox="0 0 1635 650" role="img" aria-labelledby={`${id}-title`}>
          <title id={`${id}-title`}>A UTEX card connecting personal banking, business and payments</title>
          <defs>
            <clipPath id={`${id}-back`}><polygon points="0,0 1635,0 1635,514 0,384" /></clipPath>
            <clipPath id={`${id}-front`}><polygon points="0,383 1635,513 1635,962 0,962" /></clipPath>
          </defs>
          <g transform="translate(666 85)">
            <motion.g style={{ y: reduced ? -100 : cardLift, skewY: reduced ? 0 : cardShear, scale: reduced ? 1 : cardScale, originX: .5, originY: .5 }}>
              <motion.g style={{ x: reduced ? -310 : leftX, y: reduced ? 30 : sideY, rotate: reduced ? -102 : leftRotate, originX: .5, originY: .5 }}>
                <Card tier="obsidian" />
              </motion.g>
              <motion.g style={{ x: reduced ? 310 : rightX, y: reduced ? 30 : sideY, rotate: reduced ? -78 : rightRotate, originX: .5, originY: .5 }}>
                <Card tier="platinum" />
              </motion.g>
              <motion.g style={{ rotate: reduced ? -90 : mainRotate, originX: .5, originY: .5 }}><Card tier="gold" /></motion.g>
            </motion.g>
          </g>
        </svg>
      </div>
      {LAYERS.map(layer => <Tile key={`${layer.name}-front`} layer={layer} front clip={`${id}-front`} />)}
      <div ref={clearMarker} className="mc-clear-marker" aria-hidden="true" />
    </div>
    <motion.div className="mc-closing-copy" initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .15 }}
      transition={{ duration: reduced ? 0 : .55, ease: [.22, 1, .36, 1] }}>
      <SectionHeading id="mc-title" eyebrow="One account. Room to grow."
        description="Personal banking, business and payments. Ready for whatever comes next.">
        The bank that grows with you.
      </SectionHeading>
      <div className="mc-actions">
        <ButtonLink href="/#signup">Open an account</ButtonLink>
        <ButtonLink href="mailto:hello@utexpay.com" variant="secondary">Talk to us</ButtonLink>
      </div>
      <p className="mc-products">Personal <span>·</span> Business <span>·</span> Payments</p>
    </motion.div>
  </section>
}
