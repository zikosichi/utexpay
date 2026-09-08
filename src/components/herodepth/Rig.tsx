import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

import type { HeroDepthConfig } from './config'
import { CAMERA, CAMERA_QUATERNION, STRUCTURE_CENTER, STRUCTURE_WIDTH } from './scene'

export interface PointerState {
  /** -0.5 … 0.5 across the hero */
  x: number
  y: number
  reduced: boolean
}

interface RigProps {
  config: HeroDepthConfig
  pointer: React.RefObject<PointerState>
  introNonce: number
}

const UP = new THREE.Vector3(0, 1, 0)
const INTRO_DURATION = 1.6
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Frames the plate for any viewport and orbits the camera on pointer
 * movement. At rest the camera is exactly the one the render was solved
 * for (position and orientation), so the image reads as shot; framing is
 * done with the field of view and a tilt only, never a dolly, and the
 * plate never moves — only the camera does.
 */
export function Rig({ config, pointer, introNonce }: RigProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)

  // orbit target: the structure centre projected onto the rest camera's axis
  const rest = useMemo(() => {
    const depth = STRUCTURE_CENTER.clone().sub(CAMERA.position).dot(CAMERA.forward)
    const target = CAMERA.position.clone().addScaledVector(CAMERA.forward, depth)
    return { target, offset: CAMERA.position.clone().sub(target), distance: depth }
  }, [])
  const state = useRef({ yaw: 0, pitch: 0, sx: 0, sy: 0 })
  const introStart = useRef<number | null>(null)
  const scratch = useMemo(
    () => ({
      qYaw: new THREE.Quaternion(),
      qPitch: new THREE.Quaternion(),
      q: new THREE.Quaternion(),
      right: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [],
  )

  useEffect(() => {
    introStart.current = null
  }, [introNonce])

  useFrame(({ clock }) => {
    const { framing, parallax, show, view } = config
    const s = state.current
    const p = pointer.current
    const motion = p && !p.reduced ? 1 : 0

    const t = clock.elapsedTime
    if (introStart.current === null) introStart.current = t
    const frozen = (window as unknown as { __hdIntroT?: number }).__hdIntroT
    const introT = typeof frozen === 'number' ? frozen : t - introStart.current
    const intro = show.intro && motion ? 1 - easeOutCubic(THREE.MathUtils.clamp(introT / INTRO_DURATION, 0, 1)) : 0

    const idleYaw = Math.sin(t * 0.23) * parallax.idle * motion
    const idlePitch = Math.cos(t * 0.17) * parallax.idle * 0.5 * motion

    const px = p ? p.x * motion : 0
    const py = p ? p.y * motion : 0
    const targetYaw = -px * 2 * parallax.yaw + idleYaw - intro * 2.2
    const targetPitch = py * 2 * parallax.pitch + idlePitch + intro * 1.4

    if (view.locked) {
      // fixed view: no pointer, no idle, no intro — so a bake is repeatable
      s.yaw = view.yaw
      s.pitch = view.pitch
      s.sx = 0
      s.sy = 0
    } else {
      s.yaw += (targetYaw - s.yaw) * parallax.damping
      s.pitch += (targetPitch - s.pitch) * parallax.damping
      s.sx += (px - s.sx) * parallax.damping
      s.sy += (py - s.sy) * parallax.damping
    }

    const aspect = size.width / size.height
    const wf =
      aspect < 1 ? framing.widthFraction * 1.9 : aspect < 1.4 ? framing.widthFraction * 1.25 : framing.widthFraction
    const halfW = STRUCTURE_WIDTH / 2 / wf / rest.distance
    const halfH = (halfW / aspect) * (1 + (view.locked ? 0 : intro) * 0.06)
    const vfov = 2 * Math.atan(halfH)

    const { qYaw, qPitch, q, right, offset, target } = scratch
    qYaw.setFromAxisAngle(UP, THREE.MathUtils.degToRad(s.yaw))
    right.copy(CAMERA.right).applyQuaternion(qYaw)
    qPitch.setFromAxisAngle(right, THREE.MathUtils.degToRad(-s.pitch))
    q.copy(qPitch).multiply(qYaw)

    target.copy(rest.target)
    target.x += s.sx * parallax.shift
    target.y += s.sy * parallax.shift * 0.5

    offset.copy(rest.offset).applyQuaternion(q)
    camera.position.copy(target).add(offset)
    camera.quaternion.copy(q).multiply(CAMERA_QUATERNION)
    // Tilt so the structure's centre lands at anchorY of the viewport height.
    camera.rotateX(Math.atan((framing.anchorY - 0.5) * 2 * halfH))

    const fovDeg = THREE.MathUtils.radToDeg(vfov)
    if (Math.abs(camera.fov - fovDeg) > 1e-4 || camera.aspect !== aspect) {
      camera.fov = fovDeg
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
  })

  return null
}
