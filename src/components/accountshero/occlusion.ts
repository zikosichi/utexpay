import * as THREE from 'three'
type Point = [number, number]

export function silhouette(points: Point[]): Point[] {
  const sorted = points.slice().sort((a,b) => a[0]-b[0] || a[1]-b[1])
  const cross = (o: Point,a: Point,b: Point) => (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
  const half = (list: Point[]) => {
    const hull: Point[] = []
    for (const point of list) {
      while (hull.length > 1 && cross(hull[hull.length-2],hull[hull.length-1],point) <= 0) hull.pop()
      hull.push(point)
    }
    return hull.slice(0,-1)
  }
  return [...half(sorted),...half(sorted.reverse())]
}

/** Project screen-space points into a panel's own pixel space and clip them to its box. */
export function panelPolygon(matrix: number[], outline: Point[], width: number, height: number) {
  const inverse = new THREE.Matrix3().set(matrix[0],matrix[4],matrix[12],matrix[1],matrix[5],matrix[13],matrix[3],matrix[7],matrix[15]).invert()
  let polygon = outline.map(([x,y]): Point => {
    const point = new THREE.Vector3(x,y,1).applyMatrix3(inverse)
    return [point.x/point.z,point.y/point.z]
  })
  // Clip to the panel; an outside subpath must not accidentally reveal
  // overflowing children through even-odd filling.
  for (const [axis,limit,direction] of [[0,0,1],[0,width,-1],[1,0,1],[1,height,-1]]) {
    const next: Point[] = []
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i+1)%polygon.length]
      const aInside = (a[axis]-limit)*direction >= 0, bInside = (b[axis]-limit)*direction >= 0
      if (aInside) next.push(a)
      if (aInside !== bInside) {
        const t = (limit-a[axis])/(b[axis]-a[axis])
        next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])
      }
    }
    polygon = next
  }
  return polygon.length < 3 ? null : polygon
}
const point = ([x,y]: Point) => `${x.toFixed(2)} ${y.toFixed(2)}`

/** Cut the foreground card out of a live HTML panel, including pointer hit testing. */
export function panelOcclusion(matrix: number[], outline: Point[], width: number, height: number) {
  const polygon = panelPolygon(matrix,outline,width,height)
  if (!polygon) return ''
  return `path(evenodd, "M0 0H${width.toFixed(2)}V${height.toFixed(2)}H0Z M${polygon.map(point).join('L')}Z")`
}

/** The card's shadow on a live HTML panel, as a clip for a soft dark layer. */
export function panelShadow(matrix: number[], outline: Point[], width: number, height: number) {
  const polygon = panelPolygon(matrix,outline,width,height)
  return polygon ? `path("M${polygon.map(point).join('L')}Z")` : 'polygon(0 0, 0 0, 0 0)'
}

/** Where a point light throws each silhouette vertex onto a panel's face plane. */
export function castOutline(vertices: THREE.Vector3[], light: THREE.Vector3, corners: THREE.Vector3[]) {
  const normal = corners[1].clone().sub(corners[0]).cross(corners[3].clone().sub(corners[0])).normalize()
  const cast: THREE.Vector3[] = []
  for (const vertex of vertices) {
    const ray = vertex.clone().sub(light)
    const slope = ray.dot(normal)
    if (Math.abs(slope) < 1e-6) continue
    const t = corners[0].clone().sub(vertex).dot(normal) / slope
    if (t <= 0) continue
    cast.push(vertex.clone().addScaledVector(ray,t))
  }
  return cast
}
