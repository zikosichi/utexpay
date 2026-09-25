import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { isStudio, useStudio } from '../studio'
import './checkout-controls.css'

type Item = 'product' | 'form' | 'confirmation'
type Selection = Item | 'button'
const ITEMS: Record<Selection, string> = { product: 'Notification', form: 'Checkout', confirmation: 'Confirmation', button: 'Pay button' }
const FIELDS = {
  x: { label: 'Horizontal', min: -500, max: 500, step: 1, unit: 'px' },
  y: { label: 'Vertical', min: -300, max: 300, step: 1, unit: 'px' },
  rx: { label: 'Tilt X', min: -60, max: 60, step: 1, unit: '°' },
  ry: { label: 'Turn Y', min: -60, max: 60, step: 1, unit: '°' },
  rz: { label: 'Rotate Z', min: -45, max: 45, step: .5, unit: '°' },
  originX: { label: 'Anchor X', min: 0, max: 100, step: 1, unit: '%' },
  originY: { label: 'Anchor Y', min: 0, max: 100, step: 1, unit: '%' },
  originZ: { label: 'Anchor Z', min: -300, max: 300, step: 1, unit: 'px' },
  shadowX: { label: 'Shadow X', min: -100, max: 100, step: 1, unit: 'px' },
  shadowY: { label: 'Shadow Y', min: -100, max: 100, step: 1, unit: 'px' },
  blur: { label: 'Blur', min: 0, max: 100, step: 1, unit: 'px' },
  spread: { label: 'Spread', min: -50, max: 50, step: 1, unit: 'px' },
  opacity: { label: 'Opacity', min: 0, max: 100, step: 1, unit: '%' },
  reflection: { label: 'Strength', min: 0, max: 65, step: 1, unit: '%' },
  edgeX: { label: 'Edge X', min: -12, max: 12, step: .5, unit: 'px' },
  edgeY: { label: 'Edge Y', min: -12, max: 12, step: .5, unit: 'px' },
}
type Field = keyof typeof FIELDS
type Values = Record<Field, number>
const BUTTON_FIELDS = {
  edgeX: { label: 'Edge X', min: -12, max: 12, step: .5, unit: 'px' },
  edgeY: { label: 'Edge Y', min: -12, max: 12, step: .5, unit: 'px' },
  hoverLift: { label: 'Hover lift', min: 1, max: 3, step: .1, unit: '×' },
  rimOpacity: { label: 'Rim opacity', min: 0, max: 100, step: 1, unit: '%' },
}
const BUTTON_COLORS = {
  fill: 'Face', hoverFill: 'Hover face', ink: 'Text',
  edgeNear: 'Edge light', edgeMiddle: 'Edge middle', edgeFar: 'Edge dark',
  rimLeft: 'Left highlight', rimRight: 'Right highlight',
}
type ButtonNumber = keyof typeof BUTTON_FIELDS
type ButtonColor = keyof typeof BUTTON_COLORS
type ButtonValues = Record<ButtonNumber, number> & Record<ButtonColor, string>
type Settings = Record<Item, Values> & { button: ButtonValues }
const BASE: Values = { x: 0, y: 0, rx: 0, ry: 0, rz: 0, shadowX: 0, shadowY: -12.6, blur: 25.2, spread: -11.2, opacity: 53.33, edgeX: 3, edgeY: -3, originX: 50, originY: 100, originZ: 0, reflection: 28 }
const DEFAULTS: Settings = {
  button: { edgeX: 3, edgeY: -1.5, hoverLift: 1.2, rimOpacity: 38, fill: '#e0a830', hoverFill: '#f5c542', ink: '#0f0e0d', edgeNear: '#c18b21', edgeMiddle: '#af7918', edgeFar: '#956213', rimLeft: '#ffffff', rimRight: '#fef3c7' },
  product: { ...BASE, x: -111, y: -133, ry: 14, shadowY: -6, blur: 24, spread: -12, edgeX: 0, edgeY: 0, originX: 0, originY: 0, reflection: 0 },
  form: { ...BASE, x: 76, y: -19, ry: -7, shadowY: 27, spread: -15, edgeX: 2.5, edgeY: 0, originX: 0, originY: 50 },
  confirmation: { ...BASE, x: 56, y: 4, ry: -10, shadowX: -4, shadowY: -12, blur: 31, spread: 1, opacity: 27, edgeX: 2, edgeY: 0, originX: 0, originY: 28, reflection: 38 },
}
// Start from the newly approved composition instead of restoring the previous draft.
const STORAGE_KEY = 'utex-checkout-controls-v5'
const groups: { title: string; fields: Field[] }[] = [
  { title: 'Position', fields: ['x', 'y'] },
  { title: 'Rotation', fields: ['rx', 'ry', 'rz'] },
  { title: 'Rotation anchor', fields: ['originX', 'originY', 'originZ'] },
  { title: 'Soft shadow', fields: ['shadowX', 'shadowY', 'blur', 'spread', 'opacity'] },
  { title: '3D edge', fields: ['edgeX', 'edgeY'] },
  { title: 'Reflection', fields: ['reflection'] },
]

