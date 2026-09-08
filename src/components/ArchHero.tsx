import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { ArchFloor, FLOOR_DEFAULTS } from './ArchFloor'
import type { FloorSettings } from './ArchFloor'
import './arch-hero.css'

/* ------------------------------------------------------------------
   The arch hero.

   - the arch itself is the 3D render plate (public/arch-structure.png)
   - the nav, copy, the three surface slots, the card and the inner
     light trace are HTML/SVG sitting in the plate's own coordinate space
   - the floor light lines are a three.js scene (ArchFloor), drawn
     additively in front of the plate

   The fan never overlaps the arch — it converges inside the opening and
   only widens once it is past the feet — so the plate does not need to
   be cut out of its background.

   Append ?ref to the URL for the calibration overlay: it lays the target
   render over the page and gives sliders for the plate, card and floor.
   ------------------------------------------------------------------ */

const STORAGE_KEY = 'utex-arch-hero-calibration'

/* The floor lines show everywhere EXCEPT the arch itself. ARCH_SILHOUETTE is
   the shape drawn in Figma (a 754 x 385 space); it is placed into the plate's
   1672 x 941 user space by the mask* controls, then knocked out of a full
   white field so it becomes a hole.

   The knock-out is an SVG <mask> rather than fill-rule, because the shape
   needs its own transform. The blur lives on a wrapping <g> so it is applied
   AFTER the mask — a filter on the masked element itself would blur first and
   then be cut, which loses the soft edge.

   Append ?mask to the URL to see the shape painted over the page. */
const ARCH_SILHOUETTE =
  'M0 371.477L49.2548 384.279L196.148 380.554L197.043 141.924C197.101 126.663 209.785 114.483 225.035 115.044' +
  'L531.12 126.295C547.786 126.907 560.981 140.596 560.981 157.274V364.065C560.981 367.614 563.638 370.602 567.163 371.017' +
  'L614.699 376.609L754 374.235L753.137 85.2121C753.06 59.3606 732.913 38.0161 707.109 36.4485L108.83 0.103105' +
  'C99.9186 -0.438249 91.0071 1.15877 82.8385 4.76099L35.7905 25.5083C14.0374 35.1011 0 56.633 0 80.4073V371.477Z'

