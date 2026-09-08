import * as THREE from 'three'

import type { BoxKey } from './config'

/**
 * A box, stated the way you'd describe a real one:
 *   x = centre along the row, y = the face it SITS on, z = its FRONT plane,
 *   w/h/d = its size. All in the hero's units (the slab is 15.379 wide).
 * So it spans x ± w/2, y … y + h, z − d … z.
 */
export interface BoxDims {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
}

/**
 * The friend's mesh rectified into real boxes: axis-aligned, the three blocks
 * resting on the slab's top face, their seams abutting exactly, and a shared
 * back plane. Derived from the original scene, then squared up — the original
 * was modelled to chase a render that isn't a physically consistent solid.
 */
export const DEFAULT_DIMS: Record<BoxKey, BoxDims> = {
  // measured in Blender against the reference, by Zviad
  slab: { x: 0.22, y: -3.94, z: 1.395, w: 15, h: 2.34, d: 3 },
  personal: { x: -4.6, y: -2.375, z: 0, w: 5, h: 3.07, d: 2.015 },
  business: { x: -0.095, y: -1.965, z: 0.25, w: 5, h: 3.475, d: 2.5 },
  payments: { x: 4.34, y: -1.89, z: 0.515, w: 5, h: 4.11, d: 2.885 },
}

const EPS = 0.00001

/**
 * The box as the design actually has it: the FRONT FACE is a rectangle with only
 * its top-left and top-right corners rounded — every other edge is sharp. Built
 * as that profile extruded straight back, so the top, sides and bottom meet the
 * front at hard edges and the radius shows only on those two corners.
 */
export function topRoundedBoxGeometry(w: number, h: number, d: number, radius0: number, smoothness = 6) {
  const r = Math.max(Math.min(radius0, Math.min(w / 2, h) - EPS), 0)
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const shape = new THREE.Shape()
  shape.moveTo(x0, y0)
  shape.lineTo(x1, y0)
  if (r > EPS) {
    shape.lineTo(x1, y1 - r)
    shape.quadraticCurveTo(x1, y1, x1 - r, y1)
    shape.lineTo(x0 + r, y1)
    shape.quadraticCurveTo(x0, y1, x0, y1 - r)
  } else {
    shape.lineTo(x1, y1)
    shape.lineTo(x0, y1)
  }
  shape.lineTo(x0, y0)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: false,
    steps: 1,
    curveSegments: smoothness,
  })
  // ExtrudeGeometry builds along +z from the profile plane; centre it
  geo.translate(0, 0, -d / 2)
  geo.computeVertexNormals()
  return geo
}

/** World matrix that puts a centred box where its dims say it goes. */
export function boxMatrix(b: BoxDims) {
  return new THREE.Matrix4().makeTranslation(b.x, b.y + b.h / 2, b.z - b.d / 2)
}
