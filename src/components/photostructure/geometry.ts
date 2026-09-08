import * as THREE from 'three'

// Calibration coordinates use the existing 1672 × 941 study. The supplied
// 2004 × 1128 plate is the same image at higher resolution; UVs are normalized.
export const PLATE = { width: 1672, height: 941, scale: 100 }
type Point = [number, number]
type Contour = {
  bl: Point; br: Point; right: Point; tr: Point; tl: Point; left: Point
  rc: Point; lc: Point
}
type SolidSpec = { name: string; front: Contour; back: Contour; z: number; depth: number; chart: [Point, Point] }

export function createProjector() {
  const camera = new THREE.OrthographicCamera(-8.36, 8.36, 4.705, -4.705, .1, 100)
  const yaw = THREE.MathUtils.degToRad(-12), pitch = THREE.MathUtils.degToRad(16)
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * 40, Math.sin(pitch) * 40, Math.cos(yaw) * Math.cos(pitch) * 40)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  return camera
}

/** Intersect a source-image ray with a physical front/back plane. */
export function imagePoint(p: Point, z: number, projector: THREE.OrthographicCamera) {
  const origin = new THREE.Vector3(p[0] / PLATE.width * 2 - 1, 1 - p[1] / PLATE.height * 2, -1).unproject(projector)
  const ray = projector.getWorldDirection(new THREE.Vector3())
  return origin.addScaledVector(ray, (z - origin.z) / ray.z)
}

// These contours preserve the source's irregular little bevels and silhouette.
// Each has corresponding sections, so the connecting surfaces are real closed
// extrusions, not a displaced rectangular image grid. The slight inconsistencies
// in AI perspective are absorbed in the solids rather than in the photograph.
const SPECS: SolidSpec[] = [
  {
    name: 'Personal', z: .68, depth: 2.35,
    front: { bl: [114, 747], br: [629, 715], right: [629, 484], tr: [629, 484], rc: [629, 484], tl: [139, 513], lc: [114, 514], left: [114, 539] },
    back: { bl: [82, 711], br: [577, 679], right: [577, 433], tr: [577, 433], rc: [577, 433], tl: [120, 457], lc: [82, 457], left: [82, 496] },
    chart: [[151, 550], [590, 700]],
  },
  {
    name: 'Business', z: .735, depth: 2.35,
    front: { bl: [628, 715], br: [1108, 684], right: [1108, 391], tr: [1108, 391], rc: [1108, 391], tl: [653, 417], lc: [628, 418], left: [628, 439] },
    back: { bl: [573, 679], br: [1034, 645], right: [1034, 345], tr: [1034, 345], rc: [1034, 345], tl: [602, 366], lc: [573, 368], left: [573, 395] },
    chart: [[673, 455], [1070, 670]],
  },
  {
    name: 'Payments', z: .79, depth: 2.35,
    front: { bl: [1107, 684], br: [1601, 650], right: [1601, 333], tr: [1587, 318], rc: [1601, 318], tl: [1137, 343], lc: [1107, 344], left: [1107, 367] },
    back: { bl: [1032, 644], br: [1518, 611], right: [1518, 287], tr: [1504, 274], rc: [1518, 274], tl: [1061, 295], lc: [1032, 296], left: [1032, 322] },
    chart: [[1155, 380], [1560, 635]],
  },
  {
    name: 'Foundation', z: 1.65, depth: 3.38,
    front: { bl: [101, 941], br: [1653, 941], right: [1653, 688], tr: [1649, 685], rc: [1653, 685], tl: [109, 789], lc: [101, 789], left: [101, 795] },
    back: { bl: [59, 941], br: [1607, 941], right: [1607, 653], tr: [1603, 649], rc: [1607, 649], tl: [65, 710], lc: [59, 710], left: [59, 716] },
    chart: [[150, 811], [1600, 930]],
  },
]

/** A physical shelf, calibrated from the two outside front contact points. */
export function createShelfPlane(projector: THREE.OrthographicCamera) {
  const left = imagePoint(SPECS[0].front.bl, SPECS[0].z, projector)
  const right = imagePoint(SPECS[2].front.br, SPECS[2].z, projector)
  // The tiny left-to-right rise belongs to the generated reference. Depth
  // stays level, so all four solids meet one continuous reflecting surface.
  const slope = (right.y - left.y) / (right.x - left.x)
  const normal = new THREE.Vector3(-slope, 1, 0).normalize()
  return new THREE.Plane(normal, -normal.dot(left))
}

