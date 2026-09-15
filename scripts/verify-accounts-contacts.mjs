// Node 22+: node --experimental-strip-types scripts/verify-accounts-contacts.mjs
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createProjector, createStructureGeometry, PLATE, HEIGHT_ADDED } from '../src/components/accountshero/geometry.ts'

import { createStructureGeometry as homeGeometry, createShelfPlane } from '../src/components/photostructure/geometry.ts'
import { createPanelGeometries, PANEL_SURFACES, BLEED } from '../src/components/accountshero/surfaces.ts'

const projector = createProjector()
const geometries = createStructureGeometry(projector)
const originals = homeGeometry(projector)
const shelfPlane = createShelfPlane(projector)
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
const foundation = new THREE.Mesh(geometries[3], material)
foundation.updateMatrixWorld()
const raycaster = new THREE.Raycaster()
const feet = [[[114, 747], [629, 715]], [[628, 715], [1108, 684]], [[1107, 684], [1601, 650]]]
let maxContactError = 0, contacts = 0, crowns = 0
const pairs = []

for (const [index, geometry] of geometries.entries()) {
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
  const original = originals[index].getAttribute('position')
  assert.deepEqual(geometry.getAttribute('uv').array, originals[index].getAttribute('uv').array, 'Original photographic texture coordinates changed')
  assert.deepEqual(geometry.getAttribute('fallbackUv').array, originals[index].getAttribute('fallbackUv').array)
  const visited = new Set()
  for (let i = 0; i < position.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, i)
    const projected = point.clone().project(projector)
    const before = new THREE.Vector3().fromBufferAttribute(original, i)
    assert.equal(point.x, before.x, 'Block width changed')
    assert.equal(point.z, before.z, 'Block depth changed')
    if (index === 3) { assert.equal(point.y, before.y, 'Foundation changed'); continue }
    const lift = point.y - before.y
    assert.ok(lift >= -.00001 && lift <= HEIGHT_ADDED + .00001, 'Unexpected wall height')
    if (shelfPlane.distanceToPoint(before) >= 1.65) {
      assert.ok(Math.abs(lift - HEIGHT_ADDED) < .00001, 'Crown or bevel did not move rigidly')
      crowns++
    }
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
assert.ok(crowns > 100)
const panels = createPanelGeometries(projector)
for (const panel of panels) {
  assert.equal(panel.geometry.userData.fallbacks, 0, `${panel.name}: screen extends off its bronze face`)
  assert.ok(panel.geometry.getAttribute('position').array.every(Number.isFinite))
  const position = panel.geometry.getAttribute('position'), spec = PANEL_SURFACES[panel.name]
  const at = (i,j) => new THREE.Vector2(position.getX(j*29+i), position.getY(j*29+i))
  for (const j of [6,12,18]) for (const i of [7,14,21]) {
    const origin = at(i,j)
    const x = at(i+1,j).sub(origin).multiplyScalar(28/(spec.width+2*BLEED))
    const y = at(i,j+1).sub(origin).multiplyScalar(24/(spec.height+2*BLEED))
    assert.ok(Math.abs(x.length()/y.length()-1)<.0001, `${panel.name}: nonuniform scaling squeezes the artwork`)
    assert.ok(Math.abs(x.normalize().dot(y.normalize()))<.0001, `${panel.name}: UI axes are skewed`)
  }
  const faceIndex = panel.name.startsWith('personal') ? 0 : panel.name.startsWith('business') ? 1 : 2
  const [rise, run] = [[-29,490],[-26,455],[-25,450]][faceIndex]
  const a = new THREE.Vector3().fromBufferAttribute(position,12*29+14).project(projector)
  const b = new THREE.Vector3().fromBufferAttribute(position,12*29+15).project(projector)
  const angle = Math.atan2((a.y-b.y)*PLATE.height,(b.x-a.x)*PLATE.width)
  assert.ok(Math.abs(angle-Math.atan2(rise,run))<.001, `${panel.name}: rotation does not follow its box's front edge`)
  panel.geometry.dispose()
}

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
geometries.concat(originals).forEach((geometry) => geometry.dispose())
material.dispose()
console.log(`Accounts hero contacts: ${contacts} bottom-edge samples across ${views} views; maximum gap ${maxContactError.toExponential(2)} units; ${crowns} crown vertices retain their shape; original width, depth, UVs and foundation unchanged; all 6 screen/title grids stay on their faces with uniform scale, perpendicular UI axes and correct front-edge rotation.`)
