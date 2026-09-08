import { useState } from 'react'

import type { Hero3DConfig, Mode, Overlay, ToneMap } from './config'
import { defaultConfig } from './config'

interface LabPanelProps {
  config: Hero3DConfig
  onChange: (config: Hero3DConfig) => void
  onReplayIntro: () => void
  onClose: () => void
}

type Section = keyof Omit<Hero3DConfig, 'mode'>

export function LabPanel({ config, onChange, onReplayIntro, onClose }: LabPanelProps) {
  const [copied, setCopied] = useState(false)

  const set = <S extends Section>(section: S, patch: Partial<Hero3DConfig[S]>) =>
    onChange({ ...config, [section]: { ...config[section], ...patch } })

  const exportConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const modes: { id: Mode; label: string; hint: string }[] = [
    { id: 'projected', label: 'A · Projected', hint: 'render projected on geometry, unlit' },
    { id: 'pbr', label: 'B · Rendered', hint: 'real materials + studio lights' },
    { id: 'hybrid', label: 'C · Hybrid', hint: 'projected faces + live specular' },
  ]

  return (
    <aside className="h3d-lab">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[12px] font-bold tracking-[0.2em] text-amber-200/90 uppercase">
            Hero 3D lab
          </h2>
          <p className="mt-1 text-[10.5px] leading-relaxed text-neutral-500">
            Compare the three build approaches. Move the mouse to rotate.
          </p>
        </div>
        <button type="button" onClick={onClose} className={btn}>
          Hide
        </button>
      </header>

      <Group title="Approach">
        <div className="flex flex-col gap-1">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...config, mode: m.id })}
              className={`rounded border px-2 py-1.5 text-left transition-colors ${
                config.mode === m.id
                  ? 'border-amber-300/60 bg-amber-300/10 text-amber-100'
                  : 'border-white/10 text-neutral-400 hover:border-white/25'
              }`}
            >
              <span className="block text-[11px] font-semibold">{m.label}</span>
              <span className="block text-[10px] text-neutral-500">{m.hint}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Show">
        <div className="grid grid-cols-2 gap-x-3">
          <Toggle label="Screens" value={config.show.panels} onChange={(v) => set('show', { panels: v })} />
          <Toggle label="Labels" value={config.show.labels} onChange={(v) => set('show', { labels: v })} />
          <Toggle label="Card" value={config.show.card} onChange={(v) => set('show', { card: v })} />
          <Toggle
            label="Reflector"
            value={config.show.reflector}
            onChange={(v) => set('show', { reflector: v })}
          />
          <Toggle label="Post FX" value={config.show.post} onChange={(v) => set('show', { post: v })} />
          <Toggle label="Shadows" value={config.lights.shadows} onChange={(v) => set('lights', { shadows: v })} />
          <Toggle label="Intro" value={config.show.intro} onChange={(v) => set('show', { intro: v })} />
        </div>
        <button type="button" onClick={onReplayIntro} className={`${btn} mt-1`}>
          Replay intro
        </button>
        <Select<Overlay>
          label="Overlay"
          value={config.show.overlay}
          options={[
            ['none', 'none'],
            ['blocks', 'blocks render'],
            ['hero', 'full hero concept'],
          ]}
          onChange={(v) => set('show', { overlay: v })}
        />
        <Slider
          label="Overlay α"
          value={config.show.overlayOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set('show', { overlayOpacity: v })}
        />
      </Group>

      <Group title="Framing">
        <Slider label="Width" value={config.framing.widthFraction} min={0.5} max={1.4} step={0.005} onChange={(v) => set('framing', { widthFraction: v })} />
        <Slider label="Anchor Y" value={config.framing.anchorY} min={0.4} max={1} step={0.005} onChange={(v) => set('framing', { anchorY: v })} />
        <Slider label="FOV" value={config.framing.fov} min={15} max={45} step={0.5} onChange={(v) => set('framing', { fov: v })} />
      </Group>

      <Group title="Motion">
        <Slider label="Yaw °" value={config.parallax.yaw} min={0} max={12} step={0.1} onChange={(v) => set('parallax', { yaw: v })} />
        <Slider label="Pitch °" value={config.parallax.pitch} min={0} max={8} step={0.1} onChange={(v) => set('parallax', { pitch: v })} />
        <Slider label="Shift" value={config.parallax.shift} min={0} max={1.5} step={0.01} onChange={(v) => set('parallax', { shift: v })} />
        <Slider label="Idle °" value={config.parallax.idle} min={0} max={2} step={0.05} onChange={(v) => set('parallax', { idle: v })} />
        <Slider label="Damping" value={config.parallax.damping} min={0.01} max={0.2} step={0.005} onChange={(v) => set('parallax', { damping: v })} />
      </Group>

      <Group title="Bronze (B · C)">
        <ColorRow label="Colour" value={config.material.color} onChange={(v) => set('material', { color: v })} />
        <Slider label="Roughness" value={config.material.roughness} min={0.05} max={1} step={0.01} onChange={(v) => set('material', { roughness: v })} />
        <Slider label="Metalness" value={config.material.metalness} min={0} max={1} step={0.01} onChange={(v) => set('material', { metalness: v })} />
        <Slider label="Env" value={config.material.envIntensity} min={0} max={3} step={0.02} onChange={(v) => set('material', { envIntensity: v })} />
        <Slider label="Grain" value={config.material.grain} min={0} max={0.6} step={0.01} onChange={(v) => set('material', { grain: v })} />
        <Slider label="Mottle" value={config.material.mottle} min={0} max={0.6} step={0.01} onChange={(v) => set('material', { mottle: v })} />
      </Group>

      <Group title="Gold inlay (B · C)">
        <ColorRow label="Colour" value={config.gold.color} onChange={(v) => set('gold', { color: v })} />
        <Slider label="Centre" value={config.gold.center} min={0} max={0.8} step={0.005} onChange={(v) => set('gold', { center: v })} />
        <Slider label="Width" value={config.gold.width} min={0.005} max={0.4} step={0.005} onChange={(v) => set('gold', { width: v })} />
        <Slider label="Strength" value={config.gold.strength} min={0} max={4} step={0.05} onChange={(v) => set('gold', { strength: v })} />
        <Slider label="Directional" value={config.gold.directional} min={0} max={1} step={0.02} onChange={(v) => set('gold', { directional: v })} />
        <Slider label="Top side" value={config.gold.topWeight} min={0} max={1} step={0.02} onChange={(v) => set('gold', { topWeight: v })} />
        <Toggle label="Front/top faces only" value={config.gold.frontOnly} onChange={(v) => set('gold', { frontOnly: v })} />
      </Group>

      <Group title="Projection (C)">
        <Slider label="Emissive" value={config.projection.emissive} min={0} max={1.5} step={0.01} onChange={(v) => set('projection', { emissive: v })} />
        <Slider label="Albedo" value={config.projection.albedo} min={0} max={1} step={0.01} onChange={(v) => set('projection', { albedo: v })} />
        <Toggle label="Front faces only" value={config.projection.frontOnly} onChange={(v) => set('projection', { frontOnly: v })} />
      </Group>

      <Group title="Lights & grade">
        <Slider label="Key" value={config.lights.key} min={0} max={14} step={0.1} onChange={(v) => set('lights', { key: v })} />
        <Slider label="Rim" value={config.lights.rim} min={0} max={6} step={0.05} onChange={(v) => set('lights', { rim: v })} />
        <Slider label="Sun" value={config.lights.fill} min={0} max={5} step={0.05} onChange={(v) => set('lights', { fill: v })} />
        <Slider label="Ambient" value={config.lights.ambient} min={0} max={1} step={0.01} onChange={(v) => set('lights', { ambient: v })} />
        <Slider label="Exposure" value={config.lights.exposure} min={0.3} max={2.2} step={0.01} onChange={(v) => set('lights', { exposure: v })} />
        <Select<ToneMap>
          label="Tone map"
          value={config.lights.toneMap}
          options={[
            ['neutral', 'Neutral'],
            ['aces', 'ACES'],
            ['agx', 'AgX'],
            ['none', 'None'],
          ]}
          onChange={(v) => set('lights', { toneMap: v })}
        />
        <Slider label="Bloom" value={config.show.bloom} min={0} max={2} step={0.01} onChange={(v) => set('show', { bloom: v })} />
        <Slider label="Vignette" value={config.show.vignette} min={0} max={1.2} step={0.01} onChange={(v) => set('show', { vignette: v })} />
        <Slider label="Film grain" value={config.show.grainFx} min={0} max={0.15} step={0.005} onChange={(v) => set('show', { grainFx: v })} />
      </Group>

      <Group title="Config">
        <div className="flex gap-2">
          <button type="button" onClick={exportConfig} className={btn}>
            {copied ? 'Copied ✓' : 'Copy JSON'}
          </button>
          <button
            type="button"
            onClick={() => onChange(structuredClone(defaultConfig))}
            className={btn}
          >
            Reset
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Auto-saves to this browser. Copy JSON to hardcode the final numbers.
        </p>
      </Group>
    </aside>
  )
}

