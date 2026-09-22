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
function Layer({ layer, backClip, frontClip }: {
  layer: typeof LAYERS[number]
  backClip: string
  frontClip: string
}) {
  const tile = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: tile, offset: ['0.38 65%', '0.38 35%'] })
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
    <p className="mc-chapters-eyebrow">One account. Three possibilities.</p>
    <div className="mc-journey">
      {LAYERS.map(layer => <Layer key={layer.name} layer={layer} backClip={`${id}-back`} frontClip={`${id}-front`} />)}
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
        <ButtonLink href="mailto:hello@utexpay.com" variant="secondary">Talk to us</ButtonLink>
      </div>
      <p className="mc-products">Personal <span>·</span> Business <span>·</span> Payments</p>
    </motion.div>
  </section>
}
