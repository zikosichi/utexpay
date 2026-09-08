/**
 * The block structure, calibrated against the reference render
 * (public/projection-blocks.png, 1672 x 941).
 *
 * Numbers come from a least-squares fit of a pinhole camera + box corners to
 * the render's front-top gold lines, silhouettes and vertical edges
 * (2 px RMS). The render is AI-generated and not a perfectly consistent
 * perspective — back corners recede slightly outward — so the fit favours
 * the front faces, which is where the eye lands.
 */
export type Vec3 = [number, number, number]

export const SLAB_TOP = 0.6
export const BLOCK_DEPTH = 3.2
export const BLOCK_RADIUS = 0.3
export const FRONT_Z = BLOCK_DEPTH / 2

/** Frozen camera the reference render was (approximately) shot from. */
export const PROJECTOR = {
  position: [-2.739, 5.399, 19.0] as Vec3,
  target: [-0.3, 2.861, 0] as Vec3,
  /** degrees, about the view axis */
  roll: -1.816,
  /** vertical, degrees */
  fov: 29,
  aspect: 1672 / 941,
}

export interface BlockSpec {
  key: 'personal' | 'business' | 'payments'
  label: string
  /** centre x */
  x: number
  width: number
  height: number
  /** recessed screen on the front face: size + bottom offset above the slab */
  panel: { w: number; h: number; y: number }
}

export const BLOCKS: BlockSpec[] = [
  {
    key: 'personal',
    label: 'PERSONAL',
    x: -5.188,
    width: 4.371,
    height: 2.692,
    panel: { w: 2.7, h: 1.85, y: 0.16 },
  },
  {
    key: 'business',
    label: 'BUSINESS',
    x: -0.761,
    width: 4.482,
    height: 3.409,
    panel: { w: 3.05, h: 2.45, y: 0.16 },
  },
  {
    key: 'payments',
    label: 'PAYMENTS',
    x: 4.397,
    width: 5.833,
    height: 3.938,
    panel: { w: 3.25, h: 2.9, y: 0.16 },
  },
]

export const SLAB = {
  x: 0.0375,
  width: 15.379,
  depth: 4.6,
  /** runs off the bottom of the frame like the render */
  thickness: 3.4,
  radius: 0.12,
}

/** Point the viewing camera orbits around. */
export const STRUCTURE_CENTER: Vec3 = [-0.3, 2.86, 0]
export const STRUCTURE_WIDTH = SLAB.width

/** Direction from the structure centre to the reference camera (unit-ish). */
export const VIEW_DIR: Vec3 = [
  PROJECTOR.position[0] - PROJECTOR.target[0],
  PROJECTOR.position[1] - PROJECTOR.target[1],
  PROJECTOR.position[2] - PROJECTOR.target[2],
]
