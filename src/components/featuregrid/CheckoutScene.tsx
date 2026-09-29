import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, PointerEvent } from 'react'
import { cardBrand, caretAfterDigits, digitsOnly, formatCard, formatExpiry, validCard, validCvc, validExpiry } from './checkout-fields'
import type { CardBrand } from './checkout-fields'
import { Button } from '#/components/Button'
import { useCheckoutControls } from './CheckoutControls'
import './checkout-scene.css'

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    <path d="M12 14v3" stroke="#e4ddd2" strokeWidth="2" strokeLinecap="round" />
  </svg>
}

function FieldCheck({ valid }: { valid: boolean }) {
  return <svg className="fg-checkout-field-check" data-valid={valid} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function AnimatedDigits({ value, active }: { value: string; active: boolean }) {
  return <span className="fg-checkout-digit-layer" data-active={active} aria-hidden="true">
    {[...value].map((character, index) => <span key={index} className="fg-checkout-digit">{character}</span>)}
  </span>
}

function CardMark({ brand }: { brand: CardBrand }) {
  if (brand === 'mastercard') return <span className="fg-checkout-card-brand" role="img" aria-label="Mastercard" />
  if (brand === 'visa') return <span className="fg-checkout-brand-word fg-checkout-brand-word--visa" aria-label="Visa">VISA</span>
  if (brand === 'amex') return <span className="fg-checkout-brand-word fg-checkout-brand-word--amex" aria-label="American Express">AMEX</span>
  return <svg className="fg-checkout-generic-card" viewBox="0 0 28 20" fill="none" aria-label="Card" role="img"><rect x="1" y="1" width="26" height="18" rx="3" stroke="currentColor" /><path d="M1 6h26M5 14h6" stroke="currentColor" strokeWidth="2" /></svg>
}

type Field = 'card' | 'expiry' | 'cvc'
type Phase = 'preview' | 'editing' | 'processing' | 'success'
/** Phone and tablet layouts — keep in step with checkout-scene.css. Touch keyboards make typing a pain there. */
const COMPACT_QUERY = '(max-width: 900px), (min-width: 901px) and (max-width: 1100px) and (orientation: portrait)'
const BRAND_NAMES = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', unknown: 'Card' }

/** Local interaction only: values stay in component memory; no payment SDK, storage or requests. */
export function CheckoutScene() {
  const id = useId()
  const tuning = useCheckoutControls()
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [phase, setPhase] = useState<Phase>('preview')
  const [intro, setIntro] = useState<'idle' | 'running' | 'done' | 'manual'>('idle')
  const [demoField, setDemoField] = useState<Field | 'pay' | null>(null)
  const [receiptVisible, setReceiptVisible] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const introStarted = useRef(false)
  const inViewport = useRef(false)
  const automaticPayment = useRef(false)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const cardRef = useRef<HTMLInputElement>(null)
  const expiryRef = useRef<HTMLInputElement>(null)
  const cvcRef = useRef<HTMLInputElement>(null)
  const payRef = useRef<HTMLButtonElement>(null)
  const replayRef = useRef<HTMLButtonElement>(null)
  const paidReplayRef = useRef<HTMLButtonElement>(null)
  const brand = cardBrand(card)
  const cardOk = validCard(card)
  const expiryOk = validExpiry(expiry)
  const cvcOk = validCvc(cvc, brand)
  const ready = cardOk && expiryOk && cvcOk
  const locked = intro === 'running' || phase === 'processing' || phase === 'success'
  const cardError = !!touched.card && !cardOk
  const expiryError = !!touched.expiry && !expiryOk
  const cvcError = !!touched.cvc && !cvcOk
  const error = cardError ? 'Check the card number or try a test card.' : expiryError ? 'Enter a valid expiry date (MM / YY).' : cvcError ? `Enter a ${brand === 'amex' ? '4' : '3'}-digit security code.` : ''

  useEffect(() => {
    if (phase !== 'processing') return
    const timer = window.setTimeout(() => setPhase('success'), 1300)
    return () => window.clearTimeout(timer)
  }, [phase])
  useEffect(() => {
    if (phase !== 'success') { setReceiptVisible(false); return }
    // Focus whichever Replay this layout shows: the desktop card's or the one inside the form.
    if (!automaticPayment.current) [replayRef.current, paidReplayRef.current].find(button => button?.offsetParent)?.focus({ preventScroll: true })
    const timer = window.setTimeout(() => setReceiptVisible(true), 500)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Watch the form itself so the tall phone composition can trigger naturally.
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const observer = new IntersectionObserver(([entry]) => {
      inViewport.current = entry.isIntersecting && entry.intersectionRatio >= .45
      if (inViewport.current && !introStarted.current) {
        introStarted.current = true
        automaticPayment.current = true
        setIntro('running')
      }
    }, { threshold: [0, .45] })
    observer.observe(form)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (intro !== 'running') return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const number = '4242424242424242'
    const date = `12${String(new Date().getFullYear() + 2).slice(-2)}`
    const steps: { at: number; run: () => void }[] = []
    let at = 300
    const type = (value: string, field: Field, apply: (value: string) => void, interval: number) => {
      steps.push({ at, run: () => setDemoField(field) })
      for (let i = 1; i <= value.length; i++) {
        at += interval
        const partial = value.slice(0, i)
        steps.push({ at, run: () => apply(partial) })
      }
      at += 200
    }
    if (reduceMotion) {
      steps.push({ at: 250, run: () => { setCard(formatCard(number)); setExpiry(formatExpiry(date)); setCvc('123') } })
      at = 600
    } else {
      type(number, 'card', value => setCard(formatCard(value)), 60)
      type(date, 'expiry', value => setExpiry(formatExpiry(value)), 95)
      type('123', 'cvc', setCvc, 95)
      steps.push({ at, run: () => setDemoField(null) })
      at += 400
      steps.push({ at, run: () => setDemoField('pay') })
      at += 150
    }
    steps.push({ at, run: () => { setDemoField(null); setIntro('done'); setPhase('processing') } })
    let frame = 0, previous = performance.now(), elapsed = 0, next = 0
    const tick = (now: number) => {
      if (inViewport.current && document.visibilityState === 'visible') elapsed += Math.min(now - previous, 100)
      previous = now
      while (next < steps.length && elapsed >= steps[next].at) steps[next++].run()
      if (next < steps.length) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [intro])

  function takeOver() {
    if (intro !== 'idle' && intro !== 'running') return
    introStarted.current = true
    automaticPayment.current = false
    setIntro('manual'); setDemoField(null); setPhase('editing')
    setCard(''); setExpiry(''); setCvc(''); setTouched({})
  }

  // A finger landing on the form is usually the start of a scroll, not a turn at the checkout, so
  // touch never takes over here; tapping an actual field still does, through the focus handler.
  function pointerTakeOver(event: PointerEvent<HTMLFormElement>) {
    if (event.pointerType === 'mouse') takeOver()
  }

  function edit(field: Field, value: string) {
    setPhase('editing')
    setTouched(previous => ({ ...previous, [field]: false }))
    if (field === 'card') {
      setCard(value)
      setCvc(previous => previous.slice(0, cardBrand(value) === 'amex' ? 4 : 3))
    } else if (field === 'expiry') setExpiry(value)
    else setCvc(value)
  }

  function change(field: Field, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const raw = input.value
    const cursor = input.selectionStart ?? raw.length
    const atEnd = cursor === raw.length
    const digitIndex = digitsOnly(raw.slice(0, cursor)).length
    const formatted = field === 'card' ? formatCard(raw) : field === 'expiry' ? formatExpiry(raw) : digitsOnly(raw).slice(0, brand === 'amex' ? 4 : 3)
    edit(field, formatted)
    // Count digits rather than characters so editing/pasting in the middle keeps the caret stable.
    const nextCursor = atEnd ? formatted.length : caretAfterDigits(formatted, digitIndex)
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.setSelectionRange(nextCursor, nextCursor)
    })
    const inserting = !(event.nativeEvent as InputEvent).inputType?.startsWith('delete')
    if (!atEnd || !inserting) return
    if (field === 'card' && validCard(formatted) && digitsOnly(formatted).length >= (cardBrand(formatted) === 'amex' ? 15 : 16)) expiryRef.current?.focus({ preventScroll: true })
    if (field === 'expiry' && validExpiry(formatted)) cvcRef.current?.focus({ preventScroll: true })
    if (field === 'cvc' && validCvc(formatted, brand) && cardOk && expiryOk) payRef.current?.focus({ preventScroll: true })
  }

  function keyDown(field: Field, event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? start
    if (event.key !== 'Backspace' || start !== end) return
    if (!input.value && field !== 'card') {
      event.preventDefault()
      const previous = field === 'cvc' ? expiryRef.current : cardRef.current
      previous?.focus({ preventScroll: true })
      previous?.setSelectionRange(previous.value.length, previous.value.length)
    } else if (start > 0 && /\D/.test(input.value[start - 1])) {
      // Backspace immediately after a separator removes the preceding digit, not a sticky space.
      event.preventDefault()
      const digitsBefore = digitsOnly(input.value.slice(0, start)).length
      const digits = digitsOnly(input.value)
      const next = digits.slice(0, digitsBefore - 1) + digits.slice(digitsBefore)
      const formatted = field === 'card' ? formatCard(next) : formatExpiry(next)
      edit(field, formatted)
      requestAnimationFrame(() => {
        const cursor = caretAfterDigits(formatted, digitsBefore - 1)
        if (document.activeElement === input) input.setSelectionRange(cursor, cursor)
      })
    }
  }

  function useTestCard(testBrand: 'visa' | 'mastercard') {
    setCard(formatCard(testBrand === 'visa' ? '4242424242424242' : '5555555555554444'))
    setExpiry(`12 / ${String(new Date().getFullYear() + 2).slice(-2)}`)
    setCvc('123')
    setTouched({})
    setPhase('editing')
    payRef.current?.focus({ preventScroll: true })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    setTouched({ card: true, expiry: true, cvc: true })
    if (!ready) {
      ;(!cardOk ? cardRef : !expiryOk ? expiryRef : cvcRef).current?.focus({ preventScroll: true })
      return
    }
    automaticPayment.current = false
    setPhase('processing')
  }

  function reset() {
    const replay = window.matchMedia(COMPACT_QUERY).matches
    introStarted.current = true
    automaticPayment.current = replay
    setIntro(replay ? 'running' : 'manual'); setDemoField(null); setReceiptVisible(false)
    setCard(''); setExpiry(''); setCvc(''); setTouched({}); setPhase(replay ? 'preview' : 'editing')
    if (!replay) requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }))
  }

  // Phones and tablets replay the automatic demo without focusing an input or opening the keyboard.
  // Desktop invites manual entry after the first demo, then offers "Try again".
  const status = phase === 'processing' ? 'Confirming payment' : phase === 'editing' ? ready ? 'Ready to pay' : 'Your secure checkout' : 'Payment successful'

  return <article className="fg-tile fg-checkout" data-intro={intro}>
    <img className="fg-checkout-scene" src="/featuregrid/northstar-scene-1974.webp"
      srcSet="/featuregrid/northstar-scene-1100.webp 1100w, /featuregrid/northstar-scene-1974.webp 1974w"
      sizes="(max-width: 620px) 800px, (max-width: 1496px) 100vw, 1560px"
      width="1974" height="797" loading="lazy" decoding="async" draggable="false"
      alt="A satin olive-green Northstar bottle on a level dark marble slab, lit by warm sunlight beside brass planters." />
    <div className="fg-checkout-shade" aria-hidden="true" />
    <div className="fg-checkout-copy"><h4>Make it easy to Pay</h4><p>A simple checkout for your customers. Every payment in view</p></div>

    <div className="fg-checkout-product" style={tuning.styles.product} data-tuning={tuning.selected === 'product'} data-visible={receiptVisible || tuning.selected === 'product'} inert={!receiptVisible && tuning.selected !== 'product'}>
      {receiptVisible ? <div className="fg-checkout-notification fg-checkout-notification--received" role="status">
        <span className="fg-checkout-product-photo" aria-hidden="true" />
        <span className="fg-checkout-product-name"><strong>Payment received</strong><span>Northstar Store · Just now</span></span>
        <span className="fg-checkout-product-price">+€48.00</span>
      </div> : <div className="fg-checkout-notification">
      <span className="fg-checkout-product-photo" aria-hidden="true" />
      <span className="fg-checkout-product-name"><strong>Northstar Store</strong><span>Premium water bottle</span></span>
      <span className="fg-checkout-product-price">€48.00</span>
      </div>}
    </div>

    <form ref={formRef} onPointerDownCapture={pointerTakeOver} onFocusCapture={takeOver} className="fg-checkout-form" style={tuning.styles.form} data-tuning={tuning.selected === 'form'} aria-label="Interactive checkout demo" aria-describedby={`${id}-demo`} autoComplete="off" noValidate onSubmit={submit}>
      <div className="fg-checkout-merchant"><span className="fg-checkout-lock"><LockIcon /></span><span><strong>Northstar Store</strong><span>Secure payment</span></span></div>
      <div className="fg-checkout-body" data-paid={phase === 'success' || undefined}>
      <div className="fg-checkout-total"><span>Order total</span><strong>€48.00</strong></div>
      <div className="fg-checkout-fields">
        <label className="fg-checkout-field-label" htmlFor={`${id}-card`}>Card details</label>
        <div className="fg-checkout-card-number fg-checkout-input-wrap" data-demo-active={demoField === 'card'} data-invalid={cardError} data-valid={cardOk}>
          <span className="fg-checkout-input-value" data-animated={intro === 'running' && !!card}>
            <input ref={cardRef} id={`${id}-card`} aria-label="Card number" aria-invalid={cardError} aria-describedby={cardError ? `${id}-error` : undefined} inputMode="numeric" autoComplete="off" spellCheck={false} placeholder="1234 1234 1234 1234" value={card} readOnly={locked} onChange={event => change('card', event)} onKeyDown={event => keyDown('card', event)} onBlur={() => setTouched(previous => ({ ...previous, card: !!card }))} />
            {intro === 'running' && card && <AnimatedDigits value={card} active={demoField === 'card'} />}
          </span>
          <FieldCheck valid={cardOk} /><CardMark brand={brand} />
        </div>
        <span className="fg-checkout-sr" role="status">{brand !== 'unknown' ? `${BRAND_NAMES[brand]} detected${cardOk ? ', number complete' : ''}` : ''}</span>
        <div className="fg-checkout-field-row">
          <div className="fg-checkout-input-wrap" data-demo-active={demoField === 'expiry'} data-invalid={expiryError} data-valid={expiryOk}>
            <label className="fg-checkout-sr" htmlFor={`${id}-expiry`}>Expiry date, month and year</label>
            <span className="fg-checkout-input-value" data-animated={intro === 'running' && !!expiry}>
            <input ref={expiryRef} id={`${id}-expiry`} aria-invalid={expiryError} aria-describedby={expiryError ? `${id}-error` : undefined} inputMode="numeric" autoComplete="off" placeholder="MM / YY" value={expiry} readOnly={locked} onChange={event => change('expiry', event)} onKeyDown={event => keyDown('expiry', event)} onBlur={() => setTouched(previous => ({ ...previous, expiry: !!expiry }))} />
            {intro === 'running' && expiry && <AnimatedDigits value={expiry} active={demoField === 'expiry'} />}
          </span>
            <FieldCheck valid={expiryOk} />
          </div>
          <div className="fg-checkout-input-wrap" data-demo-active={demoField === 'cvc'} data-invalid={cvcError} data-valid={cvcOk}>
            <label className="fg-checkout-sr" htmlFor={`${id}-cvc`}>Security code</label>
            <span className="fg-checkout-input-value" data-animated={intro === 'running' && !!cvc}>
            <input ref={cvcRef} id={`${id}-cvc`} aria-invalid={cvcError} aria-describedby={cvcError ? `${id}-error` : undefined} inputMode="numeric" autoComplete="off" placeholder={brand === 'amex' ? '4-digit CVC' : 'CVC'} value={cvc} readOnly={locked} onChange={event => change('cvc', event)} onKeyDown={event => keyDown('cvc', event)} onBlur={() => setTouched(previous => ({ ...previous, cvc: !!cvc }))} />
            {intro === 'running' && cvc && <AnimatedDigits value={cvc} active={demoField === 'cvc'} />}
          </span>
            <FieldCheck valid={cvcOk} />
          </div>
        </div>
      </div>
      <Button ref={payRef} style={tuning.styles.button} className="fg-checkout-pay" data-demo-running={intro === 'running'} data-demo-pressed={demoField === 'pay'} type="submit" disabled={locked} aria-busy={phase === 'processing'}>
        {phase === 'processing' && <span className="fg-checkout-pay-spinner" aria-hidden="true" />}
        {phase === 'success' && <svg className="fg-checkout-pay-complete" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {phase === 'processing' ? 'Processing…' : phase === 'success' ? 'Payment complete' : 'Pay €48.00'}
      </Button>
      <div className="fg-checkout-demo" id={`${id}-demo`}><span>Demo · no charge</span><span>Try <button type="button" disabled={locked} onClick={() => useTestCard('visa')}>Visa</button> / <button type="button" disabled={locked} onClick={() => useTestCard('mastercard')}>Mastercard</button></span></div>
      {error && <span className="fg-checkout-sr fg-checkout-error" id={`${id}-error`} role="alert">{error}</span>}
      {/* Phones and tablets: the form itself becomes the confirmation (hidden on desktop). */}
      <div className="fg-checkout-paid" data-visible={phase === 'success'} inert={phase !== 'success'}>
        <span className="fg-checkout-paid-badge" aria-hidden="true">
          <span className="fg-checkout-paid-spin">
            <svg className="fg-checkout-paid-burst" viewBox="-44 -44 88 88" fill="none">
              <g className="fg-checkout-paid-rays"><line x1="0.0" y1="-30.0" x2="0.0" y2="-38.0" /><line x1="21.2" y1="-21.2" x2="26.9" y2="-26.9" /><line x1="30.0" y1="0.0" x2="38.0" y2="0.0" /><line x1="21.2" y1="21.2" x2="26.9" y2="26.9" /><line x1="0.0" y1="30.0" x2="0.0" y2="38.0" /><line x1="-21.2" y1="21.2" x2="-26.9" y2="26.9" /><line x1="-30.0" y1="0.0" x2="-38.0" y2="0.0" /><line x1="-21.2" y1="-21.2" x2="-26.9" y2="-26.9" /></g>
              <g className="fg-checkout-paid-dots"><circle cx="13.0" cy="-31.4" r="1.6" /><circle cx="31.4" cy="-13.0" r="1.6" /><circle cx="31.4" cy="13.0" r="1.6" /><circle cx="13.0" cy="31.4" r="1.6" /><circle cx="-13.0" cy="31.4" r="1.6" /><circle cx="-31.4" cy="13.0" r="1.6" /><circle cx="-31.4" cy="-13.0" r="1.6" /><circle cx="-13.0" cy="-31.4" r="1.6" /></g>
            </svg>
            <svg className="fg-checkout-paid-orbit" viewBox="-44 -44 88 88" fill="none"><circle r="35" /></svg>
            
          </span>
          <svg className="fg-checkout-check" viewBox="0 0 48 48" fill="none"><circle className="fg-checkout-check-ring" cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.5" /><path d="m13 24 7 7 15-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <strong role="status">Payment successful</strong>
        <span className="fg-checkout-paid-meta">€48.00 · Order #1048</span>
        <button className="fg-checkout-replay" type="button" ref={paidReplayRef} onClick={reset}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 7a6 6 0 1 1 .1 6M4 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Replay</button>
      </div>
      </div>
    </form>

    <div className="fg-checkout-confirmation" style={tuning.styles.confirmation} data-tuning={tuning.selected === 'confirmation'} data-phase={phase} data-visible={phase === 'success' || tuning.selected === 'confirmation'} inert={phase !== 'success' && tuning.selected !== 'confirmation'} role="group" aria-label="Demo payment confirmation">
      <svg className="fg-checkout-check" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.5" /><path d="m13 24 7 7 15-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <strong role="status">{status}</strong>
      <span className="fg-checkout-confirmed-amount">€48.00</span>
      <span className="fg-checkout-order">{phase === 'editing' ? 'Demo order #1048' : 'Order #1048'}</span>
      <span className="fg-checkout-confirmed-store">{phase === 'success' ? <button className="fg-checkout-replay" type="button" ref={replayRef} onClick={reset} data-invite={intro === 'done' || undefined}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 7a6 6 0 1 1 .1 6M4 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="fg-checkout-replay-desktop">{intro === 'done' ? 'Try it yourself' : 'Try again'}</span><span className="fg-checkout-replay-mobile">Replay</span></button> : 'Northstar Store'}</span>
    </div>
    {tuning.controls}
  </article>
}
