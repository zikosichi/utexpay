import { useEffect, useState } from 'react'
import { isStudio, useStudio } from '../studio'

export const PERSONAL_SCENES = [
  { id: 'original', label: 'Original', src: '/personalbanking/phone-scene-1254.webp', small: '/personalbanking/phone-scene-640.webp', alt: 'UTEX Pay personal banking on a gold-edged phone.' },
  { id: 'hand', label: 'In your hand', src: '/featuregrid/personal-in-hand-1254.webp', small: '/featuregrid/personal-in-hand-640.webp', alt: 'A hand holding a gold-edged phone displaying UTEX Pay personal banking.' },
  { id: 'touch', label: 'Everyday action', src: '/featuregrid/personal-everyday-action-1254.webp', small: '/featuregrid/personal-everyday-action-640.webp', alt: 'A hand using the UTEX Pay app on a phone resting on a desk stand.' },
  { id: 'card', label: 'Phone & card', src: '/featuregrid/personal-phone-card-1254.webp', small: '/featuregrid/personal-phone-card-640.webp', alt: 'Hands holding a UTEX Pay phone and a matching gold payment card.' },
  { id: 'realistic', label: 'In your hand · refined', src: '/featuregrid/personal-realistic-v3-1254.webp', small: '/featuregrid/personal-realistic-v3-640.webp', alt: 'A hand holding a gold-edged phone displaying UTEX Pay personal banking, with warm lighting and natural skin detail.' },
  { id: 'gemini', label: 'Phone & card · Gemini', src: '/featuregrid/personal-gemini-1024.webp', small: '/featuregrid/personal-gemini-640.webp', width: 1024, alt: 'Hands holding a UTEX Pay phone and gold payment card, with a cream knit sleeve.' },
  { id: 'approved-ui', label: 'Phone & card · Actual UI', src: '/featuregrid/personal-approved-ui-1254.webp', small: '/featuregrid/personal-approved-ui-640.webp', alt: 'Hands holding the UTEX Pay mobile dashboard with accounts and cash flow, alongside a satin gold card matching the product design.' },
  { id: 'full-composition', label: 'Phone & card · Full composition', src: '/featuregrid/personal-approved-ui-v3-1168.webp', small: '/featuregrid/personal-approved-ui-v3-640.webp', width: 1168, height: 1346, alt: 'Hands holding a UTEX Pay phone and satin gold payment card, with a soft rounded glow and generous dark space above.' },
] as const

type Direction = { id: string; label: string }

/** Keep review selections in the URL without disturbing other sections' choices. */
export function useImageDirection(param: string, options: readonly Direction[], defaultId = options[0].id) {
  const [selected, setSelected] = useState(defaultId)
  useEffect(() => {
    const sync = () => {
      const requested = isStudio() ? new URLSearchParams(window.location.search).get(param) : null
      setSelected(options.find((item) => item.id === requested)?.id ?? defaultId)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [param, options, defaultId])
  const select = (next: string) => {
    if (!options.some((item) => item.id === next)) return
    setSelected(next)
    const url = new URL(window.location.href)
    url.searchParams.set(param, next)
    window.history.replaceState(window.history.state, '', url)
  }
  return [selected, select] as const
}

export function ImageDirections({ label, controls, options, selected, onSelect }: {
  label: string; controls: string; options: readonly Direction[]; selected: string; onSelect: (id: string) => void
}) {
  if (!useStudio()) return null
  return <div className="fg-image-directions" role="group" aria-label={label}>
    {options.map((item, index) => <button key={item.id} type="button"
      aria-label={item.label} aria-pressed={selected === item.id} aria-controls={controls}
      onClick={() => onSelect(item.id)}>
      {String(index + 1).padStart(2, '0')}
      <span className="fg-image-direction-name" aria-hidden="true">{item.label}</span>
    </button>)}
  </div>
}
