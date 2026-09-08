import { useState } from 'react'

import { ColorRow, Group, Select, Slider, Toggle, btn } from '../hero3d/LabPanel'
import type { BoxKey, BoxTweak, DebugView, EdgeMode, HeroDepthConfig, Overlay, PlateSource } from './config'
import { defaultConfig, IDENTITY_BOX } from './config'
import { DEFAULT_DIMS } from './boxGeometry'
import type { BoxDims } from './boxGeometry'

const BOXES: [BoxKey, string][] = [
  ['slab', 'Slab (plinth)'],
  ['personal', 'Personal — left'],
  ['business', 'Business — middle'],
  ['payments', 'Payments — right'],
]

interface LabPanelProps {
  config: HeroDepthConfig
  onChange: (config: HeroDepthConfig) => void
  onReplayIntro: () => void
  onClose: () => void
}

type Section = keyof HeroDepthConfig

export function LabPanel({ config, onChange, onReplayIntro, onClose }: LabPanelProps) {
  const [copied, setCopied] = useState(false)
  const [copiedBoxes, setCopiedBoxes] = useState(false)

  const setBox = (key: BoxKey, patch: Partial<BoxTweak>) =>
    onChange({ ...config, boxes: { ...config.boxes, [key]: { ...config.boxes[key], ...patch } } })

  const resetBoxes = () =>
    onChange({
      ...config,
      boxes: {
        slab: { ...IDENTITY_BOX },
        personal: { ...IDENTITY_BOX },
        business: { ...IDENTITY_BOX },
        payments: { ...IDENTITY_BOX },
      },
    })

  const setDim = (key: BoxKey, patch: Partial<BoxDims>) =>
    onChange({
      ...config,
      geometry: { ...config.geometry, dims: { ...config.geometry.dims, [key]: { ...config.geometry.dims[key], ...patch } } },
    })

  const resetDims = () =>
    onChange({
      ...config,
      geometry: {
        ...config.geometry,
        dims: {
          slab: { ...DEFAULT_DIMS.slab },
          personal: { ...DEFAULT_DIMS.personal },
          business: { ...DEFAULT_DIMS.business },
          payments: { ...DEFAULT_DIMS.payments },
        },
      },
    })

  const exportBoxes = (mode: 'clay' | 'lines') => {
    const fn = (window as unknown as { __hdExportBoxes?: (m: 'clay' | 'lines') => void }).__hdExportBoxes
    if (fn) fn(mode)
  }

  const copyDims = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config.geometry.dims, null, 2))
    setCopiedBoxes(true)
    setTimeout(() => setCopiedBoxes(false), 1500)
  }

  const copyBoxes = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config.boxes, null, 2))
    setCopiedBoxes(true)
    setTimeout(() => setCopiedBoxes(false), 1500)
  }

  const set = <S extends Section>(section: S, patch: Partial<HeroDepthConfig[S]>) =>
    onChange({ ...config, [section]: { ...config[section], ...patch } })

  const exportConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <aside className="h3d-lab">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[12px] font-bold tracking-[0.2em] text-amber-200/90 uppercase">Depth hero lab</h2>
          <p className="mt-1 text-[10.5px] leading-relaxed text-neutral-500">
            The real render, displaced by the depth of the matched Blender mesh and relit from the pointer.
          </p>
        </div>
        <button type="button" onClick={onClose} className={btn}>
          Hide
        </button>
      </header>

      <Group title="Show">
        <Toggle label="Intro" value={config.show.intro} onChange={(v) => set('show', { intro: v })} />
        <button type="button" onClick={onReplayIntro} className={`${btn} mt-1`}>
          Replay intro
        </button>
        <Select<DebugView>
          label="View"
          value={config.show.debug}
          options={[
            ['none', 'final'],
            ['mesh', 'mesh edges over the render'],
            ['depth', 'depth'],
            ['normal', 'normals'],
            ['mask', 'mask + gold'],
            ['light', 'added light only'],
            ['edges', 'cut edges (red)'],
            ['wire', 'wireframe'],
            ['boxes', 'boxes only (for an image model)'],
          ]}
          onChange={(v) => set('show', { debug: v })}
        />
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
        <Slider label="Overlay α" value={config.show.overlayOpacity} min={0} max={1} step={0.01} onChange={(v) => set('show', { overlayOpacity: v })} />
      </Group>

      <Group title="Plate">
        <Select<PlateSource>
          label="Image"
          value={config.plate.source}
          options={[
            ['render', 'original render'],
            ['boxes', 'bronze bake of the boxes'],
          ]}
          onChange={(v) => set('plate', { source: v })}
        />
        <p className="text-[10px] leading-relaxed text-neutral-500">
          The camera the plate was shot from. The bake was made at this yaw/pitch/width, so the depth
          pass uses the same one — set these to match whatever you exported, and lock the view to it.
        </p>
        <Slider label="Bake yaw °" value={config.plate.yaw} min={-75} max={75} step={0.5} onChange={(v) => set('plate', { yaw: v })} />
        <Slider label="Bake pitch °" value={config.plate.pitch} min={-45} max={45} step={0.5} onChange={(v) => set('plate', { pitch: v })} />
        <Slider label="Bake width" value={config.plate.widthFraction} min={0.4} max={1.2} step={0.005} onChange={(v) => set('plate', { widthFraction: v })} />
        <button
          type="button"
          className={`${btn} mt-1`}
          onClick={() =>
            onChange({
              ...config,
              plate: { ...config.plate, yaw: config.view.yaw, pitch: config.view.pitch, widthFraction: config.framing.widthFraction },
            })
          }
        >
          Take bake camera from current view
        </button>
      </Group>

      <Group title="Camera">
        <Toggle label="Lock view" value={config.view.locked} onChange={(v) => set('view', { locked: v })} />
        <p className="text-[10px] leading-relaxed text-neutral-500">
          Fixes the camera and the light: no pointer, no idle sway, no intro. Yaw is degrees around
          the structure — negative swings to the left. The PNG export bakes exactly this view.
        </p>
        <Slider label="Yaw °" value={config.view.yaw} min={-75} max={75} step={0.5} onChange={(v) => set('view', { yaw: v })} />
        <Slider label="Pitch °" value={config.view.pitch} min={-45} max={45} step={0.5} onChange={(v) => set('view', { pitch: v })} />
      </Group>

      <Group title="Real boxes">
        <Toggle
          label="Real boxes"
          value={config.geometry.procedural}
          onChange={(v) => set('geometry', { procedural: v })}
        />
        <p className="text-[10px] leading-relaxed text-neutral-500">
          Clean axis-aligned boxes built from dimensions, replacing the modelled mesh. X is the centre
          along the row, Y is the face it sits on, Z is its front plane. Hero units — the slab is 15.379 wide.
        </p>
        <Slider label="Corner r" value={config.geometry.radius} min={0} max={0.6} step={0.005} onChange={(v) => set('geometry', { radius: v })} />
        {BOXES.map(([key, label]) => (
          <div key={key} className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 text-[10px] tracking-[0.16em] text-amber-200/70 uppercase">{label}</div>
            <Slider label="X centre" value={config.geometry.dims[key].x} min={-10} max={10} step={0.005} onChange={(v) => setDim(key, { x: v })} />
            <Slider label="Y sits on" value={config.geometry.dims[key].y} min={-6} max={4} step={0.005} onChange={(v) => setDim(key, { y: v })} />
            <Slider label="Z front" value={config.geometry.dims[key].z} min={-4} max={4} step={0.005} onChange={(v) => setDim(key, { z: v })} />
            <Slider label="Width" value={config.geometry.dims[key].w} min={0.2} max={18} step={0.005} onChange={(v) => setDim(key, { w: v })} />
            <Slider label="Height" value={config.geometry.dims[key].h} min={0.2} max={8} step={0.005} onChange={(v) => setDim(key, { h: v })} />
            <Slider label="Depth" value={config.geometry.dims[key].d} min={0.2} max={6} step={0.005} onChange={(v) => setDim(key, { d: v })} />
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={resetDims} className={btn}>
            Reset sizes
          </button>
          <button type="button" onClick={copyDims} className={btn}>
            {copiedBoxes ? 'Copied' : 'Copy sizes'}
          </button>
        </div>
        <div className="mt-1 flex gap-2">
          <button type="button" onClick={() => exportBoxes('clay')} className={btn}>
            Export clay PNG
          </button>
          <button type="button" onClick={() => exportBoxes('lines')} className={btn}>
            Export lines PNG
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
          Both export at 1672×941. Unlocked they use the rest camera — the render's own frame — so the
          result drops straight back in as projection-blocks.png. Locked, they bake the view above.
        </p>
      </Group>

      {!config.geometry.procedural && (
      <Group title="Box match">
        <p className="text-[10px] leading-relaxed text-neutral-500">
          Set View to “mesh edges over the render”, then move and scale each box until the magenta
          wireframe sits on the bronze edges. Scale is about each box's own centre, then move.
          Units are the hero's (the slab is 15.379 wide). Copy the values when it matches.
        </p>
        {BOXES.map(([key, label]) => (
          <div key={key} className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 text-[10px] tracking-[0.16em] text-amber-200/70 uppercase">{label}</div>
            <Slider label="Move X" value={config.boxes[key].tx} min={-1.5} max={1.5} step={0.005} onChange={(v) => setBox(key, { tx: v })} />
            <Slider label="Move Y" value={config.boxes[key].ty} min={-1.5} max={1.5} step={0.005} onChange={(v) => setBox(key, { ty: v })} />
            <Slider label="Move Z" value={config.boxes[key].tz} min={-1.5} max={1.5} step={0.005} onChange={(v) => setBox(key, { tz: v })} />
            <Slider label="Width ×" value={config.boxes[key].sx} min={0.8} max={1.2} step={0.002} onChange={(v) => setBox(key, { sx: v })} />
            <Slider label="Height ×" value={config.boxes[key].sy} min={0.8} max={1.2} step={0.002} onChange={(v) => setBox(key, { sy: v })} />
            <Slider label="Depth ×" value={config.boxes[key].sz} min={0.8} max={1.2} step={0.002} onChange={(v) => setBox(key, { sz: v })} />
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={resetBoxes} className={btn}>
            Reset boxes
          </button>
          <button type="button" onClick={copyBoxes} className={btn}>
            {copiedBoxes ? 'Copied' : 'Copy box values'}
          </button>
        </div>
      </Group>
      )}

      <Group title="Framing">
        <Slider label="Width" value={config.framing.widthFraction} min={0.5} max={1.4} step={0.005} onChange={(v) => set('framing', { widthFraction: v })} />
        <Slider label="Anchor Y" value={config.framing.anchorY} min={0.4} max={1} step={0.005} onChange={(v) => set('framing', { anchorY: v })} />
        <Toggle label="Render's camera roll" value={config.framing.roll} onChange={(v) => set('framing', { roll: v })} />
      </Group>

      <Group title="Motion">
        <Slider label="Yaw °" value={config.parallax.yaw} min={0} max={12} step={0.1} onChange={(v) => set('parallax', { yaw: v })} />
        <Slider label="Pitch °" value={config.parallax.pitch} min={0} max={8} step={0.1} onChange={(v) => set('parallax', { pitch: v })} />
        <Slider label="Shift" value={config.parallax.shift} min={0} max={1.5} step={0.01} onChange={(v) => set('parallax', { shift: v })} />
        <Slider label="Idle °" value={config.parallax.idle} min={0} max={2} step={0.05} onChange={(v) => set('parallax', { idle: v })} />
        <Slider label="Damping" value={config.parallax.damping} min={0.01} max={0.2} step={0.005} onChange={(v) => set('parallax', { damping: v })} />
      </Group>

      <Group title="Depth">
        <Slider label="Depth ×" value={config.depth.scale} min={0.5} max={3} step={0.05} onChange={(v) => set('depth', { scale: v })} />
        <Slider label="Map overlay" value={config.depth.mapOverlay} min={0} max={1} step={0.01} onChange={(v) => set('depth', { mapOverlay: v })} />
        <Slider label="Grid" value={config.depth.density} min={100} max={836} step={2} onChange={(v) => set('depth', { density: v })} />
        <Select<EdgeMode>
          label="Edges"
          value={config.depth.edge}
          options={[
            ['cut', 'cut (drop stretched tris)'],
            ['stretch', 'stretch (rubber sheet)'],
          ]}
          onChange={(v) => set('depth', { edge: v })}
        />
        <Slider label="Cut at ×" value={config.depth.cut} min={1.2} max={10} step={0.1} onChange={(v) => set('depth', { cut: v })} />
        <Toggle label="Bronze backing" value={config.depth.backing} onChange={(v) => set('depth', { backing: v })} />
        <ColorRow label="Backing" value={config.depth.backingColor} onChange={(v) => set('depth', { backingColor: v })} />
      </Group>

      <Group title="Live light">
        <Toggle label="Enabled" value={config.light.enabled} onChange={(v) => set('light', { enabled: v })} />
        <ColorRow label="Colour" value={config.light.color} onChange={(v) => set('light', { color: v })} />
        <Slider label="Sheen" value={config.light.sheen} min={0} max={0.6} step={0.005} onChange={(v) => set('light', { sheen: v })} />
        <Slider label="Sheen size" value={config.light.sheenPow} min={1} max={30} step={0.5} onChange={(v) => set('light', { sheenPow: v })} />
        <Slider label="Specular" value={config.light.spec} min={0} max={2} step={0.01} onChange={(v) => set('light', { spec: v })} />
        <Slider label="Spec size" value={config.light.specPow} min={4} max={200} step={1} onChange={(v) => set('light', { specPow: v })} />
        <Slider label="Shade shift" value={config.light.shade} min={0} max={0.6} step={0.01} onChange={(v) => set('light', { shade: v })} />
        <Slider label="Travel" value={config.light.travel} min={0} max={30} step={0.5} onChange={(v) => set('light', { travel: v })} />
        <Slider label="Height" value={config.light.height} min={0} max={20} step={0.25} onChange={(v) => set('light', { height: v })} />
        <Slider label="Distance" value={config.light.distance} min={2} max={30} step={0.25} onChange={(v) => set('light', { distance: v })} />
        <Slider label="Gold glint" value={config.light.glint} min={0} max={5} step={0.05} onChange={(v) => set('light', { glint: v })} />
        <Slider label="Glint size" value={config.light.glintPow} min={2} max={120} step={1} onChange={(v) => set('light', { glintPow: v })} />
        <Slider label="Glint local" value={config.light.glintLocal} min={0} max={1} step={0.02} onChange={(v) => set('light', { glintLocal: v })} />
      </Group>

      <footer className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={exportConfig} className={btn}>
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button type="button" onClick={() => onChange(defaultConfig)} className={btn}>
            Reset
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Background pixels take their nearest block's depth, so silhouettes never tear. Add <code>?lab=0</code> to hide this panel.
        </p>
      </footer>
    </aside>
  )
}
