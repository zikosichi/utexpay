import * as THREE from 'three'
import { cardSolid, roundSolid } from './details'

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  return { canvas, ctx: canvas.getContext('2d')! }
}

/** Vector brand artwork; reused as albedo, foil roughness and micro-relief. */
function drawFoil(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save(); ctx.translate(160, 770); ctx.scale(5.1, 5.1)
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.05; ctx.lineJoin = 'round'; ctx.lineCap = 'square'
  const path = new Path2D('M2 6v12h14V6M22 6h17m-8.5 0v12M45 6h16M45 12h13M45 18h16M67 6l14 12M81 6 67 18')
  ctx.stroke(path)
  // PAY is engraved linework inside the foil cartouche, preserving the brand.
  ctx.lineWidth = 1.7; ctx.strokeRect(88, 2, 49, 22)
  ctx.stroke(new Path2D('M94 19V7h8v6h-8M106 19l5-12 5 12m-8-4h6M119 7l5 6 5-6m-5 6v6'))
  ctx.restore()
  ctx.fillStyle = color; ctx.font = '400 34px "IBM Plex Mono", monospace'; ctx.letterSpacing = '1px'
  ctx.fillText('•••• 4532', 110, 1438)
  ctx.font = '400 34px "DM Sans", sans-serif'; ctx.letterSpacing = '0px'; ctx.fillText('Sam Gold', 110, 1491)
}

function cardMaps() {
  const w = 1024, h = 1620
  const color = makeCanvas(w, h), rough = makeCanvas(w, h), relief = makeCanvas(w, h)
  const colorData = color.ctx.createImageData(w, h), roughData = rough.ctx.createImageData(w, h), bumpData = relief.ctx.createImageData(w, h)
  let seed = 9021
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let y = 0; y < h; y++) {
    const brushed = (random() - .5) * 3.4
    for (let x = 0; x < w; x++) {
      const grain = (random() - .5) * 5, i = (y * w + x) * 4
      colorData.data[i] = 174 + brushed + grain
      colorData.data[i + 1] = 156 + brushed + grain
      colorData.data[i + 2] = 118 + brushed + grain
      colorData.data[i + 3] = 255
      for (let c = 0; c < 3; c++) {
        roughData.data[i + c] = c === 2 ? 255 : 218 + brushed * 3 + grain * 2
        // Keep subpixel grain in albedo/roughness, not in the specular normal.
        bumpData.data[i + c] = 128
      }
      roughData.data[i + 3] = 255; bumpData.data[i + 3] = 255
    }
  }
  color.ctx.putImageData(colorData, 0, 0); rough.ctx.putImageData(roughData, 0, 0); relief.ctx.putImageData(bumpData, 0, 0)
  // A fine recessed edge makes the foil readable between specular highlights.
  color.ctx.save(); color.ctx.translate(1.4, 1.6); drawFoil(color.ctx, '#8a7650'); color.ctx.restore()
  drawFoil(color.ctx, '#f3dfad'); drawFoil(rough.ctx, '#7878ff'); drawFoil(relief.ctx, '#a0a0a0')
  // Printed network discs: matte ink has a different roughness from the metal.
  for (const [x, ink] of [[788, '#d13b27'], [854, '#e8a62f']] as const) {
    color.ctx.fillStyle = ink; color.ctx.beginPath(); color.ctx.ellipse(x, 1466, 57, 57, 0, 0, Math.PI * 2); color.ctx.fill()
    rough.ctx.fillStyle = '#eeee00'; rough.ctx.beginPath(); rough.ctx.ellipse(x, 1466, 57, 57, 0, 0, Math.PI * 2); rough.ctx.fill()
  }
  const albedo = new THREE.CanvasTexture(color.canvas), roughness = new THREE.CanvasTexture(rough.canvas), bump = new THREE.CanvasTexture(relief.canvas)
  albedo.colorSpace = THREE.SRGBColorSpace
  for (const t of [albedo, roughness, bump]) t.anisotropy = 8
  return { albedo, roughness, bump }
}