function buildFloorMask(
  v: { maskX: number; maskY: number; maskScale: number; maskScaleY: number; maskBlur: number },
  k: number,
) {
  const W = 1672
  const H = 941
  // k is the floor box's width as a multiple of the plate; the viewBox has to
  // match it exactly or preserveAspectRatio="none" stretches the silhouette
  // off the arch
  const box = [(-(k - 1) / 2) * W, 0.3 * H, k * W, 0.73 * H].map((n) => n.toFixed(1)).join(' ')
  const field = 'x="-600" y="200" width="2900" height="1000"'
  const transform = `translate(${v.maskX} ${v.maskY}) scale(${v.maskScale} ${v.maskScale * v.maskScaleY})`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" preserveAspectRatio="none">` +
    `<defs>` +
    `<filter id="b" x="-8%" y="-8%" width="116%" height="116%">` +
    `<feGaussianBlur stdDeviation="${v.maskBlur}"/></filter>` +
    `<mask id="cut" maskUnits="userSpaceOnUse" ${field}>` +
    `<rect ${field} fill="#fff"/>` +
    `<path transform="${transform}" d="${ARCH_SILHOUETTE}" fill="#000"/>` +
    `</mask>` +
    `</defs>` +
    `<g filter="url(#b)"><rect ${field} fill="#fff" mask="url(#cut)"/></g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

type Calibration = {
  plateW: number
  plateX: number
  plateY: number
  cardW: number
  cardX: number
  cardY: number
  refOpacity: number
  maskX: number
  maskY: number
  maskScale: number
  maskScaleY: number
  maskBlur: number
  maskTint: number
  uiPersp: number
  uiOriginX: number
  uiOriginY: number
  uiRotY: number
  uiRotX: number
  glowX: number
  glowY: number
  glowScale: number
  glowScaleY: number
  glowWidth: number
  glowBright: number
  shadowW: number
  shadowBlur: number
  shadowO: number
  shadowDy: number
} & FloorSettings

const DEFAULTS: Calibration = {
  plateW: 74,
  plateX: 12.7,
  plateY: 25.5,
  cardW: 8.6,
  cardX: 50.6,
  cardY: 51.5,
  refOpacity: 45,
  maskX: 216,
  maskY: 178,
  maskScale: 1.674,
  maskScaleY: 1.015,
  maskBlur: 3.5,
  maskTint: 0,
  uiPersp: 150,
  uiOriginX: 38,
  uiOriginY: 118,
  uiRotY: 13,
  uiRotX: 2,
  glowX: 566,
  glowY: 375,
  glowScale: 1.665,
  glowScaleY: 1.05,
  glowWidth: 1,
  glowBright: 1,
  shadowW: 1.3,
  shadowBlur: 0.8,
  shadowO: 0.8,
  shadowDy: -0.4,
  ...FLOOR_DEFAULTS,
}

type Control = {
  key: keyof Calibration
  group: string
  label: string
  min: number
  max: number
  step: number
  unit: string
}

const CONTROLS: Control[] = [
  { key: 'plateW', group: 'Plate', label: 'Width', min: 40, max: 110, step: 0.1, unit: '%' },
  { key: 'plateX', group: 'Plate', label: 'X', min: -20, max: 50, step: 0.1, unit: '%' },
  { key: 'plateY', group: 'Plate', label: 'Y', min: -10, max: 60, step: 0.1, unit: '%' },
  { key: 'cardW', group: 'Card', label: 'Width', min: 4, max: 24, step: 0.1, unit: '%' },
  { key: 'cardX', group: 'Card', label: 'X', min: 30, max: 70, step: 0.1, unit: '%' },
  { key: 'cardY', group: 'Card', label: 'Y', min: 20, max: 75, step: 0.1, unit: '%' },
  { key: 'shadowW', group: 'Card', label: 'Shadow W', min: 0.3, max: 3, step: 0.02, unit: '\u00d7' },
  { key: 'shadowBlur', group: 'Card', label: 'Shadow blur', min: 0, max: 4, step: 0.05, unit: '' },
  { key: 'shadowO', group: 'Card', label: 'Shadow opacity', min: 0, max: 1, step: 0.02, unit: '' },
  { key: 'shadowDy', group: 'Card', label: 'Shadow Y', min: -4, max: 4, step: 0.05, unit: '' },
  { key: 'count', group: 'Floor', label: 'Lines', min: 8, max: 90, step: 1, unit: '' },
  { key: 'spread', group: 'Floor', label: 'Spread', min: 6, max: 80, step: 0.5, unit: '°' },
  { key: 'width', group: 'Floor', label: 'Thickness', min: 0.008, max: 0.3, step: 0.002, unit: '' },
  { key: 'bright', group: 'Floor', label: 'Brightness', min: 0, max: 3, step: 0.02, unit: '' },
  { key: 'speed', group: 'Floor', label: 'Speed', min: 0, max: 3, step: 0.05, unit: '' },
  { key: 'bow', group: 'Floor', label: 'Curve', min: 0, max: 3.5, step: 0.05, unit: '' },
  { key: 'snake', group: 'Floor', label: 'Snake', min: 0, max: 1.2, step: 0.01, unit: '' },
  { key: 'snakeFreq', group: 'Floor', label: 'Snake freq', min: 0.05, max: 2, step: 0.01, unit: '' },
  { key: 'wave', group: 'Floor', label: 'Pulse', min: 0.02, max: 0.8, step: 0.01, unit: '' },
  { key: 'fade', group: 'Floor', label: 'Depth fade', min: 2, max: 34, step: 0.5, unit: '' },
  { key: 'glow', group: 'Floor', label: 'Bloom', min: 0, max: 5, step: 0.05, unit: '' },
  { key: 'glowRadius', group: 'Floor', label: 'Bloom size', min: 0.1, max: 0.98, step: 0.01, unit: '' },
  { key: 'camY', group: 'Floor', label: 'Cam height', min: 0.3, max: 9, step: 0.05, unit: '' },
  { key: 'camZ', group: 'Floor', label: 'Cam dist', min: 1, max: 24, step: 0.1, unit: '' },
  { key: 'lookY', group: 'Floor', label: 'Look Y', min: -10, max: 5, step: 0.05, unit: '' },
  { key: 'originZ', group: 'Floor', label: 'Origin Z', min: -60, max: 0, step: 0.5, unit: '' },
  { key: 'reach', group: 'Floor', label: 'Reach', min: 5, max: 140, step: 1, unit: '' },
  { key: 'maskX', group: 'Mask', label: 'X', min: 0, max: 600, step: 1, unit: '' },
  { key: 'maskY', group: 'Mask', label: 'Y', min: 0, max: 500, step: 1, unit: '' },
  { key: 'maskScale', group: 'Mask', label: 'Scale', min: 1, max: 2.6, step: 0.002, unit: '' },
  { key: 'maskScaleY', group: 'Mask', label: 'Scale Y', min: 0.7, max: 1.5, step: 0.005, unit: '' },
  { key: 'maskBlur', group: 'Mask', label: 'Feather', min: 0, max: 40, step: 0.5, unit: '' },
  { key: 'uiRotY', group: 'UI', label: 'Rotate Y', min: -30, max: 30, step: 0.5, unit: '\u00b0' },
  { key: 'uiRotX', group: 'UI', label: 'Rotate X', min: -20, max: 20, step: 0.5, unit: '\u00b0' },
  { key: 'uiPersp', group: 'UI', label: 'Perspective', min: 40, max: 400, step: 2, unit: '' },
  { key: 'uiOriginX', group: 'UI', label: 'Origin X', min: -50, max: 150, step: 1, unit: '%' },
  { key: 'uiOriginY', group: 'UI', label: 'Origin Y', min: -50, max: 250, step: 1, unit: '%' },
  { key: 'glowX', group: 'Glow line', label: 'X', min: 300, max: 900, step: 1, unit: '' },
  { key: 'glowY', group: 'Glow line', label: 'Y', min: 150, max: 700, step: 1, unit: '' },
  { key: 'glowScale', group: 'Glow line', label: 'Scale', min: 0.8, max: 3, step: 0.005, unit: '' },
  { key: 'glowScaleY', group: 'Glow line', label: 'Scale Y', min: 0.5, max: 2, step: 0.005, unit: '' },
  { key: 'glowWidth', group: 'Glow line', label: 'Thickness', min: 0.2, max: 5, step: 0.05, unit: '' },
  { key: 'glowBright', group: 'Glow line', label: 'Brightness', min: 0, max: 2, step: 0.02, unit: '' },
  { key: 'maskTint', group: 'Overlay', label: 'Mask tint', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'refOpacity', group: 'Overlay', label: 'Reference', min: 0, max: 100, step: 1, unit: '%' },
]

function Wordmark() {
  return (
    <span className="ah-brand" aria-label="UTEX Pay">
      UTEX<b>PAY</b>
    </span>
  )
}

const BALANCES = [
  { code: 'EUR', symbol: '\u20ac', amount: '\u20ac18,432.55', tone: 'eur' },
  { code: 'USD', symbol: '$', amount: '$5,820.40', tone: 'usd' },
  { code: 'GBP', symbol: '\u00a3', amount: '\u00a33,540.00', tone: 'gbp' },
]

// ascending monthly volume, as a share of the tallest bar
const VOLUME = [0.22, 0.3, 0.27, 0.42, 0.5, 0.63, 0.6, 0.78, 1]

function CheckIcon() {
  return (
    <svg className="ah-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.4" />
      <path d="m6.4 10.2 2.4 2.4 4.9-5.2" />
    </svg>
  )
}

function PersonalPanel() {
  return (
    <div className="ah-slot ah-slot--personal-panel ah-face">
      <p className="ah-face__label">Total balance</p>
      <p className="ah-face__figure">€28,142.55</p>
      <ul className="ah-rows">
        {BALANCES.map((b) => (
          <li key={b.code}>
            <span className={`ah-coin ah-coin--${b.tone}`}>{b.symbol}</span>
            <span className="ah-rows__code">{b.code}</span>
            <span className="ah-rows__amt">{b.amount}</span>
            <span className="ah-rows__chev">›</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BusinessBar() {
  return (
    <div className="ah-slot ah-slot--business-bar ah-face ah-face--bar">
      <span className="ah-bar__name">Acme Cycling Ltd</span>
      <span className="ah-avatars" aria-hidden="true">
        <i>AC</i>
        <i>SR</i>
        <i>DM</i>
      </span>
      <span className="ah-bar__cta">Review</span>
    </div>
  )
}

function ProcessingPanel() {
  return (
    <div className="ah-slot ah-slot--payments-panel ah-face">
      <p className="ah-face__accepted">
        <CheckIcon />
        Payment accepted
      </p>
      <p className="ah-face__credit">+€125.00</p>
      <hr className="ah-face__rule" />
      <p className="ah-face__figure ah-face__figure--sm">€24,560</p>
      <p className="ah-face__label">this month</p>
      <div className="ah-volume" aria-hidden="true">
        {VOLUME.map((h, i) => (
          <i key={i} style={{ height: `${h * 100}%` }} />
        ))}
      </div>
    </div>
  )
}

/* The glowing line inside the opening — the path drawn in Figma, in its own
   354 x 255 space, placed into the plate by the glow* controls.

   Stroke widths and blur radii are in the path's LOCAL units, so they scale
   with glowScale along with the geometry. The fade gradient uses
   userSpaceOnUse because objectBoundingBox units collapse on the path's
   vertical segment. */
const GLOW_PATH =
  'M352.013 255.009V42.1491C352.013 25.4091 338.722 11.6928 321.991 11.1645L0.0317383 0.999023'

function ArchGlow({
  x,
  y,
  scale,
  scaleY,
  width,
  bright,
}: {
  x: number
  y: number
  scale: number
  scaleY: number
  width: number
  bright: number
}) {
  const transform = `translate(${x} ${y}) scale(${scale} ${scale * scaleY})`
  const fade = (id: string, color: string, top: number, mid: number) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="255">
      <stop offset="0" stopColor={color} stopOpacity={Math.min(1, top * bright)} />
      <stop offset="0.42" stopColor={color} stopOpacity={Math.min(1, mid * bright)} />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </linearGradient>
  )

  return (
    <svg className="ah-glow" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="ah-bloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={width * 11} />
        </filter>
        <filter id="ah-bloom-tight" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={width * 3.4} />
        </filter>
        {fade('ah-trace-halo', '#ffa634', 0.62, 0.4)}
        {fade('ah-trace-mid', '#ffcd78', 0.9, 0.6)}
        {fade('ah-trace-core', '#ffeec8', 0.95, 0.62)}
      </defs>
      <g transform={transform}>
        <path
          className="ah-glow__halo"
          stroke="url(#ah-trace-halo)"
          strokeWidth={width * 11}
          d={GLOW_PATH}
        />
        <path
          className="ah-glow__mid"
          stroke="url(#ah-trace-mid)"
          strokeWidth={width * 3.4}
          d={GLOW_PATH}
        />
        <path
          className="ah-glow__core"
          stroke="url(#ah-trace-core)"
          strokeWidth={width}
          d={GLOW_PATH}
        />
      </g>
    </svg>
  )
}

function Card() {
  return (
    <>
      {/* contact shadow: its own blurred element, so it darkens the floor
          lines under the card instead of being clipped to the card's box */}
      <div className="ah-card-shadow" aria-hidden="true" />
      <div className="ah-card">
        <img className="ah-card__art" src="/utex-card.png" alt="UTEX Pay gold card" draggable={false} />
        {/* masked to the card's own alpha so the sweep follows the angled
            silhouette instead of a bounding rectangle */}
        <span className="ah-card__shine" aria-hidden="true" />
      </div>
    </>
  )
}

function Tuner({
  values,
  onChange,
  onReset,
}: {
  values: Calibration
  onChange: (key: keyof Calibration, value: number) => void
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const groups = [...new Set(CONTROLS.map((control) => control.group))]

  return (
    <details className="ah-tuner" open>
      <summary>Arch calibration</summary>
      {groups.map((group) => (
        <fieldset className="ah-tuner__group" key={group}>
          <legend>{group}</legend>
          {CONTROLS.filter((control) => control.group === group).map((control) => (
            <label className="ah-tuner__row" key={control.key}>
              <span>{control.label}</span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={values[control.key]}
                onChange={(event) => onChange(control.key, Number(event.currentTarget.value))}
              />
              <output>
                {values[control.key]}
                {control.unit}
              </output>
            </label>
          ))}
        </fieldset>
      ))}
      <div className="ah-tuner__actions">
        <button type="button" onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(JSON.stringify(values, null, 2))
              .then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1400)
              })
              .catch(() => setCopied(false))
          }}
        >
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>
    </details>
  )
}

export function ArchHero() {
  // WebGL and localStorage are client-only; this route is prerendered.
  const [mounted, setMounted] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [showMask, setShowMask] = useState(false)
  const [showRef, setShowRef] = useState(false)
  const [still, setStill] = useState(false)
  const [values, setValues] = useState<Calibration>(DEFAULTS)
  // How far the floor box is inflated past the plate. On a wide, short screen
  // the stage is height-limited, so a fixed 1.4x leaves black bars either side
  // of the fan — widen it until it covers the viewport.
  const [floorK, setFloorK] = useState(1.4)
  const plateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const query = new URLSearchParams(window.location.search)
    // ?ref lays the target render over the page, ?mask paints the floor mask;
    // either one brings up the tuner, but they are not shown together
    setCalibrating(query.has('ref') || query.has('mask'))
    setShowMask(query.has('mask'))
    setShowRef(query.has('ref') && !query.has('mask'))
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setValues({ ...DEFAULTS, ...(JSON.parse(saved) as Partial<Calibration>) })
    } catch {
      // fall back to the defaults when stored values are unreadable
    }
  }, [])

  useEffect(() => {
    const plate = plateRef.current
    if (!plate) return
    const measure = () => {
      const width = plate.getBoundingClientRect().width
      if (width > 0) setFloorK(Math.max(1.4, (window.innerWidth + 48) / width))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(plate)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const update = (key: keyof Calibration, value: number) => {
    setValues((current) => {
      const next = { ...current, [key]: value }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // calibration is a dev affordance; losing it is fine
      }
      return next
    })
  }

  const reset = () => {
    setValues(DEFAULTS)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const floorMask = buildFloorMask(values, floorK)

  return (
    <section
      className="arch-hero"
      aria-labelledby="arch-hero-title"
      style={
        {
          '--ah-plate-w': values.plateW,
          '--ah-plate-x': values.plateX,
          '--ah-plate-y': values.plateY,
          '--ah-card-w': values.cardW,
          '--ah-card-x': values.cardX,
          '--ah-card-y': values.cardY,
          '--ah-shadow-w': values.shadowW,
          '--ah-shadow-blur': values.shadowBlur,
          '--ah-shadow-o': values.shadowO,
          '--ah-shadow-dy': values.shadowDy,
          '--ah-ref-opacity': showRef ? values.refOpacity : 0,
          '--ah-mask-tint': values.maskTint,
          '--ah-floor-k': floorK,
          '--ah-ui-persp': values.uiPersp,
          '--ah-ui-ox': values.uiOriginX,
          '--ah-ui-oy': values.uiOriginY,
          '--ah-ui-ry': values.uiRotY,
          '--ah-ui-rx': values.uiRotX,
        } as CSSProperties
      }
    >
      <div className="ah-ambience" aria-hidden="true" />
      <div className="ah-grain" aria-hidden="true" />

      <header className="ah-nav">
        <a href="#top">
          <Wordmark />
        </a>
        <nav className="ah-nav__links" aria-label="Main">
          <a href="#banking">Banking</a>
          <a href="#payments">Payments</a>
          <a href="#developers">Developers</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="ah-nav__actions">
          <a className="ah-nav__login" href="#login">
            Log in
          </a>
          <a className="ah-button ah-button--small" href="#signup">
            Sign up
          </a>
        </div>
      </header>

      <div className="ah-copy" id="top">
        <p className="ah-eyebrow">One account. Room to grow.</p>
        <h1 id="arch-hero-title">The bank that grows with you.</h1>
        <p className="ah-lede">
          Personal banking, business tools and card payments—
          <br className="ah-lede__break" />
          connected in one place.
        </p>
        <div className="ah-ctas">
          <a className="ah-button" href="#signup">
            Open an account
          </a>
          <a className="ah-button ah-button--secondary" href="#sales">
            Talk to sales
          </a>
        </div>
      </div>

      <div className="ah-stage">
        <div className="ah-plate" ref={plateRef}>
          <img className="ah-plate__img" src="/arch-structure.png" alt="" draggable={false} />

          <div className="ah-floor" aria-hidden="true" style={{ maskImage: floorMask }}>
            {mounted ? <ArchFloor settings={values} still={still} /> : null}
          </div>

          {showMask ? (
            <div className="ah-floor ah-maskview" aria-hidden="true" style={{ maskImage: floorMask }} />
          ) : null}

          <ArchGlow
            x={values.glowX}
            y={values.glowY}
            scale={values.glowScale}
            scaleY={values.glowScaleY}
            width={values.glowWidth}
            bright={values.glowBright}
          />

          <p className="ah-slot ah-slot--business ah-etch">Business banking</p>
          <BusinessBar />

          <p className="ah-slot ah-slot--personal ah-etch">
            Personal
            <br />
            Banking
          </p>
          <PersonalPanel />

          <p className="ah-slot ah-slot--payments ah-etch">
            Payment
            <br />
            Processing
          </p>
          <ProcessingPanel />

          <Card />
        </div>
      </div>

      {showRef ? <img className="ah-ref" src="/arch-reference.png" alt="" aria-hidden="true" /> : null}
      {calibrating ? <Tuner values={values} onChange={update} onReset={reset} /> : null}
    </section>
  )
}

export default ArchHero