function readSettings(): Settings {
  const settings = structuredClone(DEFAULTS)
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const item of ['product', 'form', 'confirmation'] as Item[]) {
      for (const field of Object.keys(FIELDS) as Field[]) {
        const value = saved?.[item]?.[field]
        if (typeof value === 'number' && Number.isFinite(value)) settings[item][field] = Math.min(FIELDS[field].max, Math.max(FIELDS[field].min, value))
      }
    }
    for (const field of Object.keys(BUTTON_FIELDS) as ButtonNumber[]) {
      const value = saved?.button?.[field]
      const spec = BUTTON_FIELDS[field]
      if (typeof value === 'number' && Number.isFinite(value)) settings.button[field] = Math.min(spec.max, Math.max(spec.min, value))
    }
    for (const field of Object.keys(BUTTON_COLORS) as ButtonColor[]) {
      const value = saved?.button?.[field]
      if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) settings.button[field] = value
    }
  } catch { /* Missing/blocked storage falls back to the approved composition. */ }
  return settings
}

function itemStyle(values: Values, defaults: Values): CSSProperties {
  const px = (value: number) => `${value / 14}cqw` // Reference pixels on the 1400px composition.
  return {
    transformOrigin: `${values.originX}% ${values.originY}% ${px(values.originZ)}`,
    '--tune-reflection': values.reflection / 100,
    '--tune-origin-x': `${values.originX}%`, '--tune-origin-y': `${values.originY}%`,
    '--tune-offset-x': px(values.x - defaults.x), '--tune-offset-y': px(values.y - defaults.y),
    '--tune-offset-ry': `${values.ry - defaults.ry}deg`,
    '--tune-x': px(values.x), '--tune-y': px(values.y),
    '--tune-rx': `${values.rx}deg`, '--tune-ry': `${values.ry}deg`, '--tune-rz': `${values.rz}deg`,
    '--tune-shadow': `${px(values.shadowX)} ${px(values.shadowY)} ${px(values.blur)} ${px(values.spread)} rgb(0 0 0 / ${values.opacity}%)`,
    '--tune-edge-x': `${values.edgeX}px`, '--tune-edge-y': `${values.edgeY}px`,
  } as CSSProperties
}

