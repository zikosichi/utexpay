import * as THREE from 'three'
import { createStructureGeometry as homeGeometry, createShelfPlane } from '../photostructure/geometry.ts'
export { createProjector, createShelfPlane, imagePoint, PLATE } from '../photostructure/geometry.ts'

/** Extend the existing straight walls; keep every crown, bevel and UV intact. */
export const HEIGHT_ADDED = .825
export function raisePoint(point: THREE.Vector3, shelf: THREE.Plane) {
  const height = shelf.distanceToPoint(point)
  // The lowest crown starts above 1.8 units. Its rounded shape translates
  // rigidly; only the straight lower wall acquires additional height.
  point.y += HEIGHT_ADDED * THREE.MathUtils.clamp(height / 1.65, 0, 1)
  return point
}

export function createStructureGeometry(projector: THREE.OrthographicCamera) {
  const shelf = createShelfPlane(projector)
  return homeGeometry(projector).map((geometry) => {
    if (geometry.name === 'Foundation') return geometry
    const position = geometry.getAttribute('position')
    const point = new THREE.Vector3()
    for (let i = 0; i < position.count; i++) {
      raisePoint(point.fromBufferAttribute(position, i), shelf)
      position.setXYZ(i, point.x, point.y, point.z)
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    return geometry
  })
}
