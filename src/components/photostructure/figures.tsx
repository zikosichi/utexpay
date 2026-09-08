import type { ReactNode } from 'react'
import './panel-figure.css'

/** A 2x160 vertical alpha ramp, baked so the chart's fade never dithers. */
const WASH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAACgCAYAAAAmYr3BAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMDdUMTU6MDk6MzErMDA6MDAJGiwiAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTA3VDE1OjA5OjMxKzAwOjAweEeUngAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0wN1QxNTowOTozMSswMDowMC9StUEAAAAuSURBVDjLY3xxaZkTAwMDAxMDFLAwMDD8JyAyzBQPfheOKh6N3FHFg8RSeioGAETzQyFxcVaDAAAAAElFTkSuQmCC'

/**
 * The three engraved faces. Each is one diagram plus one inscription: Personal
 * fans one account out to the currencies it holds, Business converges a team
 * onto one account, Payments rises. Three different shapes so the faces read
 * apart at a glance, one drawing language so they read as a set.
 *
 * Everything is CUT INTO the bronze, never sitting on it, and one light governs
 * the set: it comes from the top right. So for every shape the top-right
 * interior is in shadow and the bottom-left interior is the lit wall — that one
 * rule fixes each gradient's direction and which side catches light. No radial
 * fills: a radial reads as a dome, the opposite of a recess. The lit wall is
 * always drawn INSIDE the cut; put it outside and the shape domes again.
 *
 * These figures are baked to textures (panels.tsx → scripts/bake-panels.mjs),
 * so they cost nothing per frame and SVG filters would be allowed again. Two
 * drawing rules from the live-DOM days are kept on purpose:
 *
 *   1. Blurred inner shadows are concentric rings of falling opacity rather
 *      than filters, which keeps the bake identical across Chrome versions.
 *   2. Few edges, wide dark bodies, low contrast on anything hairline. The GPU
 *      resamples the bake with mipmaps as the camera moves, and that is what
 *      keeps thin marks from shimmering. This is why Payments is one soft
 *      filled area rather than thirty milled bars.
 *
 * Each viewBox matches the aspect of the space it is given, so `meet` scales
 * the art to fill the face instead of letterboxing it into the middle.
 */

/** Light from the top right: every gradient runs top-right → bottom-left. */
const TR_TO_BL = { x1: '1', y1: '0', x2: '0', y2: '1' } as const

/** Inlay floors sampled off Figma: the currency token (`Card · Currency`,
 *  `3041:1823`) and the avatar set (`313:18`). Dark end is the shadowed
 *  top-right wall, light end the lit bottom-left one. */
const TONES = {
  eur: ['#0a1730', '#1e3358', '#37496f'],
  usd: ['#2b262c', '#4a4046', '#755a5b'],
  gbp: ['#3d3130', '#5f4b4a', '#82706e'],
  slate: ['#2d3443', '#48566e', '#5b6578'],
  teal: ['#2d3a37', '#486260', '#596b68'],
  mauve: ['#3d3039', '#63515c', '#6d6169'],
  clay: ['#452f2e', '#6f4f4d', '#775c59'],
  sage: ['#313b34', '#4f6256', '#5e6c63'],
} as const
type Tone = keyof typeof TONES

function Defs({ id }: { id: string }) {
  return <defs>
    {/* Recess floor. The bronze face samples about #201D19, so the floor has
        to sit clearly below that or the cut reads as a dome. */}
    <linearGradient id={`${id}-floor`} {...TR_TO_BL}>
      <stop offset="0" stopColor="#0b0a07" /><stop offset=".55" stopColor="#141210" />
      <stop offset="1" stopColor="#211c15" />
    </linearGradient>
    {/* Inner shadow thrown by the near rim, strongest at the top right. */}
    <linearGradient id={`${id}-shade`} {...TR_TO_BL}>
      <stop offset="0" stopColor="#000000" stopOpacity=".95" /><stop offset=".45" stopColor="#000000" stopOpacity=".34" />
      <stop offset="1" stopColor="#000000" stopOpacity="0" />
    </linearGradient>
    {/* The far wall the light actually reaches, along the bottom-left arc. */}
    <linearGradient id={`${id}-lit`} {...TR_TO_BL}>
      <stop offset="0" stopColor="#f5e2ba" stopOpacity="0" /><stop offset=".55" stopColor="#f5e2ba" stopOpacity=".08" />
      <stop offset="1" stopColor="#f7e6c2" stopOpacity=".5" />
    </linearGradient>
    {Object.entries(TONES).map(([tone, [a, b, c]]) =>
      <linearGradient key={tone} id={`${id}-${tone}`} {...TR_TO_BL}>
        <stop offset="0" stopColor={a} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={c} />
      </linearGradient>)}
  </defs>
}