export function useCheckoutControls() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(true)
  const studio = useStudio()
  // Tuning is review-mode only: `/` shows the approved composition and never overwrites saved tuning.
  useEffect(() => { if (isStudio()) { setSettings(readSettings()); setLoaded(true) } }, [])
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); setSaved(true) }
    catch { setSaved(false) }
  }, [settings, loaded])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Selection>('product')
  return {
    styles: { button: {
      '--pay-edge-x': `${settings.button.edgeX}px`, '--pay-edge-y': `${settings.button.edgeY}px`,
      '--pay-hover-lift': settings.button.hoverLift, '--pay-rim-opacity': settings.button.rimOpacity / 100,
      ...Object.fromEntries((Object.keys(BUTTON_COLORS) as ButtonColor[]).map(key => [`--pay-${key}`, settings.button[key]])),
    } as CSSProperties, product: itemStyle(settings.product, DEFAULTS.product), form: itemStyle(settings.form, DEFAULTS.form), confirmation: itemStyle(settings.confirmation, DEFAULTS.confirmation) },
    selected: open ? selected : undefined,
    controls: studio && <CheckoutControls settings={settings} saved={saved} open={open} setOpen={setOpen} selected={selected} setSelected={setSelected}
      update={(field, value) => { if (selected !== 'button') setSettings(previous => ({ ...previous, [selected]: { ...previous[selected], [field]: value } })) }}
      updateButton={value => setSettings(previous => ({ ...previous, button: { ...previous.button, ...value } }))}
      reset={() => setSettings(previous => ({ ...previous, [selected]: { ...DEFAULTS[selected] } }))}
      resetAll={() => setSettings(structuredClone(DEFAULTS))} />,
  }
}

