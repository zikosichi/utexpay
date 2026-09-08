// Node 22+: node --experimental-strip-types scripts/verify-personal-html.mjs
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createProjector, createStructureGeometry } from '../src/components/photostructure/geometry.ts'
import { anchorSurface, surfaceMatrix, surfaceGrid, PERSONAL_SURFACES, BUSINESS_SURFACES, PAYMENTS_SURFACES } from '../src/components/photostructure/surfaces.ts'

const projector = createProjector(), geometry = createStructureGeometry(projector)
const material = new THREE.MeshBasicMaterial()
const surfaces = [PERSONAL_SURFACES, BUSINESS_SURFACES, PAYMENTS_SURFACES].flatMap((specs, index) => {
  const block = new THREE.Mesh(geometry[index], material)
  return Object.entries(specs).map(([name, spec]) => {
    const grid = surfaceGrid(block, projector, spec)
    assert.equal(grid.fallbacks, 0, `${geometry[index].name} ${name} must follow the bronze, not the fallback plane`)
    // Check inside every rendered triangle, not just its raycast vertices:
    // a flat or under-sampled decal can cut into the non-planar bronze there.
    const samples = []
    for (let i = 0; i < grid.indices.length; i += 3) {
      const corners = grid.indices.slice(i, i + 3).map((id) => new THREE.Vector3().fromArray(grid.positions, id * 3))
      for (const weights of [[1 / 3, 1 / 3, 1 / 3], [.5, .5, 0], [.5, 0, .5], [0, .5, .5]]) {
        const point = new THREE.Vector3()
        corners.forEach((corner, j) => point.addScaledVector(corner, weights[j]))
        samples.push(point)
      }
    }
    return { name: `${geometry[index].name} ${name}`, spec, block, samples, anchors: anchorSurface(block, projector, spec) }
  })
})
let views = 0, maxError = 0
for (const [width, height] of [[390, 590], [834, 900], [1600, 660]]) {
  for (const yaw of [-21, -16.5, -12, -7.5, -3]) {
    for (const pitch of [12.76, 16, 19.24]) {
      const camera = projector.clone(), azimuth = THREE.MathUtils.degToRad(yaw), elevation = THREE.MathUtils.degToRad(pitch)
      const span = Math.max(18.5, 8.1 * width / height)
      camera.left = -span / 2; camera.right = span / 2
      camera.top = span / (width / height) / 2; camera.bottom = -camera.top
      camera.position.set(Math.sin(azimuth) * Math.cos(elevation) * 40, Math.sin(elevation) * 40, Math.cos(azimuth) * Math.cos(elevation) * 40)
      camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix()
      for (const { spec, anchors } of surfaces) {
        const target = anchors.map((anchor) => {
          const p = anchor.clone().project(camera)
          return [(p.x + 1) * width / 2, (1 - p.y) * height / 2]
        })
        const css = surfaceMatrix(target, spec.width, spec.height)
        assert.ok(css?.every(Number.isFinite), 'The HTML transform must stay finite')
        const layout = [[0, 0], [spec.width, 0], [spec.width, spec.height], [0, spec.height]]
        layout.forEach(([x, y], i) => {
          // Evaluate using CSS's column-major homogeneous coordinates, not
          // the mapping function's own equations. Every DOM corner must land
          // on its corresponding 3D anchor after perspective division.
          const w = css[3] * x + css[7] * y + css[15]
          const mapped = [(css[0] * x + css[4] * y + css[12]) / w, (css[1] * x + css[5] * y + css[13]) / w]
          const error = Math.hypot(mapped[0] - target[i][0], mapped[1] - target[i][1])
          maxError = Math.max(maxError, error)
          assert.ok(error < .001, `HTML detached from the mesh at ${yaw}°, ${pitch}°`)
        })
      }
      views++
    }
  }
}
const raycaster = new THREE.Raycaster()
let clearanceChecks = 0, minClearance = Infinity
const poses = [-21, -16.5, -12, -7.5, -3].flatMap((yaw) => [12.76, 16, 19.24].map((pitch) => [yaw, pitch]))
poses.push([-28, 19.5], [-37, 22.74]) // Intro, including maximum pointer travel.
for (const [yaw, pitch] of poses) {
  const azimuth = THREE.MathUtils.degToRad(yaw), elevation = THREE.MathUtils.degToRad(pitch)
  const towardCamera = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation))
  const direction = towardCamera.clone().negate()
  for (const { name, block, samples } of surfaces) {
    for (const point of samples) {
      raycaster.set(point.clone().addScaledVector(towardCamera, 40), direction)
      const hit = raycaster.intersectObject(block)[0]
      // At the intro's steeper angle, transparent bleed can extend past the
      // silhouette; with no bronze on that ray, there is nothing to occlude it.
      if (!hit) continue
      const clearance = hit.distance - 40
      assert.ok(clearance > .001, `${name} image intersects the bronze at ${yaw}°, ${pitch}° (${clearance})`)
      minClearance = Math.min(minClearance, clearance)
      clearanceChecks++
    }
  }
}
geometry.forEach((g) => g.dispose()); material.dispose()
console.log(`Sculpture panels: ${surfaces.length} surfaces across all three boxes stay registered through ${views} camera/viewport combinations; max error ${maxError.toExponential(2)}px.`)
console.log(`Baked images clear the bronze in ${clearanceChecks} triangle samples across ${poses.length} poses, including the intro; minimum clearance ${minClearance.toFixed(5)} units.`)
