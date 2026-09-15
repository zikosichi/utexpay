// Run with Node type stripping: node --experimental-strip-types scripts/verify-account-card.mjs
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createProjector, createShelfPlane, createStructureGeometry } from '../src/components/accountshero/geometry.ts'
import { cardSolid } from '../src/components/herostudio/details.ts'
import { seatAccountCard } from '../src/components/accountshero/cardPlacement.ts'
import { taperAccountCard } from '../src/components/accountshero/cardPerspective.ts'
import { CARD_PERSPECTIVE_LIMIT, DEFAULT_OPTIONS } from '../src/components/accountshero/config.ts'

const projector = createProjector(), shelf = createShelfPlane(projector)
const blocks = createStructureGeometry(projector).map((geometry) => new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})))
const foundation = blocks.find((block) => block.geometry.name === 'Foundation')
const core = new THREE.Mesh(cardSolid(1.58,2.5,.027,.087),new THREE.MeshBasicMaterial())
const card = new THREE.Group(); card.add(core)
const setPerspective = taperAccountCard(card,core)
const geometry = core.geometry, baseline = geometry.getAttribute('position').array.slice()
for (const amount of [CARD_PERSPECTIVE_LIMIT, 0, .16, DEFAULT_OPTIONS.cardPerspective]) {
  setPerspective(amount)
  seatAccountCard(card,core,shelf,blocks,-12.5,amount)
}
assert.equal(core.geometry,geometry,'Dragging must reuse the prepared geometry')
assert.deepEqual(geometry.getAttribute('position').array,baseline,'Returning to the default must restore the exact original taper without cumulative distortion')
const outline = seatAccountCard(card,core,shelf,blocks)
assert(outline.every((point) => point.toArray().every(Number.isFinite)))
const vertex = new THREE.Vector3(), positions = core.geometry.getAttribute('position')
const ray = new THREE.Raycaster(), direction = shelf.normal.clone().negate()
let lowest = Infinity, rear = Infinity, supported = 0
for (let i = 0; i < positions.count; i++) {
  vertex.fromBufferAttribute(positions,i).applyMatrix4(core.matrixWorld)
  const height = shelf.distanceToPoint(vertex)
  lowest = Math.min(lowest,height); rear = Math.min(rear,vertex.z)
  if (height > .025) continue
  ray.set(vertex.clone().addScaledVector(shelf.normal,.1),direction)
  const hit = ray.intersectObject(foundation)[0]
  assert(hit && Math.abs(shelf.distanceToPoint(hit.point)) < .015,'Every resting vertex must have real flat shelf beneath it')
  supported++
}
const wallFront = Math.max(...blocks.filter((block) => block !== foundation).map((block) => new THREE.Box3().setFromObject(block).max.z))
assert(Math.abs(lowest-.003) < 1e-6,'Card must meet the shelf without floating or sinking')
assert(rear-wallFront >= .03-1e-6,'Card must not intersect a block')
assert(supported > 20,'The whole lower edge needs support, not just one corner')
const left = new THREE.Vector3(-.7,-1.25,0).applyMatrix4(core.matrixWorld)
const right = new THREE.Vector3(.7,-1.25,0).applyMatrix4(core.matrixWorld)
assert(Math.abs(shelf.distanceToPoint(left)-shelf.distanceToPoint(right)) < 1e-6,'Lower edge must follow the slope of the shelf')
console.log(`Card: ${supported} supported lower-edge vertices; 0.003-unit shelf clearance; ${(rear-wallFront).toFixed(3)}-unit wall clearance; lower edge level with the real shelf.`)
for (const amount of [0, CARD_PERSPECTIVE_LIMIT]) {
  setPerspective(amount)
  for (const yaw of [-40, DEFAULT_OPTIONS.cardYaw, 40]) {
    const silhouette = seatAccountCard(card,core,shelf,blocks,yaw,amount)
    assert(silhouette.every((point) => point.toArray().every(Number.isFinite)))
    let minimum = Infinity, back = Infinity
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions,i).applyMatrix4(core.matrixWorld)
      const height = shelf.distanceToPoint(vertex)
      minimum = Math.min(minimum,height); back = Math.min(back,vertex.z)
      if (height > .025) continue
      ray.set(vertex.clone().addScaledVector(shelf.normal,.1),direction)
      const hit = ray.intersectObject(foundation)[0]
      assert(hit && Math.abs(shelf.distanceToPoint(hit.point)) < .015,'Taper extremes must keep every resting vertex on the shelf')
    }
    assert(Math.abs(minimum-.003) < 1e-6,'Taper extremes must keep the card seated')
    assert(back-wallFront >= .03-1e-6,'Taper extremes must not intersect a block')
  }
}
console.log('Perspective: repeatable updates; supported at 0% and 25% across the full rotation range.')
for (const mesh of [...blocks,core]) { mesh.geometry.dispose(); mesh.material.dispose() }
