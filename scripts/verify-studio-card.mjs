// Run with a Node version supporting type stripping: node scripts/verify-studio-card.mjs
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { cardSolid, seatOnPedestal } from '../src/components/herostudio/details.ts'

const geometry = cardSolid(1.58, 2.5, .027, .087)
const covered = new Uint8Array(geometry.getAttribute('position').count)
for (const group of geometry.groups) {
  for (let i = group.start; i < group.start + group.count; i++) covered[i]++
}
assert(covered.every((count) => count === 1), 'A card triangle must never be drawn twice')
geometry.computeBoundingBox()
assert(Math.abs(geometry.boundingBox.max.z - .0135) < 1e-6)
assert(Math.abs(geometry.boundingBox.min.z + .0135) < 1e-6)

const materials = [0, 1, 2].map(() => new THREE.MeshBasicMaterial())
const card = new THREE.Mesh(geometry, materials)
card.rotation.set(-.14, -.24, 0, 'YXZ')
card.updateMatrixWorld(true)
let angles = 0
for (let yaw = -30; yaw <= 30; yaw += 5) {
  for (let pitch = 4; pitch <= 24; pitch += 5) {
    const target = new THREE.Vector3(.127, -.193, 0).applyMatrix4(card.matrixWorld)
    const origin = new THREE.Vector3(Math.sin(yaw * Math.PI / 180) * 40, Math.sin(pitch * Math.PI / 180) * 40, 40)
    const ray = new THREE.Raycaster(origin, target.sub(origin).normalize())
    assert.equal(ray.intersectObject(card).length, 1, `Overlapping card surface at ${yaw}°, ${pitch}°`)
    angles++
  }
}
// Measure the actual metal vertices, independent of the placement algorithm.
// The former rotated bounding-box approximation left a visible gap here.
for (const rotation of [[-.14, -.24, 0, 'YXZ'], [-.16, -.28, -.115, 'XYZ'], [-.2, .45, .12, 'XYZ']]) {
  card.rotation.set(...rotation)
  card.position.set(2.08, 0, 1.04)
  seatOnPedestal(card, .79)
  const vertex = new THREE.Vector3(), position = geometry.getAttribute('position')
  let lowest = Infinity, rear = Infinity
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).applyMatrix4(card.matrixWorld)
    lowest = Math.min(lowest, vertex.y)
    rear = Math.min(rear, vertex.z)
    if (rotation[3] === 'YXZ' && vertex.y < .035) {
      assert(vertex.z < 1.75, 'The resting bottom edge must stay inside the flat shelf, behind the rounded lip')
    }
  }
  assert(Math.abs(lowest - .002) < 1e-6, 'Card must rest on the shelf without floating or penetrating it')
  assert(rear >= .88 - 1e-6, 'The entire tilted card must clear the furthest block front')
}
geometry.dispose()
materials.forEach((material) => material.dispose())
console.log(`Studio card: ${angles} camera angles; one visible surface; correct thickness; 3 contact/clearance poses; lower edge supported by the flat shelf.`)