function chip() {
  const group = new THREE.Group()
  const frame = new THREE.Mesh(roundSolid(.303, .365, .009, .048), new THREE.MeshStandardMaterial({ color: '#6b5d3d', metalness: .95, roughness: .23 }))
  group.add(frame)
  const contacts = new THREE.Mesh(roundSolid(.278, .34, .006, .036), new THREE.MeshPhysicalMaterial({ color: '#ddcc9b', metalness: .78, roughness: .27, anisotropy: .45, clearcoat: .2, envMapIntensity: 1.0 }))
  contacts.position.z = .006; group.add(contacts)
  const groove = new THREE.MeshStandardMaterial({ color: '#655537', metalness: .7, roughness: .42 })
  const paths = [
    [[-.049, -.166], [-.049, -.09], [-.08, -.057], [-.08, .055], [-.049, .09], [-.049, .166]],
    [[.049, -.166], [.049, -.09], [.08, -.057], [.08, .055], [.049, .09], [.049, .166]],
    [[-.13, -.057], [-.08, -.057]], [[.08, -.057], [.13, -.057]],
    [[-.13, .055], [-.08, .055]], [[.08, .055], [.13, .055]],
    [[-.049, -.09], [.049, -.09]], [[-.049, .09], [.049, .09]],
  ]
  for (const points of paths) {
    const curve = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i - 1][0], points[i - 1][1], .010), new THREE.Vector3(points[i][0], points[i][1], .010)))
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(1, points.length - 1) * 4, .0028, 5, false), groove))
  }
  return group
}

export function bankCard() {
  const group = new THREE.Group(), w = 1.58, h = 2.5, thickness = .027
  const maps = cardMaps()
  // A single precision-cut metal core, with a continuous chamfer and clean back.
  const edge = new THREE.MeshPhysicalMaterial({ color: '#c5b48d', metalness: 1, roughness: .21, envMapIntensity: 1.3 })
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: maps.albedo, metalness: .94, metalnessMap: maps.roughness, roughness: .47, roughnessMap: maps.roughness,
    bumpMap: maps.bump, bumpScale: .0005, anisotropy: .55, anisotropyRotation: Math.PI / 2,
    clearcoat: .16, clearcoatRoughness: .24, envMapIntensity: .65,
  })
  // The rest of the scene retains photographic, display-referred textures.
  // Compress only this fully lit metal's HDR highlights before sRGB output.
  frontMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCardWorld;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCardWorld = (modelMatrix * vec4(transformed, 1.)).xyz;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCardWorld;').replace('#include <opaque_fragment>', `
      // A finite studio strip reflected into the metal. Intersect the actual
      // reflected view ray with its plane, so the band travels over the card
      // with camera motion and respects its orientation and micro-normal map.
      vec3 cardNormal = inverseTransformDirection(normal, viewMatrix);
      vec3 cardView = normalize(cameraPosition - vCardWorld);
      vec3 cardRay = reflect(-cardView, cardNormal);
      float stripT = (6. - vCardWorld.z) / max(cardRay.z, .01);
      vec3 stripHit = vCardWorld + cardRay * stripT;
      float stripX = (stripHit.x + .6 + (stripHit.y - 2.) * .22) / .8;
      float stripY = (stripHit.y - 2.) / 4.;
      float strip = exp(-stripX * stripX - stripY * stripY) * step(0., cardRay.z);
      outgoingLight += diffuseColor.rgb * strip * 1.75;
      float cardPeak = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);
      outgoingLight *= .58 / (1. + .5 * cardPeak);
      #include <opaque_fragment>
    `)
  }
  frontMaterial.customProgramCacheKey = () => 'studio-brushed-card-v3'
  const backMaterial = new THREE.MeshStandardMaterial({ color: '#96805c', metalness: .95, roughness: .36 })
  // No laminated overlay planes: each triangle is rendered exactly once.
  const body = new THREE.Mesh(cardSolid(w, h, thickness, .087), [frontMaterial, backMaterial, edge])
  body.name = 'Solid metal card'; group.add(body)
  const integratedCircuit = chip(); integratedCircuit.position.set(-.43, .82, thickness / 2 + .003); group.add(integratedCircuit)
  // Lean back around the horizontal bottom edge before turning in yaw.
  // No roll: the full lower edge can rest naturally on a level shelf.
  group.rotation.set(-.14, -.24, 0, 'YXZ')
  return group
}
