import { useEffect, useId, useRef } from 'react'
import { appearanceLimits, type GlobeAppearance } from './appearance'

const labels = {
  size: { title: 'Dot size', low: 'Fine', high: 'Bold' },
  density: { title: 'Dot density', low: 'Sparse', high: 'Dense' },
  radius: { title: 'Hover radius', low: 'Focused', high: 'Wide' },
} as const

export function GlobeControls({ value, onChange }: { value: GlobeAppearance; onChange(value: GlobeAppearance): void }) {
  const id = useId()
  const details = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node)) details.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  return <details ref={details} className="gh-settings" onKeyDown={event => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    details.current!.open = false
    details.current!.querySelector('summary')?.focus()
  }}>
    <summary>
      <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 5h12M3 13h12M6 3v4m6 4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      Globe controls
      <svg className="gh-settings-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m5 9 3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </summary>
    <div className="gh-settings-panel">
      <div className="gh-settings-title"><span>Make it yours</span><span className="gh-settings-live">Live</span></div>
      {(['size', 'density', 'radius'] as const).map(key => {
        const { min, max, step } = appearanceLimits[key]
        return <div className="gh-setting" key={key}>
          <div className="gh-setting-label"><label htmlFor={`${id}-${key}`}>{labels[key].title}</label><output htmlFor={`${id}-${key}`}>{value[key]}%</output></div>
          <input id={`${id}-${key}`} name={`globe-${key}`} type="range" min={min} max={max} step={step} value={value[key]}
            aria-valuetext={`${value[key]} percent`} style={{ backgroundSize: `${(value[key] - min) / (max - min) * 100}% 4px, 100% 4px` }}
            onChange={event => onChange({ ...value, [key]: Number(event.target.value) })} />
          <div className="gh-setting-scale" aria-hidden="true"><span>{labels[key].low}</span><span>{labels[key].high}</span></div>
        </div>
      })}
      <p className="gh-settings-note">Changes are saved in this browser.</p>
    </div>
  </details>
}
