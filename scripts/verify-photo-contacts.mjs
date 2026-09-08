// Node 22+: node --experimental-strip-types scripts/verify-photo-contacts.mjs
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createProjector, createStructureGeometry, PLATE } from '../src/components/photostructure/geometry.ts'

const projector = createProjector()
const geometries = createStructureGeometry(projector)
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
const foundation = new THREE.Mesh(geometries[3], material)
foundation.updateMatrixWorld()
const raycaster = new THREE.Raycaster()
const feet = [[[114, 747], [629, 715]], [[628, 715], [1108, 684]], [[1107, 684], [1601, 650]]]
let maxProjectionError = 0, maxContactError = 0, contacts = 0
const pairs = []

for (const [index, geometry] of geometries.entries()) {
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
  const visited = new Set()
  for (let i = 0; i < position.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, i)
    const projected = point.clone().project(projector)
    maxProjectionError = Math.max(maxProjectionError, Math.hypot(((projected.x + 1) / 2 - uv.getX(i)) * PLATE.width, ((projected.y + 1) / 2 - uv.getY(i)) * PLATE.height))
    if (index === 3) continue
    const px = uv.getX(i) * PLATE.width, py = (1 - uv.getY(i)) * PLATE.height
    const [a, b] = feet[index]
    const t = (px - a[0]) / (b[0] - a[0])
    if (t < -.00001 || t > 1.00001 || Math.abs(py - (a[1] + t * (b[1] - a[1]))) > .001) continue
    const key = `${px.toFixed(3)},${py.toFixed(3)}`
    if (visited.has(key)) continue
    visited.add(key)
    // Independently raycast the actual foundation triangles at each bottom
    // vertex's source pixel. Sharing a helper plane alone cannot pass this.
    raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), projector)
    const hit = raycaster.intersectObject(foundation)[0]
    assert.ok(hit, `No shelf beneath ${geometry.name} at ${key}`)
    const gap = point.distanceTo(hit.point)
    assert.ok(gap < .00001, `${geometry.name} floats above its reflection by ${gap} units`)
    maxContactError = Math.max(maxContactError, gap)
    pairs.push([point, hit.point])
    contacts++
  }
  if (index < 3) assert.ok(visited.size >= 24, `Missing bottom edge samples for ${geometry.name}`)
}
assert.ok(maxProjectionError < .001, `Reference photo shifted by ${maxProjectionError}px`)

// Check that source-image contact pairs remain coincident across the complete
// configurable camera envelope, including vertical motion at the 9° setting.
let views = 0
for (const yaw of [-21, -16.5, -12, -7.5, -3]) {
  for (const pitch of [12.76, 16, 19.24]) {
    const view = projector.clone()
    const azimuth = THREE.MathUtils.degToRad(yaw), elevation = THREE.MathUtils.degToRad(pitch)
    view.position.set(Math.sin(azimuth) * Math.cos(elevation) * 40, Math.sin(elevation) * 40, Math.cos(azimuth) * Math.cos(elevation) * 40)
    view.lookAt(0, 0, 0); view.updateMatrixWorld()
    for (const [block, shelf] of pairs) {
      const a = block.clone().project(view), b = shelf.clone().project(view)
      assert.ok(Math.hypot((a.x - b.x) * 2004 / 2, (a.y - b.y) * 1128 / 2) < .001, 'A reflection root separates while rotating')
    }
    views++
  }
}
geometries.forEach((geometry) => geometry.dispose())
material.dispose()
console.log(`Photo contacts: ${contacts} bottom-edge samples across ${views} views; maximum gap ${maxContactError.toExponential(2)} units; projection error ${maxProjectionError.toFixed(6)}px.`)
