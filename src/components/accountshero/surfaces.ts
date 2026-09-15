import * as THREE from 'three'
import { createStructureGeometry as homeGeometry, createShelfPlane } from '../photostructure/geometry.ts'
import { anchorSurface, PANEL_SURFACES as HOME_SURFACES } from '../photostructure/surfaces.ts'
import type { SurfaceSpec } from '../photostructure/surfaces.ts'
import { raisePoint, createStructureGeometry, imagePoint } from './geometry.ts'
import { PANEL_VERSIONS } from './panelVersions.ts'
export const BLEED = 8
/** Shared dimensions in the sculpture's physical coordinates. */
export const PANEL_LAYOUT = { width: 4, bottomInset: .28, titleGap: .3 }
export const PANEL_SURFACES = {
  'personal-title': HOME_SURFACES['personal-title'],
  personal: { width: 720, height: 392, source: [[169, 575], [577, 551], [577, 710], [169, 735]], offset: .025 },
  'business-title': HOME_SURFACES['business-title'],
  business: { width: 720, height: 508, source: [[674, 485], [1062, 462], [1062, 674], [674, 698]], offset: .025 },
  'payments-title': HOME_SURFACES['payments-title'],
  payments: { width: 720, height: 588, source: [[1153, 421], [1555, 397], [1555, 621], [1153, 646]], offset: .025 },
} satisfies Record<string, SurfaceSpec>
export type PanelName = keyof typeof PANEL_SURFACES
export const PANEL_NAMES = Object.keys(PANEL_SURFACES) as PanelName[]
export const panelImage = (name: PanelName) => name.endsWith('-title')
  ? `/photostructure/panels/${name}.webp`
  : `/accountshero/panels/${name}.webp?v=${PANEL_VERSIONS[name as keyof typeof PANEL_VERSIONS]}`

// The straight front crown edges from the home-page mesh calibration. Each
// face has its own small rotation; the common shelf is not their horizontal.
const FRONT_EDGES = [
  { left: [139, 513], right: [629, 484], z: .68 },
  { left: [653, 417], right: [1108, 391], z: .735 },
  { left: [1137, 343], right: [1587, 318], z: .79 },
] satisfies { left: [number, number]; right: [number, number]; z: number }[]

/** Place each panel at one uniform scale, rotated into its box's own frame. */
export function createPanelGeometries(projector: THREE.OrthographicCamera) {
  const base = homeGeometry(projector), shelf = createShelfPlane(projector)
  const meshes = base.map((g) => new THREE.Mesh(g, new THREE.MeshBasicMaterial()))
  const extended = createStructureGeometry(projector).map((g) => new THREE.Mesh(g, new THREE.MeshBasicMaterial()))
  const frames = FRONT_EDGES.map((edge, index) => {
    const right = imagePoint(edge.right, edge.z, projector).sub(imagePoint(edge.left, edge.z, projector)).normalize()
    const up = new THREE.Vector3(-right.y, right.x, 0).normalize()
    const name = (['personal', 'business', 'payments'] as const)[index]
    const centerX = anchorSurface(meshes[index], projector, { ...PANEL_SURFACES[name], offset: 0 })
      .reduce((sum, point) => sum + point.x, 0) / 4
    const angle = Math.atan2(edge.right[1] - edge.left[1], edge.right[0] - edge.left[0])
    return { right, up, centerX, angle }
  })
  const raycaster = new THREE.Raycaster()
  const direction = new THREE.Vector3(0, 0, -1)
  const result = PANEL_NAMES.map((name) => {
    const index = name.startsWith('personal') ? 0 : name.startsWith('business') ? 1 : 2
    const spec = PANEL_SURFACES[name]
    const frame = { ...frames[index], right: frames[index].right.clone(), up: frames[index].up.clone() }
    const isTitle = name.endsWith('-title')
    const width = isTitle ? 3.12 : PANEL_LAYOUT.width
    const scale = width / spec.width, height = spec.height * scale
    const center = new THREE.Vector3(frame.centerX, 0, 0)
    if (isTitle) {
      const original = anchorSurface(meshes[index], projector, { ...spec, offset: 0 })
      center.y = original.reduce((sum, point) => sum + raisePoint(point, shelf).y, 0) / 4
    } else {
      // Keep the bottom midpoint on the shared inset while rotating the panel
      // to its face. Height follows the panel aspect ratio, never a free stretch.
      const bottomX = center.x - frame.up.x * height / 2
      center.y = (PANEL_LAYOUT.bottomInset - shelf.constant - shelf.normal.x * bottomX) / shelf.normal.y + frame.up.y * height / 2
    }
    // The source's tiny face-depth corrections also affect the apparent roll.
    // Match the actual projected crown edge while keeping the two UI axes
    // perpendicular and identically scaled.
    const onFace = (point: THREE.Vector3) => {
      raycaster.set(new THREE.Vector3(point.x, point.y, 10), direction)
      const hit = raycaster.intersectObject(extended[index])[0]
      if (!hit) throw new Error(`${name} missed its bronze face`)
      return hit.point
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const a = onFace(center).project(projector)
      const b = onFace(center.clone().addScaledVector(frame.right, .5)).project(projector)
      const angle = Math.atan2((a.y-b.y)*941, (b.x-a.x)*1672)
      frame.right.applyAxisAngle(new THREE.Vector3(0,0,1), angle-frame.angle)
      frame.up.set(-frame.right.y, frame.right.x, 0)
      if (!isTitle) {
        const bottomX = center.x - frame.up.x * height / 2
        center.y = (PANEL_LAYOUT.bottomInset - shelf.constant - shelf.normal.x * bottomX) / shelf.normal.y + frame.up.y * height / 2
      }
    }
    const at = (x: number, y: number) => center.clone().addScaledVector(frame.right, x).addScaledVector(frame.up, y)
    const corners = [at(-width/2, height/2), at(width/2, height/2), at(width/2, -height/2), at(-width/2, -height/2)]
    const columns = 28, rows = 24, positions: number[] = [], uvs: number[] = [], indices: number[] = []
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= columns; i++) {
        const u = i / columns, v = j / rows
        const point = at((-spec.width/2 - BLEED + u * (spec.width + 2*BLEED)) * scale, (spec.height/2 + BLEED - v * (spec.height + 2*BLEED)) * scale)
        raycaster.set(new THREE.Vector3(point.x, point.y, 10), direction)
        const hit = raycaster.intersectObject(extended[index])[0]
        if (!hit?.face || hit.face.normal.z < .8) throw new Error(`${name} leaves its bronze face`)
        // Only depth conforms to the photographed surface. The uniform x/y
        // frame keeps circles circular and text undistorted in the face plane.
        point.z = hit.point.z + spec.offset
        positions.push(...point.toArray()); uvs.push(u, 1-v)
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const a = j*(columns+1)+i, b = a+1, c = a+columns+1, d = c+1
      indices.push(a,c,b,b,c,d)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.userData.fallbacks = 0
    geometry.userData.corners = corners.map((point) => { point.z = onFace(point).z + spec.offset; return point.toArray() })
    geometry.userData.frame = { right: frame.right.toArray(), up: frame.up.toArray(), scale }
    return { name, geometry }
  })
  meshes.concat(extended).forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose() })
  return result
}