function calibratedRings(spec: SolidSpec, contours: THREE.Vector2[][], projector: THREE.OrthographicCamera, shelf: THREE.Plane) {
  const direction = projector.getWorldDirection(new THREE.Vector3())
  function onShelf(p: Point) {
    const ray = new THREE.Ray(imagePoint(p, 0, projector), direction)
    // Infinite line / plane intersection: the ray origin may lie behind the
    // shelf, so Ray.intersectPlane's positive-distance restriction is unsuitable.
    return ray.origin.clone().addScaledVector(direction, -shelf.distanceToPoint(ray.origin) / shelf.normal.dot(direction))
  }
  return contours.map((ring, side) => {
    const contour = side === 0 ? spec.front : spec.back
    const z = spec.z - spec.depth * side
    return ring.map((p) => {
      const t = THREE.MathUtils.clamp((p.x - contour.tl[0]) / (contour.tr[0] - contour.tl[0]), 0, 1)
      const topY = THREE.MathUtils.lerp(contour.tl[1], contour.tr[1], t)
      if (spec.name === 'Foundation') {
        // Reconstruct the crown on the contact plane, then drop its walls
        // vertically. Reusing each source ray keeps every photographic pixel
        // in the same place in the resting view, including the gold perimeter.
        const topZ = onShelf([p.x, topY]).z
        return imagePoint([p.x, p.y], topZ, projector)
      }
      const bottomT = THREE.MathUtils.clamp((p.x - contour.bl[0]) / (contour.br[0] - contour.bl[0]), 0, 1)
      const bottomY = THREE.MathUtils.lerp(contour.bl[1], contour.br[1], bottomT)
      const bottomZ = onShelf([p.x, bottomY]).z
      const height = THREE.MathUtils.clamp((p.y - topY) / (bottomY - topY), 0, 1)
      // Small depth corrections taper from the original crown to the exact
      // shelf intersection. All bottom vertices, not just three corners, seat
      // on the plane. Photo UVs still project exactly through the same rays.
      return imagePoint([p.x, p.y], THREE.MathUtils.lerp(z, bottomZ, height), projector)
    })
  })
}

function contourPoints(c: Contour) {
  const points: THREE.Vector2[] = []
  function line(a: Point, b: Point, segments: number) {
    for (let i = 0; i < segments; i++) points.push(new THREE.Vector2(THREE.MathUtils.lerp(a[0], b[0], i / segments), THREE.MathUtils.lerp(a[1], b[1], i / segments)))
  }
  function curve(a: Point, b: Point, c: Point, segments: number) {
    for (let i = 0; i < segments; i++) {
      const t = i / segments, s = 1 - t
      points.push(new THREE.Vector2(s * s * a[0] + 2 * s * t * b[0] + t * t * c[0], s * s * a[1] + 2 * s * t * b[1] + t * t * c[1]))
    }
  }
  line(c.bl, c.br, 24)
  line(c.br, c.right, 32)
  curve(c.right, c.rc, c.tr, 12)
  line(c.tr, c.tl, 64)
  curve(c.tl, c.lc, c.left, 24)
  line(c.left, c.bl, 32)
  return points
}

export function createStructureGeometry(projector: THREE.OrthographicCamera) {
  const shelf = createShelfPlane(projector)
  return SPECS.map((spec) => {
    const front = contourPoints(spec.front), back = contourPoints(spec.back)
    const positions: number[] = [], uvs: number[] = [], fallbackUvs: number[] = [], sourceVisible: number[] = []
    const rings = calibratedRings(spec, [front, back], projector, shelf)
    const bounds = new THREE.Box2().setFromPoints(front)
    const center = new THREE.Vector3()
    for (const ring of rings) for (const p of ring) center.add(p)
    center.divideScalar(front.length * 2)
    function triangle(points: THREE.Vector3[], pixels: THREE.Vector2[], photographed: boolean) {
      // Outward winding is corrected using the solid centroid, including caps.
      const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]))
      if (normal.lengthSq() < 1e-12) return
      const middle = points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1 / 3)
      if (normal.dot(middle.sub(center)) < 0) { [points[1], points[2]] = [points[2], points[1]]; [pixels[1], pixels[2]] = [pixels[2], pixels[1]] }
      points.forEach((point, i) => {
        positions.push(point.x, point.y, point.z)
        uvs.push(pixels[i].x / PLATE.width, 1 - pixels[i].y / PLATE.height)
        const u = THREE.MathUtils.clamp((pixels[i].x - bounds.min.x) / (bounds.max.x - bounds.min.x), 0, 1)
        const v = THREE.MathUtils.clamp((pixels[i].y - bounds.min.y) / (bounds.max.y - bounds.min.y), 0, 1)
        fallbackUvs.push(THREE.MathUtils.lerp(spec.chart[0][0], spec.chart[1][0], u) / PLATE.width, 1 - THREE.MathUtils.lerp(spec.chart[0][1], spec.chart[1][1], v) / PLATE.height)
        sourceVisible.push(photographed ? 1 : 0)
      })
    }
    for (let side = 0; side < 2; side++) {
      const pixels = side === 0 ? front : back
      const faces = THREE.ShapeUtils.triangulateShape(pixels.map((p) => p.clone()), [])
      for (const face of faces) triangle(face.map((i) => rings[side][i]), face.map((i) => pixels[i]), side === 0)
    }
    for (let i = 0; i < front.length; i++) {
      const j = (i + 1) % front.length
      triangle([rings[0][i], rings[1][i], rings[1][j]], [front[i], back[i], back[j]], true)
      triangle([rings[0][i], rings[1][j], rings[0][j]], [front[i], back[j], front[j]], true)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('fallbackUv', new THREE.Float32BufferAttribute(fallbackUvs, 2))
    geometry.setAttribute('sourceVisible', new THREE.Float32BufferAttribute(sourceVisible, 1))
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    geometry.name = spec.name
    return geometry
  })
}