/** A disc cut into the metal. `tone` fills it with a Figma inlay floor;
 *  `shift` nudges the mark toward the lit bottom-left of the recess. */
function Cut({ id, cx, cy, r, tone, glyph, size, shift }: {
  id: string; cx: number; cy: number; r: number
  tone?: Tone; glyph?: string; size?: number; shift?: number
}) {
  return <g>
    <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-${tone ?? 'floor'})`} />
    <circle cx={cx} cy={cy} r={r - 1.3} fill="none" stroke={`url(#${id}-shade)`} strokeWidth="2.6" />
    <circle cx={cx} cy={cy} r={r - 3.4} fill="none" stroke={`url(#${id}-shade)`} strokeWidth="2.6" opacity=".5" />
    <circle cx={cx} cy={cy} r={r - 5.4} fill="none" stroke={`url(#${id}-shade)`} strokeWidth="2.4" opacity=".22" />
    <circle cx={cx} cy={cy} r={r - 1.1} fill="none" stroke={`url(#${id}-lit)`} strokeWidth="2" />
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#070605" strokeWidth="2" opacity=".85" />
    {glyph && <g fontFamily="'DM Sans', Arial, Helvetica, sans-serif" fontWeight="500"
      fontSize={size ?? r} textAnchor="middle" dominantBaseline="central"
      transform={shift ? `translate(${-shift} ${shift})` : undefined}>
      <text x={cx - .9} y={cy + .9} fill="#050403" opacity=".55">{glyph}</text>
      <text x={cx} y={cy} fill={tone ? '#e3ded4' : '#d9ccb2'}>{glyph}</text>
    </g>}
  </g>
}

/** A groove: a wide dark body with hairline walls offset inside it. */
function Groove({ d }: { d: string }) {
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke="#080705" strokeWidth="8.6" />
    <path d={d} stroke="#e5cfa4" strokeWidth="2" opacity=".4" transform="translate(-2.2 2.2)" />
    <path d={d} stroke="#000000" strokeWidth="1.8" opacity=".5" transform="translate(2.3 -2.3)" />
  </g>
}

function Figure({ children, caption, viewBox }: { children: ReactNode; caption: string; viewBox: string }) {
  return <>
    <div className="figure-art">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision"
        aria-hidden="true" focusable="false">{children}</svg>
    </div>
    <p className="figure-caption">{caption}</p>
  </>
}

/** Personal: one account, fanned out to the currencies it holds. */
export function AccountFigure() {
  const id = 'fig-account'
  return <Figure caption="One account" viewBox="0 0 720 278">
    <Defs id={id} />
    <Groove d="M360,110 V146 Q360,164 342,164 H148 Q130,164 130,182 V186" />
    <Groove d="M360,110 V186" />
    <Groove d="M360,110 V146 Q360,164 378,164 H572 Q590,164 590,182 V186" />
    <Cut id={id} cx={360} cy={64} r={46} glyph="◈" size={38} />
    <Cut id={id} cx={130} cy={226} r={40} tone="eur" glyph="€" size={36} shift={1} />
    <Cut id={id} cx={360} cy={226} r={40} tone="usd" glyph="$" size={36} shift={1} />
    <Cut id={id} cx={590} cy={226} r={40} tone="gbp" glyph="£" size={36} shift={1} />
  </Figure>
}

/** The five faces, in the Figma avatar palette. */
const TEAM = [
  { cx: 100, tone: 'slate', initials: 'AL' },
  { cx: 230, tone: 'teal', initials: 'MK' },
  { cx: 360, tone: 'mauve', initials: 'JD' },
  { cx: 490, tone: 'clay', initials: 'NS' },
  { cx: 620, tone: 'sage', initials: 'ET' },
] as const

