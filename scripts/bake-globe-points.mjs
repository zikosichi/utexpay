// Natural Earth 110m land (public domain), baked to normalized Int16 positions.
// No polygon lookup, texture download, or geography dependency in the browser.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const source = new URL('./data/globe-land.geojson', import.meta.url)
const target = new URL('../public/globehorizon/', import.meta.url)
const geo = JSON.parse(readFileSync(source, 'utf8'))
const polygons = geo.features.flatMap(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)
  .map(rings => ({ rings, x0: Math.min(...rings[0].map(p => p[0])), x1: Math.max(...rings[0].map(p => p[0])), y0: Math.min(...rings[0].map(p => p[1])), y1: Math.max(...rings[0].map(p => p[1])) })))
function inside(x, y, ring) {
  let result = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) result = !result
  }
  return result
}
const isLand = (x, y) => polygons.some(p => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1 && inside(x, y, p.rings[0]) && !p.rings.slice(1).some(r => inside(x, y, r)))
// Fibonacci distribution avoids dense latitude bands and streaks at the rim.
const points = [], sampleCount = 62000, goldenAngle = Math.PI * (3 - Math.sqrt(5))
let landCount = 0, layerEnd = 0
// The first layer is the approved 100% composition. A second, interleaved
// distribution adds detail above 100%; stable ranks thin either layer evenly.
for (let layer = 0; layer < 2; layer++) {
  for (let i = 0; i < sampleCount; i++) {
    const y = 1 - 2 * (i + (layer ? .25 : .5)) / sampleCount
    const angle = (i + layer * .5) * goldenAngle, ring = Math.sqrt(1 - y * y)
    const x = ring * Math.sin(angle), z = ring * Math.cos(angle)
    const lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(x, z) * 180 / Math.PI
    const land = isLand(lon, lat)
    if (!land && i % 4) continue
    if (land) landCount++
    let hash = Math.imul(i + 1 + layer * sampleCount, 0x45d9f3b)
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
    const rank = ((hash ^ (hash >>> 16)) >>> 0) % 16383
    points.push(Math.round(x * 32767), Math.round(y * 32767), Math.round(z * 32767), land ? 32767 : 0, 1 + rank + layer * 16384)
  }
  if (layer === 0) layerEnd = points.length
}
// Two files: the base layer is what the page fetches; the extra layer only when the density
// control goes above 100% (scene.ts appends it to the same interleaved layout).
mkdirSync(target, { recursive: true })
const base = new Int16Array(points.slice(0, layerEnd)), extra = new Int16Array(points.slice(layerEnd))
writeFileSync(new URL('earth-points-v3-base.bin', target), Buffer.from(base.buffer))
writeFileSync(new URL('earth-points-v3-extra.bin', target), Buffer.from(extra.buffer))
console.log(`${points.length / 5} dots (${landCount} land): base ${base.byteLength} bytes, extra ${extra.byteLength} bytes`)
