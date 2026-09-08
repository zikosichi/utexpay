import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

import type { Hero3DConfig } from './config'
import { STRUCTURE_CENTER, STRUCTURE_WIDTH, VIEW_DIR } from './geometry'

export interface PointerState {
  /** -0.5 … 0.5 across the hero */
  x: number
  y: number
  reduced: boolean
}

interface RigProps {
  config: Hero3DConfig
  pointer: React.RefObject<PointerState>
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Frames the structure for any viewport and orbits the camera on pointer
 * movement. The structure never moves — only the camera — which is what
 * keeps the projected render glued to the surfaces.
 */
export function Rig({ config, pointer }: RigProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)

  const baseDir = useMemo(() => new THREE.Vector3(...VIEW_DIR).normalize(), [])
  const center = useMemo(() => new THREE.Vector3(...STRUCTURE_CENTER), [])
  const state = useRef({ yaw: 0, pitch: 0, sx: 0, sy: 0 })
  const scratch = useMemo(
    () => ({ dir: new THREE.Vector3(), right: new THREE.Vector3(), target: new THREE.Vector3() }),
    [],
  )

  useFrame(({ clock }) => {
    const { framing, parallax } = config
    const s = state.current
    const p = pointer.current
    const motion = p && !p.reduced ? 1 : 0

    const t = clock.elapsedTime
    const idleYaw = Math.sin(t * 0.23) * parallax.idle * motion
    const idlePitch = Math.cos(t * 0.17) * parallax.idle * 0.5 * motion

    const px = p ? p.x * motion : 0
    const py = p ? p.y * motion : 0
    const targetYaw = -px * 2 * parallax.yaw + idleYaw
    const targetPitch = py * 2 * parallax.pitch + idlePitch

    s.yaw += (targetYaw - s.yaw) * parallax.damping
    s.pitch += (targetPitch - s.pitch) * parallax.damping
    s.sx += (px - s.sx) * parallax.damping
    s.sy += (py - s.sy) * parallax.damping

    const aspect = size.width / size.height
    const vfov = THREE.MathUtils.degToRad(framing.fov)
    const halfH = Math.tan(vfov / 2)
    const halfW = halfH * aspect
    // Narrow viewports: let the structure overflow instead of shrinking to a sliver.
    const wf = aspect < 1 ? framing.widthFraction * 1.9 : aspect < 1.4 ? framing.widthFraction * 1.25 : framing.widthFraction
    const dist = STRUCTURE_WIDTH / 2 / wf / halfW

    const { dir, right, target } = scratch
    dir.copy(baseDir).applyAxisAngle(UP, THREE.MathUtils.degToRad(s.yaw))
    right.crossVectors(UP, dir).normalize()
    dir.applyAxisAngle(right, THREE.MathUtils.degToRad(-s.pitch))

    target.copy(center)
    target.x += s.sx * parallax.shift
    target.y += s.sy * parallax.shift * 0.5

    camera.position.copy(target).addScaledVector(dir, dist)
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
    // Tilt so the structure's centre lands at anchorY of the viewport height.
    const tilt = Math.atan((framing.anchorY - 0.5) * 2 * halfH)
    camera.rotateX(tilt)

    if (camera.fov !== framing.fov || camera.aspect !== aspect) {
      camera.fov = framing.fov
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
  })

  return null
}