export const btn =
  'flex-1 rounded border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] uppercase tracking-wider text-neutral-200 transition-colors hover:border-amber-300/50 hover:text-amber-200'

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="mt-1 mb-1 border-b border-white/10 pb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="grid grid-cols-[74px_1fr_50px] items-center gap-2">
      <span className="truncate text-neutral-400">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-ew-resize appearance-none rounded bg-white/15 accent-amber-300"
      />
      <input
        type="number"
        step={step}
        value={Number(value.toFixed(3))}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!Number.isNaN(v)) onChange(v)
        }}
        className="w-full rounded border border-white/10 bg-black/40 px-1 py-0.5 text-right text-[10px] text-neutral-200 focus:border-amber-300/50 focus:outline-none"
      />
    </label>
  )
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
      <span className="text-neutral-400">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-amber-300"
      />
    </label>
  )
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <label className="grid grid-cols-[74px_1fr] items-center gap-2">
      <span className="truncate text-neutral-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded border border-white/10 bg-black/40 px-1 py-0.5 text-[10px] text-neutral-200 focus:border-amber-300/50 focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="grid grid-cols-[74px_1fr_50px] items-center gap-2">
      <span className="truncate text-neutral-400">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-full cursor-pointer rounded border border-white/10 bg-transparent"
      />
      <span className="text-right text-[10px] text-neutral-500">{value}</span>
    </label>
  )
}
