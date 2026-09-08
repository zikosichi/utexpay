import { useState } from 'react'

import type { BlockConfig, ProjectionConfig, Vec3 } from './config'
import { defaultConfig } from './config'

interface PanelProps {
  config: ProjectionConfig
  onChange: (config: ProjectionConfig) => void
  onMatchView: () => void
}

const AXES = ['X', 'Y', 'Z'] as const

export function Panel({ config, onChange, onMatchView }: PanelProps) {
  const [blockIndex, setBlockIndex] = useState(1)
  const [copied, setCopied] = useState(false)
  const block = config.blocks[blockIndex]

  const setProjector = (patch: Partial<ProjectionConfig['projector']>) =>
    onChange({ ...config, projector: { ...config.projector, ...patch } })

  const setView = (patch: Partial<ProjectionConfig['view']>) =>
    onChange({ ...config, view: { ...config.view, ...patch } })

  const setBlock = (patch: Partial<BlockConfig>) =>
    onChange({
      ...config,
      blocks: config.blocks.map((b, i) => (i === blockIndex ? { ...b, ...patch } : b)),
    })

  const setVec = (vec: Vec3, i: number, v: number): Vec3 =>
    vec.map((n, j) => (j === i ? v : n)) as Vec3

  const exportConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-white/10 bg-[#0c0a08] p-4 font-mono text-[11px] text-neutral-300">
      <header>
        <h1 className="text-[13px] font-bold tracking-widest text-amber-200/90 uppercase">
          Projection Lab
        </h1>
        <p className="mt-1 leading-relaxed text-neutral-500">
          Align the projected image to the block structure, then export the config.
        </p>
      </header>

      <Section title="Alignment workflow">
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onMatchView} className={buttonClass}>
            1 · Match view to projector
          </button>
          <Slider
            label="2 · Reference overlay"
            value={config.view.overlayOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setView({ overlayOpacity: v })}
          />
          <p className="leading-relaxed text-neutral-500">
            3 · Tweak blocks + projector until silhouettes match, then drop the overlay and orbit.
          </p>
        </div>
      </Section>

      <Section title="Projector">
        {AXES.map((axis, i) => (
          <Slider
            key={`pp${axis}`}
            label={`Position ${axis}`}
            value={config.projector.position[i]}
            min={-40}
            max={40}
            step={0.05}
            onChange={(v) => setProjector({ position: setVec(config.projector.position, i, v) })}
          />
        ))}
        {AXES.map((axis, i) => (
          <Slider
            key={`pt${axis}`}
            label={`Target ${axis}`}
            value={config.projector.target[i]}
            min={-15}
            max={15}
            step={0.05}
            onChange={(v) => setProjector({ target: setVec(config.projector.target, i, v) })}
          />
        ))}
        <Slider
          label="FOV"
          value={config.projector.fov}
          min={8}
          max={80}
          step={0.1}
          onChange={(v) => setProjector({ fov: v })}
        />
        <Toggle
          label="Show frustum helper"
          value={config.view.showHelper}
          onChange={(v) => setView({ showHelper: v })}
        />
      </Section>

      <Section title="Geometry">
        <div className="mb-2 grid grid-cols-4 gap-1">
          {config.blocks.map((b, i) => (
            <button
              key={b.label}
              type="button"
              onClick={() => setBlockIndex(i)}
              className={`rounded border px-1 py-1.5 text-[10px] transition-colors ${
                i === blockIndex
                  ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
                  : 'border-white/10 text-neutral-400 hover:border-white/25'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {AXES.map((axis, i) => (
          <Slider
            key={`bp${axis}`}
            label={`Position ${axis}`}
            value={block.position[i]}
            min={-12}
            max={12}
            step={0.025}
            onChange={(v) => setBlock({ position: setVec(block.position, i, v) })}
          />
        ))}
        {(['Width', 'Height', 'Depth'] as const).map((dim, i) => (
          <Slider
            key={dim}
            label={dim}
            value={block.size[i]}
            min={0.1}
            max={22}
            step={0.025}
            onChange={(v) => setBlock({ size: setVec(block.size, i, v) })}
          />
        ))}
        <Slider
          label="Corner radius"
          value={block.radius}
          min={0}
          max={1.2}
          step={0.01}
          onChange={(v) => setBlock({ radius: v })}
        />
        <Toggle
          label="Clay view"
          value={config.view.clayView}
          onChange={(v) => setView({ clayView: v })}
        />
        <Toggle
          label="Wireframe"
          value={config.view.wireframe}
          onChange={(v) => setView({ wireframe: v })}
        />
      </Section>

      <Section title="Motion preview">
        <Toggle
          label="Auto-rotate"
          value={config.view.autoRotate}
          onChange={(v) => setView({ autoRotate: v })}
        />
        <Toggle
          label="Pointer parallax"
          value={config.view.parallax}
          onChange={(v) => setView({ parallax: v })}
        />
        <Slider
          label="Parallax amount"
          value={config.view.parallaxAmount}
          min={0}
          max={5}
          step={0.05}
          onChange={(v) => setView({ parallaxAmount: v })}
        />
      </Section>

      <Section title="Config">
        <div className="flex gap-2">
          <button type="button" onClick={exportConfig} className={buttonClass}>
            {copied ? 'Copied ✓' : 'Copy JSON'}
          </button>
          <button
            type="button"
            onClick={() => onChange(structuredClone(defaultConfig))}
            className={buttonClass}
          >
            Reset
          </button>
        </div>
        <p className="mt-2 leading-relaxed text-neutral-500">
          Changes auto-save to this browser. Copy JSON to hardcode the final calibration into the
          hero.
        </p>
      </Section>
    </aside>
  )
}

const buttonClass =
  'flex-1 rounded border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] uppercase tracking-wider text-neutral-200 transition-colors hover:border-amber-300/50 hover:text-amber-200'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="mb-1 border-b border-white/10 pb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Slider({
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
    <label className="grid grid-cols-[86px_1fr_52px] items-center gap-2">
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

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-0.5">
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
