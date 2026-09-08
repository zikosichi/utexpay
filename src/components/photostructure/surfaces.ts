import * as THREE from 'three'
import { PLATE } from './geometry.ts'
import type { PersonalVariant } from './personalVariants'

export type Pixel = [number, number]
export type Quad = [Pixel, Pixel, Pixel, Pixel]
/**
 * A rectangle of CSS pixels calibrated to a quad on the photograph (top-left,
 * top-right, bottom-right, bottom-left), floated `offset` units off the bronze.
 * The rectangle is the size the panel is authored and baked at.
 */
export interface SurfaceSpec { width: number; height: number; source: Quad; offset: number }

export const PERSONAL_SURFACES = {
  title: { width: 640, height: 60, source: [[218, 527], [523, 509], [523, 535], [218, 553]], offset: .008 },
  panel: { width: 720, height: 350, source: [[193, 565], [553, 544], [553, 715], [193, 737]], offset: .022 },
  inlays: { width: 720, height: 275, source: [[158, 570], [562, 546], [562, 699], [158, 724]], offset: .022 },
} satisfies Record<string, SurfaceSpec>
export const BUSINESS_SURFACES = {
  title: { width: 640, height: 60, source: [[712, 433], [1017, 415], [1017, 441], [712, 459]], offset: .008 },
  panel: { width: 720, height: 400, source: [[674, 469], [1062, 446], [1062, 660], [674, 685]], offset: .022 },
} satisfies Record<string, SurfaceSpec>
export const PAYMENTS_SURFACES = {
  title: { width: 640, height: 60, source: [[1203, 358], [1508, 340], [1508, 366], [1203, 384]], offset: .008 },
  panel: { width: 720, height: 466, source: [[1153, 398], [1555, 374], [1555, 632], [1153, 658]], offset: .022 },
} satisfies Record<string, SurfaceSpec>

/** Every baked panel image, keyed by its file name under `public/photostructure/panels/`. */
export const PANEL_SURFACES = {
  'personal-title': PERSONAL_SURFACES.title,
  'personal-figure': PERSONAL_SURFACES.panel,
  'personal-split': PERSONAL_SURFACES.panel,
  'personal-tiles': PERSONAL_SURFACES.inlays,
  'personal-activity': PERSONAL_SURFACES.panel,
  'personal-engraved': PERSONAL_SURFACES.panel,
  'personal-classic': PERSONAL_SURFACES.panel,
  'business-title': BUSINESS_SURFACES.title,
  'business-panel': BUSINESS_SURFACES.panel,
  'payments-title': PAYMENTS_SURFACES.title,
  'payments-panel': PAYMENTS_SURFACES.panel,
} satisfies Record<string, SurfaceSpec>
export type PanelName = keyof typeof PANEL_SURFACES
export const PANEL_NAMES = Object.keys(PANEL_SURFACES) as PanelName[]
/** Bakes extend past the rectangle by this many CSS pixels on every side, so bezels and drop shadows are not clipped. */
export const BLEED = 8
export const panelImage = (name: PanelName) => `/photostructure/panels/${name}.webp`
export const personalPanel = (variant: PersonalVariant): PanelName => `personal-${variant}`

/** The homography taking a `width × height` rectangle onto `quad`, as the 16 entries of a CSS `matrix3d`. */
export function surfaceMatrix(quad: Quad, width: number, height: number) {
  const [a, b, c, d] = quad
  const dx1 = b[0] - c[0], dx2 = d[0] - c[0], dx3 = a[0] - b[0] + c[0] - d[0]
  const dy1 = b[1] - c[1], dy2 = d[1] - c[1], dy3 = a[1] - b[1] + c[1] - d[1]
  const determinant = dx1 * dy2 - dx2 * dy1
  if (Math.abs(determinant) < 1e-8) return null
  const g = (dx3 * dy2 - dx2 * dy3) / determinant
  const h = (dx1 * dy3 - dx3 * dy1) / determinant
  return [
    (b[0] - a[0] + g * b[0]) / width, (b[1] - a[1] + g * b[1]) / width, 0, g / width,
    (d[0] - a[0] + h * d[0]) / height, (d[1] - a[1] + h * d[1]) / height, 0, h / height,
    0, 0, 1, 0,
    a[0], a[1], 0, 1,
  ]
}

