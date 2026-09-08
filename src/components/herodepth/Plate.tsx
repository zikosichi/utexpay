import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

import type { HeroDepthConfig } from './config'
import { MAP_ASPECT, MAP_H, MAP_W, PLATE_CAM } from './scene'
import type { PlateMaterial } from './plateMaterial'
import type { PointerState } from './Rig'

interface PlateProps {
  config: HeroDepthConfig
  material: PlateMaterial
  pointer: React.RefObject<PointerState>
  introNonce: number
}

const DEBUG_INDEX = { none: 0, mesh: 0, depth: 1, normal: 2, mask: 3, light: 4, edges: 5, wire: 0, boxes: 0 } as const
const SWEEP_DURATION = 2.4
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** The depth-displaced image grid plus the light that follows the pointer. */
export function Plate({ config, material, pointer, introNonce }: PlateProps) {
  const { density } = config.depth
  const geometry = useMemo(() => {
    const cols = Math.max(16, Math.round(density))
    const rows = Math.max(9, Math.round((density * MAP_H) / MAP_W))
    return new THREE.PlaneGeometry(1, 1, cols, rows)
  }, [density])
  useEffect(() => () => geometry.dispose(), [geometry])

  const light = useRef({ x: 0, y: 0 })
  const sweepStart = useRef<number | null>(null)
  useEffect(() => {
    sweepStart.current = null
  }, [introNonce])

  // lab values → uniforms
  useEffect(() => {
    const u = material.uniforms
    const { depth, light: l, show } = config
    u.uEdge.value = depth.edge === 'cut' ? 1 : 0
    u.uCut.value = depth.cut
    u.uDepthScale.value = depth.scale
    u.uMapOverlay.value = depth.mapOverlay
    u.uLightOn.value = l.enabled ? 1 : 0
    ;(u.uLightColor.value as THREE.Color).set(l.color)
    u.uSheen.value = l.sheen
    u.uSheenPow.value = l.sheenPow
    u.uSpec.value = l.spec
    u.uSpecPow.value = l.specPow
    u.uShade.value = l.shade
    u.uGlint.value = l.glint
    u.uGlintPow.value = l.glintPow
    u.uGlintLocal.value = l.glintLocal
    u.uDebug.value = DEBUG_INDEX[show.debug]
    material.wireframe = show.debug === 'wire'
  }, [config, material])

  useFrame(({ clock, camera, size, gl }) => {
    // image px per device px at rest, for the stretch test
    const cam = camera as THREE.PerspectiveCamera
    const halfW = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect
    const plateHalfW = Math.tan(THREE.MathUtils.degToRad(PLATE_CAM.vfov) / 2) * MAP_ASPECT
    const platePx = size.width * gl.getPixelRatio() * (plateHalfW / halfW)
    material.uniforms.uRestRatio.value = MAP_W / platePx

    const p = config.view.locked ? null : pointer.current
    const motion = p && !p.reduced ? 1 : 0
    const px = p ? p.x * motion : 0
    const py = p ? p.y * motion : 0
    const { light: l, parallax, show } = config

    const t = clock.elapsedTime
    if (sweepStart.current === null) sweepStart.current = t
    const frozen = (window as unknown as { __hdIntroT?: number }).__hdIntroT
    const sweepT = typeof frozen === 'number' ? frozen : t - sweepStart.current
    const sweep = show.intro && motion ? 1 - easeOutCubic(THREE.MathUtils.clamp(sweepT / SWEEP_DURATION, 0, 1)) : 0

    const targetX = px * 2 * l.travel - sweep * l.travel * 1.6
    const targetY = -py * 2 * l.travel * 0.35
    const s = light.current
    s.x += (targetX - s.x) * parallax.damping
    s.y += (targetY - s.y) * parallax.damping

    const u = material.uniforms
    ;(u.uLightPos.value as THREE.Vector3).set(-1.5 + s.x, l.height + s.y, l.distance)
    // the plate fills roughly the viewport width; map the pointer into image space for the local glint
    ;(u.uPointerUv.value as THREE.Vector2).set(0.5 + px * 0.95, 0.62 - py * 1.1)
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
