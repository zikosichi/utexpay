import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, MeshReflectorMaterial } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

import type { Hero3DConfig } from './config'
import { BLOCKS, BLOCK_DEPTH, BLOCK_RADIUS, FRONT_Z, SLAB, SLAB_TOP } from './geometry'
import { Card } from './Card'
import { BusinessPanel, PaymentsPanel, PersonalPanel } from './Panels'

/** CSS px per world unit inside the HTML panels. */
export const PPU = 128
export const DISTANCE_FACTOR = 400 / PPU

interface StructureProps {
  config: Hero3DConfig
  blockMaterial: THREE.Material
  glassMaterial: THREE.Material
  cardMaterial: THREE.Material
  introNonce: number
}

const PANELS = {
  personal: PersonalPanel,
  business: BusinessPanel,
  payments: PaymentsPanel,
}

const INTRO_DELAY = 0.25
const INTRO_STAGGER = 0.24
const INTRO_DURATION = 1.15

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function Structure({
  config,
  blockMaterial,
  glassMaterial,
  cardMaterial,
  introNonce,
}: StructureProps) {
  const { show, mode } = config

  const geometry = useMemo(
    () => ({
      blocks: BLOCKS.map((b) => new RoundedBoxGeometry(b.width, b.height, BLOCK_DEPTH, 7, BLOCK_RADIUS)),
      bezels: BLOCKS.map((b) => new RoundedBoxGeometry(b.panel.w + 0.14, b.panel.h + 0.14, 0.07, 3, 0.05)),
      slab: new RoundedBoxGeometry(SLAB.width, SLAB.thickness, SLAB.depth, 5, SLAB.radius),
    }),
    [],
  )
  useEffect(
    () => () => {
      geometry.blocks.forEach((g) => g.dispose())
      geometry.bezels.forEach((g) => g.dispose())
      geometry.slab.dispose()
    },
    [geometry],
  )

  const blockRefs = useRef<(THREE.Mesh | null)[]>([])
  const start = useRef<number | null>(null)
  const [lit, setLit] = useState<boolean[]>(() => BLOCKS.map(() => !show.intro))
  const litRef = useRef(lit)

  useEffect(() => {
    start.current = null
    const initial = BLOCKS.map(() => !show.intro)
    litRef.current = initial
    setLit(initial)
  }, [introNonce, show.intro])

  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    // Debug hook: freeze the intro at a given second (used for screenshots).
    const frozen = (window as unknown as { __h3dIntroT?: number }).__h3dIntroT
    const t = typeof frozen === 'number' ? frozen : clock.elapsedTime - start.current
    let changed = false
    BLOCKS.forEach((b, i) => {
      const mesh = blockRefs.current[i]
      if (!mesh) return
      const local = show.intro ? (t - INTRO_DELAY - i * INTRO_STAGGER) / INTRO_DURATION : 1
      const e = easeOutCubic(THREE.MathUtils.clamp(local, 0, 1))
      const s = 0.002 + 0.998 * e
      mesh.scale.y = s
      mesh.position.y = SLAB_TOP + (b.height * s) / 2
      const done = e > 0.985
      if (done !== litRef.current[i]) {
        litRef.current = litRef.current.map((v, j) => (j === i ? done : v))
        changed = true
      }
    })
    if (changed) setLit(litRef.current)
  })

  const reflector = show.reflector && mode !== 'projected'

  return (
    <group>
      {/* plinth */}
      <mesh
        geometry={geometry.slab}
        material={blockMaterial}
        position={[SLAB.x, SLAB_TOP - SLAB.thickness / 2, 0]}
        receiveShadow
        castShadow
      />
      {reflector && (
        <mesh rotation-x={-Math.PI / 2} position={[SLAB.x, SLAB_TOP + 0.004, 0]}>
          <planeGeometry args={[SLAB.width - 0.3, SLAB.depth - 0.3]} />
          <MeshReflectorMaterial
            blur={[480, 120]}
            resolution={1024}
            mixBlur={1}
            mixStrength={1.1}
            roughness={0.9}
            depthScale={0.9}
            minDepthThreshold={0.5}
            maxDepthThreshold={1.5}
            color="#1b150f"
            metalness={0.55}
            mirror={0.35}
          />
        </mesh>
      )}

      {BLOCKS.map((b, i) => {
        const Panel = PANELS[b.key]
        const panelY = SLAB_TOP + b.panel.y + b.panel.h / 2
        const on = lit[i]
        return (
          <group key={b.key}>
            <mesh
              ref={(m) => {
                blockRefs.current[i] = m
              }}
              geometry={geometry.blocks[i]}
              material={blockMaterial}
              position={[b.x, SLAB_TOP + b.height / 2, 0]}
              castShadow
              receiveShadow
            />

            {show.panels && (
              <group visible={on}>
                <mesh
                  geometry={geometry.bezels[i]}
                  material={blockMaterial}
                  position={[b.x, panelY, FRONT_Z + 0.02]}
                  castShadow
                  receiveShadow
                />
                <mesh position={[b.x, panelY, FRONT_Z + 0.056]} material={glassMaterial} receiveShadow>
                  <planeGeometry args={[b.panel.w, b.panel.h]} />
                </mesh>
                <Html
                  transform
                  center
                  distanceFactor={DISTANCE_FACTOR}
                  position={[b.x, panelY, FRONT_Z + 0.06]}
                  zIndexRange={[2, 1]}
                  style={{ pointerEvents: 'none' }}
                  className={`h3d-html ${on ? 'is-on' : ''}`}
                >
                  <div
                    className="h3d-screen"
                    style={{ width: b.panel.w * PPU, height: b.panel.h * PPU }}
                  >
                    <Panel />
                  </div>
                </Html>
              </group>
            )}

            {show.labels && (
              <Html
                transform
                center
                distanceFactor={DISTANCE_FACTOR}
                position={[b.x, SLAB_TOP + b.height - 0.34, FRONT_Z + 0.004]}
                zIndexRange={[2, 1]}
                style={{ pointerEvents: 'none' }}
                className={`h3d-html ${on ? 'is-on' : ''}`}
              >
                <div className="h3d-label">{b.label}</div>
              </Html>
            )}
          </group>
        )
      })}

      <Card material={cardMaterial} visible={show.card && lit[BLOCKS.length - 1]} />
    </group>
  )
}
