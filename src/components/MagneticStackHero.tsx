import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'

import './magnetic-stack.css'

type LayerMotion = {
  x: MotionValue<number>
  y: MotionValue<number>
  rotateZ: MotionValue<number>
}

type StackLayerProps = {
  className: string
  part: 'back' | 'front'
  label: string
  metric: string
  metricDetail: string
  icon: 'check' | 'team' | 'eye'
  motionValues: LayerMotion
  float: number
  duration: number
  introDelay: number
}

type UiTransform = {
  x: number
  y: number
  perspective: number
  rotateX: number
  rotateY: number
  rotateZ: number
  originX: number
  originY: number
  scale: number
}

type UiAlignment = {
  leftLabels: UiTransform
  rightMetrics: UiTransform
  card: UiTransform
  splitLine: SplitLineAlignment
}

type TransformKey = keyof UiTransform
type TransformGroup = 'leftLabels' | 'rightMetrics' | 'card'

type SplitLineAlignment = {
  leftY: number
  rightY: number
  overlap: number
}

type SplitLineKey = keyof SplitLineAlignment

const ALIGNMENT_STORAGE_KEY = 'utex-magnetic-stack-ui-alignment'

const DEFAULT_ALIGNMENT: UiAlignment = {
  leftLabels: {
    x: -8,
    y: -31,
    perspective: 1030,
    rotateX: 7.5,
    rotateY: 7,
    rotateZ: 3.8,
    originX: 0,
    originY: 50,
    scale: 1,
  },
  rightMetrics: {
    x: -44,
    y: -109,
    perspective: 2290,
    rotateX: 0,
    rotateY: 74,
    rotateZ: 0,
    originX: 150,
    originY: -130,
    scale: 1,
  },
  card: {
    x: -15,
    y: -19,
    perspective: 3610,
    rotateX: 0,
    rotateY: -25,
    rotateZ: 0,
    originX: 50,
    originY: -56,
    scale: 1.09,
  },
  splitLine: {
    leftY: 39.9,
    rightY: 53.4,
    overlap: 0.04,
  },
}

const TRANSFORM_CONTROLS: Array<{
  key: TransformKey
  label: string
  min: number
  max: number
  step: number
  unit: string
}> = [
  { key: 'x', label: 'X', min: -160, max: 160, step: 1, unit: 'px' },
  { key: 'y', label: 'Y', min: -160, max: 160, step: 1, unit: 'px' },
  { key: 'perspective', label: 'Perspective', min: 100, max: 5000, step: 10, unit: 'px' },
  { key: 'rotateX', label: 'Rotate X', min: -80, max: 80, step: 0.5, unit: '°' },
  { key: 'rotateY', label: 'Rotate Y', min: -80, max: 80, step: 0.5, unit: '°' },
  { key: 'rotateZ', label: 'Rotate Z', min: -45, max: 45, step: 0.1, unit: '°' },
]

const ORIGIN_CONTROLS: typeof TRANSFORM_CONTROLS = [
  { key: 'originX', label: 'Origin X', min: -150, max: 150, step: 1, unit: '%' },
  { key: 'originY', label: 'Origin Y', min: -150, max: 150, step: 1, unit: '%' },
]

const SCALE_CONTROL: typeof TRANSFORM_CONTROLS = [
  { key: 'scale', label: 'Scale', min: 0.5, max: 1.8, step: 0.01, unit: '×' },
]

function useLayerMotion(
  pointerX: MotionValue<number>,
  pointerY: MotionValue<number>,
  strength: number,
  direction: number,
  stiffness: number,
): LayerMotion {
  const targetX = useTransform(pointerX, [-1, 1], [-strength * direction, strength * direction])
  const targetY = useTransform(pointerY, [-1, 1], [-strength * 1.8, strength * 1.8])
  const targetRotateZ = useTransform(pointerX, [-1, 1], [-0.28 * direction, 0.28 * direction])

  return {
    x: useSpring(targetX, { stiffness, damping: 17, mass: 1.1 }),
    y: useSpring(targetY, { stiffness: stiffness * 0.72, damping: 9, mass: 0.95 }),
    rotateZ: useSpring(targetRotateZ, { stiffness: stiffness * 0.86, damping: 14, mass: 1 }),
  }
}

function Brand() {
  return (
    <span className="ms-brand" aria-label="UTEX Pay">
      <span className="ms-brand__utex">UTEX</span>
      <span className="ms-brand__pay">PAY</span>
    </span>
  )
}

function ContactlessIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="ms-contactless">
      <path d="M6 18c2.5-2.2 2.5-5.8 0-8M11 21c4.4-3.9 4.4-10.1 0-14M16 24c6.2-5.5 6.2-14.5 0-20" />
    </svg>
  )
}

function Chip() {
  return (
    <span className="ms-chip" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

function MetricIcon({ type }: { type: StackLayerProps['icon'] }) {
  if (type === 'team') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="7" cy="7" r="3" />
        <circle cx="14" cy="8" r="2.2" />
        <path d="M2.8 16c.3-3.1 1.8-4.7 4.3-4.7s4 1.6 4.3 4.7M12 12.3c2.9-.4 4.6.8 5.1 3.7" />
      </svg>
    )
  }

  if (type === 'eye') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M2.2 10s2.8-4.3 7.8-4.3 7.8 4.3 7.8 4.3-2.8 4.3-7.8 4.3S2.2 10 2.2 10Z" />
        <circle cx="10" cy="10" r="2.1" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7.3" />
      <path d="m6.8 10.1 2.1 2.1 4.5-4.7" />
    </svg>
  )
}

function StackLayer({
  className,
  part,
  label,
  metric,
  metricDetail,
  icon,
  motionValues,
  float,
  duration,
  introDelay,
}: StackLayerProps) {
  const isFront = part === 'front'
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={`ms-layer ${className} ms-layer--${part}`}
      style={motionValues}
      aria-hidden={!isFront}
      initial={prefersReducedMotion ? false : 'outside'}
      whileInView="resting"
      viewport={{ once: true, amount: 0.12 }}
    >
      <motion.div
        className="ms-layer__intro"
        variants={{
          outside: { y: '110vh' },
          resting: { y: '0vh' },
        }}
        transition={{ duration: 1.15, delay: introDelay, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="ms-layer__float"
          animate={{ y: [0, -float, 0, float * 0.42, 0] }}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            aria-hidden="true"
            className="ms-layer__image"
            viewBox="0 0 1635 962"
            preserveAspectRatio="xMidYMid meet"
          >
            <image
              href="/magnetic-platform.png"
              width="1635"
              height="962"
            />
          </svg>
          {isFront && (
            <>
              <span className="ms-layer__label">{label}</span>
              <span className="ms-layer__metric">
                <span className="ms-layer__metric-icon"><MetricIcon type={icon} /></span>
                <span className="ms-layer__metric-copy">
                  <strong>{metric}</strong>
                  <small>{metricDetail}</small>
                </span>
                <span className="ms-layer__metric-arrow" aria-hidden="true">›</span>
              </span>
            </>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function CardFace() {
  return (
    <>
      <div className="ms-card__shine" />
      <div className="ms-card__head">
        <Chip />
        <ContactlessIcon />
      </div>
      <div className="ms-card__brand"><span>UTEX</span><b>PAY</b></div>
      <div className="ms-card__midline" />
      <div className="ms-card__number">•••• 4622</div>
      <div className="ms-card__circles"><i /><i /></div>
    </>
  )
}

function FloatingCard({
  pointerX,
  scrollProgress,
  alignment,
}: {
  pointerX: MotionValue<number>
  scrollProgress: MotionValue<number>
  alignment: UiTransform
}) {
  const targetX = useTransform(pointerX, [-1, 1], [alignment.x - 7, alignment.x + 7])
  const x = useSpring(targetX, { stiffness: 72, damping: 18, mass: 1.05 })
  const y = useTransform(
    scrollProgress,
    [0, 0.68, 1],
    [alignment.y, alignment.y + 18, alignment.y + 70],
  )
  const rotateX = useTransform(scrollProgress, [0, 0.72, 0.96], [alignment.rotateX, alignment.rotateX, 0])
  const rotateY = useTransform(scrollProgress, [0, 0.72, 0.96], [alignment.rotateY, alignment.rotateY, 0])
  const rotateZ = useTransform(scrollProgress, [0, 0.72, 0.96], [alignment.rotateZ, alignment.rotateZ, 0])
  const perspective = useTransform(
    scrollProgress,
    [0, 0.72, 0.96],
    [alignment.perspective, alignment.perspective, 5000],
  )
  const leftX = useTransform(scrollProgress, [0, 0.79, 0.94, 1], ['0%', '0%', '-88%', '-104%'])
  const rightX = useTransform(scrollProgress, [0, 0.79, 0.94, 1], ['0%', '0%', '88%', '104%'])
  const sideY = useTransform(scrollProgress, [0, 0.79, 1], [0, 0, 24])
  const leftRotate = useTransform(scrollProgress, [0, 0.79, 1], [alignment.rotateZ, alignment.rotateZ, -8])
  const rightRotate = useTransform(scrollProgress, [0, 0.79, 1], [alignment.rotateZ, alignment.rotateZ, 8])

  return (
    <motion.div
      className="ms-card-cluster"
      style={{ x, y }}
    >
      <motion.div
        className="ms-card ms-card--satellite ms-card--satellite-left"
        style={{
          x: leftX,
          y: sideY,
          rotateX,
          rotateY,
          rotateZ: leftRotate,
          scale: alignment.scale,
          originX: alignment.originX / 100,
          originY: alignment.originY / 100,
          transformPerspective: perspective,
        }}
        aria-hidden="true"
      >
        <CardFace />
      </motion.div>
      <motion.div
        className="ms-card ms-card--satellite ms-card--satellite-right"
        style={{
          x: rightX,
          y: sideY,
          rotateX,
          rotateY,
          rotateZ: rightRotate,
          scale: alignment.scale,
          originX: alignment.originX / 100,
          originY: alignment.originY / 100,
          transformPerspective: perspective,
        }}
        aria-hidden="true"
      >
        <CardFace />
      </motion.div>
      <motion.div
        className="ms-card ms-card--primary"
        style={{
          rotateX,
          rotateY,
          rotateZ,
          scale: alignment.scale,
          originX: alignment.originX / 100,
          originY: alignment.originY / 100,
          transformPerspective: perspective,
        }}
        aria-label="UTEX Pay gold card"
      >
        <CardFace />
      </motion.div>
    </motion.div>
  )
}

function TransformControls({
  title,
  values,
  onChange,
  includeOrigin = false,
  includeScale = false,
}: {
  title: string
  values: UiTransform
  onChange: (key: TransformKey, value: number) => void
  includeOrigin?: boolean
  includeScale?: boolean
}) {
  const controls = [
    ...TRANSFORM_CONTROLS,
    ...(includeOrigin ? ORIGIN_CONTROLS : []),
    ...(includeScale ? SCALE_CONTROL : []),
  ]

  return (
    <fieldset className="ms-tuner__group">
      <legend>{title}</legend>
      {controls.map((control) => (
        <label className="ms-tuner__row" key={control.key}>
          <span>{control.label}</span>
          <input
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={values[control.key]}
            onChange={(event) => onChange(control.key, Number(event.currentTarget.value))}
          />
          <span className="ms-tuner__number">
            <input
              type="number"
              step={control.step}
              value={values[control.key]}
              onChange={(event) => onChange(control.key, Number(event.currentTarget.value))}
            />
            <em>{control.unit}</em>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function SplitLineControls({
  values,
  onChange,
}: {
  values: SplitLineAlignment
  onChange: (key: SplitLineKey, value: number) => void
}) {
  const controls: Array<{
    key: SplitLineKey
    label: string
    min: number
    max: number
    step: number
  }> = [
    { key: 'leftY', label: 'Left Y', min: 20, max: 60, step: 0.1 },
    { key: 'rightY', label: 'Right Y', min: 30, max: 70, step: 0.1 },
    { key: 'overlap', label: 'Overlap', min: 0, max: 2, step: 0.05 },
  ]

  return (
    <fieldset className="ms-tuner__group">
      <legend>Split line</legend>
      {controls.map((control) => (
        <label className="ms-tuner__row" key={control.key}>
          <span>{control.label}</span>
          <input
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={values[control.key]}
            onChange={(event) => onChange(control.key, Number(event.currentTarget.value))}
          />
          <span className="ms-tuner__number">
            <input
              type="number"
              step={control.step}
              value={values[control.key]}
              onChange={(event) => onChange(control.key, Number(event.currentTarget.value))}
            />
            <em>%</em>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function AlignmentTuner({
  alignment,
  onChange,
  onSplitChange,
  onReset,
}: {
  alignment: UiAlignment
  onChange: (group: TransformGroup, key: TransformKey, value: number) => void
  onSplitChange: (key: SplitLineKey, value: number) => void
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const serialized = JSON.stringify(alignment, null, 2)

  const copyValues = async () => {
    try {
      await navigator.clipboard.writeText(serialized)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <details
      className="ms-tuner"
      onPointerMove={(event) => event.stopPropagation()}
      onPointerLeave={(event) => event.stopPropagation()}
    >
      <summary><span>UI alignment</span><small>live controls</small></summary>
      <div className="ms-tuner__body">
        <TransformControls
          title="Left labels"
          values={alignment.leftLabels}
          onChange={(key, value) => onChange('leftLabels', key, value)}
        />
        <TransformControls
          title="Right metrics"
          values={alignment.rightMetrics}
          includeOrigin
          onChange={(key, value) => onChange('rightMetrics', key, value)}
        />
        <TransformControls
          title="Card"
          values={alignment.card}
          includeOrigin
          includeScale
          onChange={(key, value) => onChange('card', key, value)}
        />
        <SplitLineControls values={alignment.splitLine} onChange={onSplitChange} />
        <div className="ms-tuner__values">
          <span>Send me these values</span>
          <pre>{serialized}</pre>
        </div>
        <div className="ms-tuner__actions">
          <button type="button" onClick={onReset}>Reset</button>
          <button type="button" className="ms-tuner__copy" onClick={copyValues}>{copied ? 'Copied' : 'Copy values'}</button>
        </div>
      </div>
    </details>
  )
}

export function MagneticStackHero() {
  const stageRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const [alignment, setAlignment] = useState<UiAlignment>(DEFAULT_ALIGNMENT)
  const [alignmentLoaded, setAlignmentLoaded] = useState(false)
  const topMotion = useLayerMotion(pointerX, pointerY, 12, 1, 72)
  const middleMotion = useLayerMotion(pointerX, pointerY, 9, -0.72, 58)
  const bottomMotion = useLayerMotion(pointerX, pointerY, 7, 0.5, 46)
  const { scrollYProgress: stageScrollProgress } = useScroll({
    target: stageRef,
    offset: ['start center', 'end center'],
  })

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ALIGNMENT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UiAlignment>
        setAlignment({
          leftLabels: { ...DEFAULT_ALIGNMENT.leftLabels, ...parsed.leftLabels },
          rightMetrics: { ...DEFAULT_ALIGNMENT.rightMetrics, ...parsed.rightMetrics },
          card: { ...DEFAULT_ALIGNMENT.card, ...parsed.card },
          splitLine: { ...DEFAULT_ALIGNMENT.splitLine, ...parsed.splitLine },
        })
      }
    } catch {
      // Keep the defaults when stored experiment values are unavailable.
    }
    setAlignmentLoaded(true)
  }, [])

  useEffect(() => {
    if (!alignmentLoaded) return
    window.localStorage.setItem(ALIGNMENT_STORAGE_KEY, JSON.stringify(alignment))
  }, [alignment, alignmentLoaded])

  const updateAlignment = (group: TransformGroup, key: TransformKey, value: number) => {
    setAlignment((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }))
  }

  const updateSplitLine = (key: SplitLineKey, value: number) => {
    setAlignment((current) => ({
      ...current,
      splitLine: { ...current.splitLine, [key]: value },
    }))
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || event.pointerType === 'touch') return
    pointerX.set(Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2)))
    pointerY.set(Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2)))
  }

  const resetPointer = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <section
      className={`magnetic-stack${prefersReducedMotion ? ' magnetic-stack--reduced' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      aria-labelledby="magnetic-stack-title"
      style={{
        '--ms-label-x': `${alignment.leftLabels.x}px`,
        '--ms-label-y': `${alignment.leftLabels.y}px`,
        '--ms-label-perspective': `${alignment.leftLabels.perspective}px`,
        '--ms-label-rx': `${alignment.leftLabels.rotateX}deg`,
        '--ms-label-ry': `${alignment.leftLabels.rotateY}deg`,
        '--ms-label-rz': `${alignment.leftLabels.rotateZ}deg`,
        '--ms-metric-x': `${alignment.rightMetrics.x}px`,
        '--ms-metric-y': `${alignment.rightMetrics.y}px`,
        '--ms-metric-perspective': `${alignment.rightMetrics.perspective}px`,
        '--ms-metric-rx': `${alignment.rightMetrics.rotateX}deg`,
        '--ms-metric-ry': `${alignment.rightMetrics.rotateY}deg`,
        '--ms-metric-rz': `${alignment.rightMetrics.rotateZ}deg`,
        '--ms-metric-origin-x': `${alignment.rightMetrics.originX}%`,
        '--ms-metric-origin-y': `${alignment.rightMetrics.originY}%`,
        '--ms-split-left-y': `${alignment.splitLine.leftY}%`,
        '--ms-split-right-y': `${alignment.splitLine.rightY}%`,
        '--ms-split-overlap': `${alignment.splitLine.overlap}%`,
      } as CSSProperties}
    >
      <div className="ms-sticky">
        <div className="ms-atmosphere" aria-hidden="true">
          <div className="ms-atmosphere__column ms-atmosphere__column--one" />
          <div className="ms-atmosphere__column ms-atmosphere__column--two" />
          <div className="ms-atmosphere__column ms-atmosphere__column--three" />
          <div className="ms-atmosphere__column ms-atmosphere__column--four" />
          <div className="ms-atmosphere__haze" />
        </div>

        <header className="ms-nav">
          <a className="ms-nav__brand" href="#top"><Brand /></a>
          <nav aria-label="Main navigation" className="ms-nav__links">
            <a href="#banking">Banking</a>
            <a href="#payments">Payments</a>
            <a href="#developers">Developers</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="ms-nav__actions">
            <a className="ms-nav__login" href="#login">Log in</a>
            <a className="ms-button ms-button--small" href="#signup">Sign up</a>
          </div>
        </header>

        <div className="ms-copy" id="top">
          <p className="ms-eyebrow">One account. Room to grow.</p>
          <h1 id="magnetic-stack-title">The bank that grows with you.</h1>
          <p className="ms-description">Personal banking, business tools and card payments—<br className="ms-description__break" /> connected in one place.</p>
          <div className="ms-ctas">
            <a className="ms-button" href="#signup">Open an account</a>
            <a className="ms-button ms-button--outline" href="#sales">Talk to sales</a>
          </div>
        </div>

        <div ref={stageRef} className="ms-stage" aria-label="Personal, business, and payments account layers">
          <div className="ms-stage__halo" aria-hidden="true" />

          <StackLayer
            className="ms-layer--top"
            part="back"
            label="Payments"
            metric="€125.00 accepted"
            metricDetail="Today · 12 payments"
            icon="check"
            motionValues={topMotion}
            float={4.5}
            duration={6.2}
            introDelay={0.15}
          />
          <StackLayer
            className="ms-layer--middle"
            part="back"
            label="Business"
            metric="3 team members"
            metricDetail="2 active now"
            icon="team"
            motionValues={middleMotion}
            float={3.5}
            duration={7.1}
            introDelay={0.32}
          />
          <StackLayer
            className="ms-layer--bottom"
            part="back"
            label="Personal"
            metric="€28,142.55"
            metricDetail="Available balance"
            icon="eye"
            motionValues={bottomMotion}
            float={2.5}
            duration={8.2}
            introDelay={0.49}
          />

          <div className="ms-card-anchor">
            <div className="ms-card-anchor__inner">
              <FloatingCard
                pointerX={pointerX}
                scrollProgress={stageScrollProgress}
                alignment={alignment.card}
              />
            </div>
          </div>

          <StackLayer
            className="ms-layer--top"
            part="front"
            label="Payments"
            metric="€125.00 accepted"
            metricDetail="Today · 12 payments"
            icon="check"
            motionValues={topMotion}
            float={4.5}
            duration={6.2}
            introDelay={0.15}
          />
          <StackLayer
            className="ms-layer--middle"
            part="front"
            label="Business"
            metric="3 team members"
            metricDetail="2 active now"
            icon="team"
            motionValues={middleMotion}
            float={3.5}
            duration={7.1}
            introDelay={0.32}
          />
          <StackLayer
            className="ms-layer--bottom"
            part="front"
            label="Personal"
            metric="€28,142.55"
            metricDetail="Available balance"
            icon="eye"
            motionValues={bottomMotion}
            float={2.5}
            duration={8.2}
            introDelay={0.49}
          />
          <p className="ms-move-hint" aria-hidden="true"><span /> Scroll the stack through the card</p>
        </div>

      </div>
      <AlignmentTuner
        alignment={alignment}
        onChange={updateAlignment}
        onSplitChange={updateSplitLine}
        onReset={() => setAlignment(DEFAULT_ALIGNMENT)}
      />
    </section>
  )
}

export default MagneticStackHero
