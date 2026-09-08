import * as THREE from 'three'

import { SCENE_DATA } from './sceneData'

/**
 * The structure as the friend's Blender mesh describes it, in the hero's
 * units (slab 15.379 wide, like the earlier fitted boxes, so screen sizes,
 * light distances and the orbit keep their meaning), seen from the camera
 * solved against the render.
 */

export const UNIT = SCENE_DATA.unitScale
export const MAP_W = 1672
export const MAP_H = 941
export const MAP_ASPECT = MAP_W / MAP_H

export type BlockKey = 'personal' | 'business' | 'payments'
export type Role = 'slab' | BlockKey

/** ids written into the g-buffer alpha (0 = background) */
export const BLOCK_ID: Record<Role, number> = { slab: 1, personal: 2, business: 3, payments: 4 }

const v = (a: readonly number[], scale = 1) => new THREE.Vector3(a[0] * scale, a[1] * scale, a[2] * scale)

export const CAMERA = {
  position: v(SCENE_DATA.camera.position, UNIT),
  forward: v(SCENE_DATA.camera.forward).normalize(),
  up: v(SCENE_DATA.camera.up).normalize(),
  right: v(SCENE_DATA.camera.right).normalize(),
  /** vertical, degrees, for the render's aspect */
  vfov: SCENE_DATA.camera.vfovDeg,
}

/** rotation that makes a three.js camera (looking down -z) match the solved orientation */
export const CAMERA_QUATERNION = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(CAMERA.right, CAMERA.up, CAMERA.forward.clone().negate()),
)

const byRole = (role: Role) => {
  const o = SCENE_DATA.objects.find((x) => x.role === role)
  if (!o) throw new Error(`scene: missing ${role}`)
  return o
}

const cube = byRole('slab')
export const SLAB = {
  top: cube.max[1] * UNIT,
  frontZ: cube.max[2] * UNIT,
  width: (cube.max[0] - cube.min[0]) * UNIT,
  x: ((cube.max[0] + cube.min[0]) / 2) * UNIT,
  bottom: cube.min[1] * UNIT,
}

export interface SceneBlock {
  key: BlockKey
  label: string
  /** centre x of the front face */
  x: number
  /** the front face's plane */
  frontZ: number
  /** top of the flat front (where the fillet starts) */
  frontTopY: number
  /** where the slab's front edge hides the front face, seen from the rest camera */
  visibleBottomY: number
  width: number
}

/** y on the plane z = frontZ where the ray from the camera through the slab's front-top edge lands */
function visibleBottom(x: number, frontZ: number) {
  const edge = new THREE.Vector3(x, SLAB.top, SLAB.frontZ)
  const dir = edge.clone().sub(CAMERA.position)
  const t = (frontZ - CAMERA.position.z) / dir.z
  return CAMERA.position.y + dir.y * t
}

export const BLOCKS: SceneBlock[] = (['personal', 'business', 'payments'] as const).map((key) => {
  const o = byRole(key)
  const f = o.front
  if (!f) throw new Error(`scene: ${key} has no front face`)
  const x = ((f.xMin + f.xMax) / 2) * UNIT
  const frontZ = f.zMax * UNIT
  const frontTopY = f.yMax * UNIT
  const width = (f.xMax - f.xMin) * UNIT
  return { key, label: key.toUpperCase(), x, frontZ, frontTopY, visibleBottomY: visibleBottom(x, frontZ), width }
})

/** what the eye lands on: the slab's centre, mid-height of the visible fronts, on the fronts' plane */
export const STRUCTURE_CENTER = new THREE.Vector3(
  SLAB.x,
  (SLAB.top + BLOCKS.reduce((a, b) => a + b.frontTopY, 0) / BLOCKS.length) / 2,
  BLOCKS.reduce((a, b) => a + b.frontZ, 0) / BLOCKS.length,
)
export const STRUCTURE_WIDTH = SLAB.width

/** the plane the Depth × control scales about: the middle block's front */
export const PIVOT_Z = BLOCKS[1].frontZ

/**
 * The plate's Depth × moves every point along its ray from the rest camera,
 * about the pivot plane; HTML pinned to the structure has to move the same
 * way to stay on its face.
 */
export function scaleAlongRay(p: THREE.Vector3, depthScale: number, out = new THREE.Vector3()) {
  const dir = new THREE.Vector3().subVectors(p, CAMERA.position)
  const t = dir.length()
  dir.multiplyScalar(1 / Math.max(t, 1e-4))
  const tFront = (PIVOT_Z - CAMERA.position.z) / Math.min(dir.z, -1e-4)
  return out.copy(CAMERA.position).addScaledVector(dir, tFront + (t - tFront) * depthScale)
}

/** The rest camera's orbit frame: where it looks and how far off that point it sits. */
export const REST_ORBIT = (() => {
  const distance = STRUCTURE_CENTER.clone().sub(CAMERA.position).dot(CAMERA.forward)
  const target = CAMERA.position.clone().addScaledVector(CAMERA.forward, distance)
  return { target, offset: CAMERA.position.clone().sub(target), distance }
})()

const _UP = new THREE.Vector3(0, 1, 0)

/**
 * The camera yawed/pitched off the rest view by the given degrees, framed so the
 * structure spans `widthFraction` of the frame. Rig and the PNG export both use
 * this, so a baked image is exactly the view you locked.
 */
export function viewCamera(
  yawDeg: number,
  pitchDeg: number,
  widthFraction: number,
  aspect: number,
  camera = new THREE.PerspectiveCamera(),
) {
  const qYaw = new THREE.Quaternion().setFromAxisAngle(_UP, THREE.MathUtils.degToRad(yawDeg))
  const right = CAMERA.right.clone().applyQuaternion(qYaw)
  const qPitch = new THREE.Quaternion().setFromAxisAngle(right, THREE.MathUtils.degToRad(-pitchDeg))
  const q = qPitch.clone().multiply(qYaw)
  camera.position.copy(REST_ORBIT.target).add(REST_ORBIT.offset.clone().applyQuaternion(q))
  camera.quaternion.copy(q).multiply(CAMERA_QUATERNION)
  const halfW = STRUCTURE_WIDTH / 2 / widthFraction / REST_ORBIT.distance
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfW / aspect))
  camera.aspect = aspect
  camera.near = 0.1
  camera.far = 200
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

/**
 * The camera the PLATE IMAGE was shot from. Defaults to the solved render
 * camera; when the plate is a bake of the boxes it becomes that bake's view,
 * so the depth pass, the ray origin and the plate's size all agree with the
 * image actually on screen. Mutated once per plate change, before the maps
 * are rebuilt.
 */
export const PLATE_CAM: { position: THREE.Vector3; quaternion: THREE.Quaternion; vfov: number } = {
  position: CAMERA.position.clone(),
  quaternion: CAMERA_QUATERNION.clone(),
  vfov: CAMERA.vfov,
}

export function setPlateCam(bake: { yaw: number; pitch: number; widthFraction: number } | null) {
  if (!bake) {
    PLATE_CAM.position.copy(CAMERA.position)
    PLATE_CAM.quaternion.copy(CAMERA_QUATERNION)
    PLATE_CAM.vfov = CAMERA.vfov
    return
  }
  const c = viewCamera(bake.yaw, bake.pitch, bake.widthFraction, MAP_ASPECT)
  PLATE_CAM.position.copy(c.position)
  PLATE_CAM.quaternion.copy(c.quaternion)
  PLATE_CAM.vfov = c.fov
}
