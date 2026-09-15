import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

/** Rolling-digit counter for the panel balances.
    A leading currency symbol crossfades; the number is split into right-aligned slots.
    Digit slots hold a reel of 0–9 and slide to the new digit, staggered from the right.
    Separator slots keep their glyph. Slots the new value does not need collapse to zero
    width, so "€28,142.55" → "$5,820.40" shortens smoothly instead of jumping.
    The web build of DM Sans has no tabular figures, so each slot is sized to the digit it
    shows (advance widths are measured once, in em, from the counter's own font) and the
    width animates along with the reel. The reflection painter reads `data-reflect-text`
    and ignores the reels. */
const SLOTS = 12
const DIGITS = '0123456789'.split('')
const FALLBACK_WIDTHS = DIGITS.map(() => 0.6)

function split(value: string) {
  const match = /^([^\d]*)(.*)$/.exec(value)!
  return { symbol: match[1], number: match[2] }
}

function measure(element: HTMLElement) {
  const style = getComputedStyle(element)
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return FALLBACK_WIDTHS
  context.font = `${style.fontWeight} 100px ${style.fontFamily}`
  return DIGITS.map((digit) => context.measureText(digit).width / 100)
}

export function Counter({ value }: { value: string }) {
  const { symbol, number } = split(value)
  const root = useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = useState(FALLBACK_WIDTHS)
  const generation = useRef(0), lastSymbol = useRef(symbol)
  if (lastSymbol.current !== symbol) { generation.current += 1; lastSymbol.current = symbol }
  useLayoutEffect(() => {
    const element = root.current!
    setWidths(measure(element))
    let cancelled = false
    void document.fonts.ready.then(() => { if (!cancelled) setWidths(measure(element)) })
    return () => { cancelled = true }
  }, [])
  const chars = number.padStart(SLOTS, ' ').split('')
  return <span ref={root} className="ah-counter" role="text" aria-label={value} data-reflect-text={value}>
    <span key={generation.current} className="ah-counter-symbol" aria-hidden="true">{symbol}</span>
    {chars.map((char, index) => {
      const fromRight = SLOTS - 1 - index
      if (char === ' ') return <span key={index} className="ah-slot" data-empty="true" style={{ '--i': fromRight, '--w': 0 } as CSSProperties} aria-hidden="true"><span className="ah-reel">{DIGITS.map((d) => <span key={d}>{d}</span>)}</span></span>
      const digit = DIGITS.indexOf(char)
      if (digit >= 0) return <span key={index} className="ah-slot" style={{ '--i': fromRight, '--d': digit, '--w': widths[digit] } as CSSProperties} aria-hidden="true"><span className="ah-reel">{DIGITS.map((d) => <span key={d}>{d}</span>)}</span></span>
      return <span key={index} className="ah-slot ah-slot-glyph" style={{ '--i': fromRight } as CSSProperties} aria-hidden="true">{char}</span>
    })}
  </span>
}
