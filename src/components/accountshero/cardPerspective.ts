import * as THREE from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { CARD_PERSPECTIVE_LIMIT, DEFAULT_OPTIONS } from './config.ts'

/** A subtle taper for this orthographic composition; the resting edge stays fixed. */
export function taperCardPoint(point: THREE.Vector3, amount = DEFAULT_OPTIONS.cardPerspective) {
  const height = THREE.MathUtils.clamp((point.y + 1.25) / 2.5, 0, 1)
  point.x *= 1 - amount * height
  return point
}

export function taperAccountCard(card: THREE.Group, body: THREE.Mesh) {
  // Small triangles keep the printed artwork smooth across the tapered face.
  const original = body.geometry
  body.geometry = new TessellateModifier(.2, 8).modify(original)
  original.dispose()
  body.geometry.clearGroups()
  const normals = body.geometry.getAttribute('normal')
  let start = 0, previous = -1
  for (let i = 0; i < normals.count; i += 3) {
    const z = normals.getZ(i), material = z > .9999 ? 0 : z < -.9999 ? 1 : 2
    if (material === previous) continue
    if (i > start) body.geometry.addGroup(start, i - start, previous)
    start = i; previous = material
  }
  body.geometry.addGroup(start, normals.count - start, previous)

  card.updateMatrixWorld(true)
  const inverseCard = card.matrixWorld.clone().invert()
  const point = new THREE.Vector3()
  const meshes: { geometry: THREE.BufferGeometry; original: THREE.BufferAttribute | THREE.InterleavedBufferAttribute; toCard: THREE.Matrix4; fromCard: THREE.Matrix4 }[] = []
  card.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    const toCard = inverseCard.clone().multiply(node.matrixWorld), fromCard = toCard.clone().invert()
    meshes.push({ geometry: node.geometry, original: node.geometry.getAttribute('position').clone(), toCard, fromCard })
  })
  function setPerspective(value: number) {
    const amount = THREE.MathUtils.clamp(Number.isFinite(value) ? value : DEFAULT_OPTIONS.cardPerspective, 0, CARD_PERSPECTIVE_LIMIT)
    // Always start from the original vertices so dragging never compounds the taper.
    for (const { geometry, original, toCard, fromCard } of meshes) {
      const positions = geometry.getAttribute('position')
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(original, i).applyMatrix4(toCard)
        taperCardPoint(point, amount).applyMatrix4(fromCard)
        positions.setXYZ(i, point.x, point.y, point.z)
      }
      positions.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
    }
    return amount
  }
  setPerspective(DEFAULT_OPTIONS.cardPerspective)
  return setPerspective
}