/** Business: a whole team converging on the same account. */
export function TeamFigure() {
  const id = 'fig-team'
  return <Figure caption="Everyone in one place" viewBox="0 0 720 322">
    <Defs id={id} />
    {/* Scaled about the centre and dropped, so the fan sits lower on the face. */}
    <g transform="translate(36 34) scale(0.9)">
      <Groove d="M100,93 V124 Q100,146 122,146 H338 Q360,146 360,168 V204" />
      <Groove d="M230,93 V162 Q230,184 252,184 H338 Q360,184 360,206 V204" />
      <Groove d="M360,93 V204" />
      <Groove d="M490,93 V162 Q490,184 468,184 H382 Q360,184 360,206 V204" />
      <Groove d="M620,93 V124 Q620,146 598,146 H382 Q360,146 360,168 V204" />
      {TEAM.map((member) => <Cut key={member.initials} id={id} cx={member.cx} cy={50} r={43}
        tone={member.tone} glyph={member.initials} size={26} />)}
      <Cut id={id} cx={360} cy={254} r={50} glyph="◈" size={42} />
    </g>
  </Figure>
}

/** Thirty days with a weekday rhythm, trending up. Illustrative shape only. */
const VOLUME = [14, 22, 27, 24, 21, 26, 35, 40, 36, 44, 40, 33, 36, 47, 44, 52, 48, 56, 46, 43, 59, 64, 58, 69, 65, 56, 59, 77, 85, 96]
const BASE = 332
const SPAN = 288

/** Monotone cubic: smooths the daily rhythm without overshooting a peak. */
function smooth(points: [number, number][]) {
  const n = points.length
  const dx: number[] = [], slope: number[] = [], tangent: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0]
    slope[i] = (points[i + 1][1] - points[i][1]) / dx[i]
  }
  tangent[0] = slope[0]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) tangent[i] = 0
    else {
      const a = 2 * dx[i] + dx[i - 1], b = dx[i] + 2 * dx[i - 1]
      tangent[i] = (a + b) / (a / slope[i - 1] + b / slope[i])
    }
  }
  tangent[n - 1] = slope[n - 2]
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${points[i][0] + h},${points[i][1] + tangent[i] * h} ${points[i + 1][0] - h},${points[i + 1][1] - tangent[i + 1] * h} ${points[i + 1][0]},${points[i + 1][1]}`
  }
  return d
}

/** Payments: the month rising as one soft wash under a smooth line. */
export function VolumeFigure() {
  const id = 'fig-volume'
  const left = 74, right = 690
  const points = VOLUME.map((value, index) =>
    [left + index * ((right - left) / (VOLUME.length - 1)), BASE - value / 100 * SPAN] as [number, number])
  const line = smooth(points)
  const last = points[points.length - 1]
  /** Three marks are enough to say "sales" without turning the face into a readout. */
  const scale = [{ at: 100, label: '€10k' }, { at: 50, label: '€5k' }, { at: 0, label: '€0' }]
  return <Figure caption="Money arriving" viewBox="0 0 720 370">
    <Defs id={id} />
    {scale.slice(0, 2).map(({ at }) => <path key={at} d={`M${left},${BASE - at / 100 * SPAN} H${right}`}
      stroke="#e5cfa4" strokeWidth="1.6" fill="none" opacity=".1" />)}
    <clipPath id={`${id}-area`}>
      <path d={`${line} L${right},${BASE} L${left},${BASE} Z`} />
    </clipPath>
    <image href={WASH} x={left} y={BASE - SPAN} width={right - left} height={SPAN}
      preserveAspectRatio="none" clipPath={`url(#${id}-area)`} />
    <path d={line} fill="none" stroke="#000000" strokeWidth="4.2" opacity=".45" transform="translate(1.6 -1.6)" />
    <path d={line} fill="none" stroke="#e9d5ab" strokeWidth="3.2" opacity=".74" strokeLinecap="round" />
    <path d={`M${left},${BASE + 1.4} H${right}`} stroke="#e5cfa4" strokeWidth="1.8" fill="none" opacity=".32" />
    <path d={`M${left},${BASE} H${right}`} stroke="#0f0d09" strokeWidth="3.4" fill="none" opacity=".9" />
    <g fontFamily="'DM Sans', Arial, Helvetica, sans-serif" fontWeight="400" fontSize="17"
      textAnchor="end" dominantBaseline="central">
      {scale.map(({ at, label }) => {
        const y = BASE - at / 100 * SPAN
        return <g key={label}>
          <text x={57.2} y={y + .9} fill="#050403" opacity=".55">{label}</text>
          <text x={58} y={y} fill="#b3a184">{label}</text>
        </g>
      })}
    </g>
    <Cut id={id} cx={last[0]} cy={last[1]} r={13} />
  </Figure>
}
