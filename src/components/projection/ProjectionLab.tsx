import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'

import { loadConfig, saveConfig } from './config'
import type { ProjectionConfig } from './config'
import { Panel } from './Panel'
import { Scene } from './Scene'

const IMAGE_ASPECT = 1672 / 941

export function ProjectionLab() {
  const [config, setConfig] = useState<ProjectionConfig | null>(null)
  const [matchNonce, setMatchNonce] = useState(0)

  // Config comes from localStorage, so load it client-side only.
  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  useEffect(() => {
    if (config) saveConfig(config)
  }, [config])

  if (!config) return <div className="fixed inset-0 bg-black" />

  return (
    <div className="fixed inset-0 flex bg-black">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        {/* Stage is locked to the texture aspect so the overlay lines up 1:1
            with the render when the view camera matches the projector. */}
        <div
          className="relative max-h-full w-full max-w-full"
          style={{ aspectRatio: IMAGE_ASPECT }}
        >
          <Canvas
            camera={{ position: config.projector.position, fov: config.projector.fov }}
            gl={{ antialias: true }}
            className="rounded-lg"
          >
            <Suspense fallback={null}>
              <Scene config={config} matchNonce={matchNonce} />
            </Suspense>
          </Canvas>
          {config.view.overlayOpacity > 0 && (
            <img
              src="/projection-blocks.png"
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full rounded-lg object-fill"
              style={{ opacity: config.view.overlayOpacity }}
            />
          )}
        </div>
      </div>
      <Panel
        config={config}
        onChange={setConfig}
        onMatchView={() => setMatchNonce((n) => n + 1)}
      />
    </div>
  )
}