function NumberControl({ value, label, min, max, change }: { value: number; label: string; min: number; max: number; change: (value: string) => void }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return <input className="checkout-controls-number" aria-label={`${label} value`} type="text" inputMode="decimal" value={draft}
    onChange={event => {
      const next = event.target.value
      setDraft(next)
      if (next.trim() !== '' && Number.isFinite(Number(next)) && Number(next) >= min && Number(next) <= max) change(next)
    }}
    onBlur={() => {
      if (draft.trim() === '' || !Number.isFinite(Number(draft))) setDraft(String(value))
      else { const next = String(Math.max(min, Math.min(max, Number(draft)))); setDraft(next); change(next) }
    }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
}

function CheckoutControls({ settings, saved, open, setOpen, selected, setSelected, update, updateButton, reset, resetAll }: {
  settings: Settings; saved: boolean; open: boolean; setOpen: (value: boolean) => void; selected: Selection; setSelected: (value: Selection) => void
  updateButton: (value: Partial<ButtonValues>) => void; update: (field: Field, value: number) => void; reset: () => void; resetAll: () => void
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const [copyStatus, setCopyStatus] = useState('')
  const [exportText, setExportText] = useState('')
  useEffect(() => {
    if (!open) return
    close.current?.focus({ preventScroll: true })
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [open, setOpen])
  async function copy() {
    const text = JSON.stringify(settings, null, 2)
    try { await navigator.clipboard.writeText(text); setCopyStatus('Settings copied'); setExportText('') }
    catch { setExportText(text); setCopyStatus('Select and copy the settings below') }
  }
  const panel = open && <aside className="checkout-controls-panel" id={`${id}-panel`} aria-label="Payment scene controls">
    <header><div><strong>Payment scene</strong><span>{saved ? 'Saved in this browser' : 'Changes apply for this visit'}</span></div><button type="button" ref={close} aria-label="Close payment controls" onClick={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }}>×</button></header>
    <div className="checkout-controls-items" role="group" aria-label="Choose a card">{(Object.keys(ITEMS) as Selection[]).map(item => <button type="button" key={item} aria-pressed={selected === item} onClick={() => { setSelected(item); setCopyStatus('') }}>{ITEMS[item]}</button>)}</div>
    <p className="checkout-controls-hint">{selected === 'button' ? 'Shape the solid edge and reflected highlights. Negative Edge Y adds depth above the button.' : 'Position and rotation are offsets from the current layout. Distances scale with the scene.'}</p>
    <div className="checkout-controls-scroll">{selected === 'button' ? <PayButtonControls values={settings.button} update={value => { updateButton(value); setCopyStatus('') }} /> : groups.filter(group => group.title !== 'Reflection' || selected !== 'product').map(group => <fieldset key={group.title}><legend>{group.title}</legend>{group.title === 'Rotation anchor' && <div className="checkout-anchor-presets"><div role="group" aria-label="Anchor presets">{[0, 50, 100].flatMap((y, row) => [0, 50, 100].map((x, column) => <button type="button" key={`${x}-${y}`} aria-label={`${['Top', 'Middle', 'Bottom'][row]} ${['left', 'center', 'right'][column]} anchor`} aria-pressed={settings[selected].originX === x && settings[selected].originY === y} onClick={() => { update('originX', x); update('originY', y); setCopyStatus('') }}><span /></button>))}</div><p>Choose a pivot on the card.<br />Z moves it in front or behind.</p></div>}{group.fields.map(field => {
      const spec = FIELDS[field]
      const value = settings[selected][field]
      const change = (raw: string) => { if (raw !== '' && Number.isFinite(Number(raw))) { update(field, Math.max(spec.min, Math.min(spec.max, Number(raw)))); setCopyStatus('') } }
      return <div className="checkout-controls-row" key={`${selected}-${field}`}>
        <label htmlFor={`${id}-${field}`}>{spec.label}</label>
        <input id={`${id}-${field}`} type="range" min={spec.min} max={spec.max} step={spec.step} value={value} onChange={event => change(event.target.value)} />
        <NumberControl value={value} label={spec.label} min={spec.min} max={spec.max} change={change} /><span>{spec.unit}</span>
      </div>
    })}</fieldset>)}</div>
    <footer><button type="button" onClick={() => { reset(); setCopyStatus('') }}>Reset {ITEMS[selected].toLowerCase()}</button><button type="button" onClick={() => { resetAll(); setCopyStatus('') }}>Reset all</button><button type="button" onClick={copy}>Copy settings</button></footer>
    <span className="checkout-controls-status" role="status">{copyStatus}</span>
    {exportText && <textarea aria-label="Scene settings to copy" readOnly value={exportText} onFocus={event => event.target.select()} />}
  </aside>
  return <>
    <button className="checkout-controls-toggle" ref={trigger} type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 4h12M2 12h12M6 1v6M10 9v6" /></svg>Adjust cards</button>
    {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
  </>
}

function PayButtonControls({ values, update }: { values: ButtonValues; update: (value: Partial<ButtonValues>) => void }) {
  const id = useId()
  return <>
    <fieldset><legend>3D edge & highlight</legend>{(Object.keys(BUTTON_FIELDS) as ButtonNumber[]).map(field => {
      const spec = BUTTON_FIELDS[field]
      const change = (raw: string) => { if (raw.trim() !== '' && Number.isFinite(Number(raw))) update({ [field]: Math.min(spec.max, Math.max(spec.min, Number(raw))) }) }
      return <div className="checkout-controls-row" key={field}>
        <label htmlFor={`${id}-${field}`}>{spec.label}</label>
        <input id={`${id}-${field}`} type="range" {...{ min: spec.min, max: spec.max, step: spec.step }} value={values[field]} onChange={event => change(event.target.value)} />
        <NumberControl value={values[field]} label={spec.label} min={spec.min} max={spec.max} change={change} /><span>{spec.unit}</span>
      </div>
    })}</fieldset>
    <fieldset><legend>Colors</legend>{(Object.keys(BUTTON_COLORS) as ButtonColor[]).map(field => <ColorControl key={field} label={BUTTON_COLORS[field]} value={values[field]} change={value => update({ [field]: value })} />)}</fieldset>
  </>
}

function ColorControl({ label, value, change }: { label: string; value: string; change: (value: string) => void }) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <div className="checkout-controls-color">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="color" value={value} onChange={event => change(event.target.value)} />
    <input aria-label={`${label} hex`} type="text" value={draft} maxLength={7} spellCheck={false} onChange={event => {
      setDraft(event.target.value)
      if (/^#[0-9a-f]{6}$/i.test(event.target.value)) change(event.target.value)
    }} onBlur={() => setDraft(value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
  </div>
}