/** Where a point of the rectangle lands under `surfaceMatrix` (column-major homogeneous, like CSS). */
export function mapPoint(matrix: number[], x: number, y: number): Pixel {
  const w = matrix[3] * x + matrix[7] * y + matrix[15]
  return [(matrix[0] * x + matrix[4] * y + matrix[12]) / w, (matrix[1] * x + matrix[5] * y + matrix[13]) / w]
}

function aim(raycaster: THREE.Raycaster, projector: THREE.OrthographicCamera, [x, y]: Pixel) {
  raycaster.setFromCamera(new THREE.Vector2(x / PLATE.width * 2 - 1, 1 - y / PLATE.height * 2), projector)
}

/** The four calibrated corners on the real bronze surface, including the shelf correction. */
export function anchorSurface(mesh: THREE.Mesh, projector: THREE.OrthographicCamera, spec: SurfaceSpec) {
  mesh.updateWorldMatrix(true, false)
  const raycaster = new THREE.Raycaster()
  return spec.source.map((pixel) => {
    aim(raycaster, projector, pixel)
    const hit = raycaster.intersectObject(mesh)[0]
    if (!hit?.face) throw new Error('Surface anchor missed the bronze block')
    const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld)
    return hit.point.clone().addScaledVector(normal, spec.offset)
  })
}

export interface SurfaceGrid { positions: Float32Array; uvs: Float32Array; indices: number[]; columns: number; rows: number; fallbacks: number }

/**
 * Sample the bled rectangle on a grid. Each sample is cast from the projector
 * through the pixel the rectangle's homography assigns it, so the grid hugs the
 * calibrated bronze — shelf correction included — exactly where the DOM surface
 * used to register. A sample whose ray leaves the face (bleed past an edge)
 * falls back to the plane through the four calibrated corners.
 */
export function surfaceGrid(mesh: THREE.Mesh, projector: THREE.OrthographicCamera, spec: SurfaceSpec, columns = 12, rows = 6, bleed = BLEED): SurfaceGrid {
  const matrix = surfaceMatrix(spec.source, spec.width, spec.height)
  if (!matrix) throw new Error('Degenerate surface quad')
  const corners = anchorSurface(mesh, projector, spec)
  const plane = new THREE.Plane().setFromCoplanarPoints(corners[0], corners[1], corners[3])
  // Image-space corners wind away from the projector. Face the reference
  // normal toward it so outward bronze normals pass the face test below.
  // Otherwise every sample falls back to a plane that cuts through the bronze.
  if (plane.normal.dot(projector.getWorldDirection(new THREE.Vector3())) > 0) plane.negate()
  const raycaster = new THREE.Raycaster()
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  let fallbacks = 0
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const u = i / columns, v = j / rows
      aim(raycaster, projector, mapPoint(matrix, -bleed + u * (spec.width + 2 * bleed), -bleed + v * (spec.height + 2 * bleed)))
      const hit = raycaster.intersectObject(mesh)[0]
      const normal = hit?.face?.normal.clone().transformDirection(mesh.matrixWorld)
      let point: THREE.Vector3 | null
      // Only the face the corners sit on counts; a ray that slips onto the crown
      // or the foundation would fold the decal over the edge.
      if (hit && normal && normal.dot(plane.normal) > .8) point = hit.point.clone().addScaledVector(normal, spec.offset)
      else { point = raycaster.ray.intersectPlane(plane, new THREE.Vector3()); fallbacks++ }
      if (!point) throw new Error('Surface sample missed the bronze block')
      positions.push(point.x, point.y, point.z)
      uvs.push(u, 1 - v)
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices, columns, rows, fallbacks }
}
