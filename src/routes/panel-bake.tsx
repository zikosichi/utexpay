import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PANELS } from '#/components/photostructure/panels'
import { BLEED, PANEL_NAMES, PANEL_SURFACES } from '#/components/photostructure/surfaces'
import type { PanelName } from '#/components/photostructure/surfaces'

/**
 * Bake sheet for the photographic hero's panels. With `?surface=<name>` it
 * renders that one panel flat, at its authored size plus bleed, over a
 * transparent page — `scripts/bake-panels.mjs` screenshots exactly that.
 * Without a query it lays every panel out on bronze for a visual check.
 */
/** Every face the panels can use, requested explicitly so a bake never waits on layout to trigger a font load. */
const FACES = ['500 50px Oxanium', '400 20px Oxanium', '400 16px "DM Sans"', '500 16px "DM Sans"', '400 16px "IBM Plex Mono"', '400 16px "Space Grotesk"']

export const Route = createFileRoute('/panel-bake')({
  validateSearch: (search: Record<string, unknown>): { surface?: PanelName } => {
    const surface = search.surface
    return typeof surface === 'string' && surface in PANEL_SURFACES ? { surface: surface as PanelName } : {}
  },
  component: PanelBake,
  head: () => ({
    meta: [{ title: 'UTEX Pay — panel bake' }, { name: 'robots', content: 'noindex' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Oxanium:wght@400;500&family=Space+Grotesk:wght@400&display=swap' },
    ],
  }),
})

function PanelBake() {
  const { surface } = Route.useSearch()
  useEffect(() => {
    // `data-bake-ready` flips to "true" once the Google Fonts stylesheet is in
    // and every face above has loaded, or "timeout" so the bake script can say
    // what went wrong.
    const root = document.documentElement
    root.dataset.bakeReady = ''
    const started = performance.now()
    let frame = 0, cancelled = false
    const settle = async () => {
      if (cancelled) return
      if (!Array.from(document.styleSheets).some((sheet) => sheet.href?.includes('fonts.googleapis.com'))) {
        if (performance.now() - started > 15000) root.dataset.bakeReady = 'timeout'
        else frame = requestAnimationFrame(settle)
        return
      }
      const loaded = await Promise.all(FACES.map((face) => document.fonts.load(face)))
      await document.fonts.ready
      if (cancelled) return
      root.dataset.bakeReady = loaded.every((faces) => faces.length > 0) ? 'true' : 'timeout'
    }
    frame = requestAnimationFrame(settle)
    return () => { cancelled = true; cancelAnimationFrame(frame); delete root.dataset.bakeReady }
  }, [surface])
  if (surface) {
    const spec = PANEL_SURFACES[surface]
    return <>
      <style>{'html, body { background: transparent !important; margin: 0; overflow: hidden; }'}</style>
      <div data-bake={surface} style={{ position: 'relative', boxSizing: 'content-box', width: spec.width, height: spec.height, padding: BLEED }}>
        <div style={{ position: 'relative', width: spec.width, height: spec.height }}>{PANELS[surface]()}</div>
      </div>
    </>
  }
  return <main style={{ padding: 40, background: '#1f1b16', color: '#a89a80', font: '12px/1.5 "IBM Plex Mono", monospace' }}>
    <p style={{ margin: '0 0 24px' }}>Panel bake sheet · {PANEL_NAMES.length} surfaces · append <code>?surface=&lt;name&gt;</code> for the flat bake view.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
      {PANEL_NAMES.map((name) => {
        const spec = PANEL_SURFACES[name]
        return <figure key={name} style={{ margin: 0 }}>
          <div style={{ position: 'relative', width: spec.width, height: spec.height, outline: '1px dashed #4a4032' }}>{PANELS[name]()}</div>
          <figcaption style={{ marginTop: 8 }}>{name} · {spec.width} × {spec.height} (+{BLEED} bleed)</figcaption>
        </figure>
      })}
    </div>
  </main>
}
