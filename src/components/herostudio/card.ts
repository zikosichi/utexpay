import * as THREE from 'three'
import { cardSolid, roundSolid } from './details'
import brandArtwork from '../../../public/brand/utex-pay-white.svg?raw'

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  return { canvas, ctx: canvas.getContext('2d')! }
}

/** Vector brand artwork; reused as albedo, foil roughness and micro-relief. */
function drawFoil(ctx: CanvasRenderingContext2D, color: string) {
  // Use the same source paths and fill rules as the header, including the
  // reversed PAY cartouche. Only the material color changes for metal foil.
  const artwork = new DOMParser().parseFromString(brandArtwork, 'image/svg+xml')
  ctx.save(); ctx.translate(120, 775); ctx.scale(784 / 886, 784 / 886)
  ctx.fillStyle = color
  for (const path of artwork.querySelectorAll('path')) {
    ctx.fill(new Path2D(path.getAttribute('d')!), path.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero')
  }
  ctx.restore()
  ctx.fillStyle = color; ctx.font = '400 34px "IBM Plex Mono", monospace'; ctx.letterSpacing = '1px'
  ctx.fillText('•••• 4532', 110, 1438)
  ctx.font = '400 34px "DM Sans", sans-serif'; ctx.letterSpacing = '0px'; ctx.fillText('Sam Gold', 110, 1491)
}

function cardMaps(glossyNetwork: boolean, texturedGold: boolean) {
  const w = 1024, h = 1620
  const color = makeCanvas(w, h), rough = makeCanvas(w, h), relief = makeCanvas(w, h), finish = makeCanvas(w, h)
  const surface = texturedGold ? makeCanvas(w, h) : null
  const surfaceData = surface?.ctx.createImageData(w, h)
  // The unused blue coating channel masks the grain beneath foil and ink.
  finish.ctx.fillStyle = texturedGold ? '#293dff' : '#293d00'; finish.ctx.fillRect(0, 0, w, h)
  const colorData = color.ctx.createImageData(w, h), roughData = rough.ctx.createImageData(w, h), bumpData = relief.ctx.createImageData(w, h)
  let seed = 9021
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  // A two-dimensional grain field: independent variation in both axes, with
  // no directional strokes. Color, roughness and shallow relief describe the
  // same fixed surface, so its highlights respond naturally as the card moves.
  const surfaceNoise = texturedGold ? Float32Array.from({ length: 65536 }, () => random() * 2 - 1) : new Float32Array(0)
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const a = surfaceNoise[((iy & 255) << 8) | (ix & 255)]
    const b = surfaceNoise[((iy & 255) << 8) | ((ix + 1) & 255)]
    const c = surfaceNoise[(((iy + 1) & 255) << 8) | (ix & 255)]
    const d = surfaceNoise[(((iy + 1) & 255) << 8) | ((ix + 1) & 255)]
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, sx), THREE.MathUtils.lerp(c, d, sx), sy)
  }
  for (let y = 0; y < h; y++) {
    const brushed = (random() - .5) * 3.4
    for (let x = 0; x < w; x++) {
      const grain = (random() - .5) * 5, i = (y * w + x) * 4
      const fine = texturedGold ? noise(x * .15 + y * .04, y * .15 - x * .04) : 0
      const medium = texturedGold ? noise(x * .051 - y * .026 + 73, y * .051 + x * .026 + 119) : 0
      const patina = texturedGold ? noise(x * .018 + 181, y * .018 + 37) : 0
      if (surfaceData) {
        surfaceData.data[i] = (fine * .5 + .5) * 255
        surfaceData.data[i + 1] = (medium * .5 + .5) * 255
        surfaceData.data[i + 2] = (patina * .5 + .5) * 255
        surfaceData.data[i + 3] = 255
      }
      const variation = texturedGold ? 0 : brushed + grain
      colorData.data[i] = (texturedGold ? 184 : 174) + variation
      colorData.data[i + 1] = (texturedGold ? 162 : 156) + variation
      colorData.data[i + 2] = 118 + variation
      colorData.data[i + 3] = 255
      for (let c = 0; c < 3; c++) {
        roughData.data[i + c] = c === 2 ? 255 : texturedGold ? 205 : 218 + brushed * 3 + grain * 2
        bumpData.data[i + c] = 128
      }
      roughData.data[i + 3] = 255; bumpData.data[i + 3] = 255
    }
  }
  color.ctx.putImageData(colorData, 0, 0); rough.ctx.putImageData(roughData, 0, 0); relief.ctx.putImageData(bumpData, 0, 0)
  // A fine recessed edge makes the foil readable between specular highlights.
  color.ctx.save(); color.ctx.translate(1.4, 1.6); drawFoil(color.ctx, '#8a7650'); color.ctx.restore()
  drawFoil(color.ctx, '#f3dfad'); drawFoil(rough.ctx, '#7878ff'); drawFoil(relief.ctx, '#a0a0a0')
  if (texturedGold) drawFoil(finish.ctx, '#293d00')
  // The network mark can use glossy colored ink with its own clear lacquer.
  // R = clearcoat amount, G = clearcoat roughness, independently of the foil.
  for (const [x, ink] of [[788, '#d13b27'], [854, '#e8a62f']] as const) {
    color.ctx.fillStyle = ink; color.ctx.beginPath(); color.ctx.ellipse(x, 1466, 57, 57, 0, 0, Math.PI * 2); color.ctx.fill()
    rough.ctx.fillStyle = glossyNetwork ? '#646433' : '#eeee00'; rough.ctx.beginPath(); rough.ctx.ellipse(x, 1466, 57, 57, 0, 0, Math.PI * 2); rough.ctx.fill()
    if (glossyNetwork || texturedGold) {
      finish.ctx.fillStyle = glossyNetwork ? '#ed1800' : '#293d00'; finish.ctx.beginPath(); finish.ctx.ellipse(x, 1466, 57, 57, 0, 0, Math.PI * 2); finish.ctx.fill()
    }
  }
  color.ctx.save(); color.ctx.beginPath(); color.ctx.arc(788, 1466, 57, 0, Math.PI * 2); color.ctx.clip()
  color.ctx.fillStyle = '#f45f23'; color.ctx.beginPath(); color.ctx.arc(854, 1466, 57, 0, Math.PI * 2); color.ctx.fill(); color.ctx.restore()
  const albedo = new THREE.CanvasTexture(color.canvas), roughness = new THREE.CanvasTexture(rough.canvas), bump = new THREE.CanvasTexture(relief.canvas), coating = new THREE.CanvasTexture(finish.canvas)
  albedo.colorSpace = THREE.SRGBColorSpace
  for (const t of [albedo, roughness, bump, coating]) t.anisotropy = 8
  let grain: THREE.CanvasTexture | null = null
  if (surface && surfaceData) {
    surface.ctx.putImageData(surfaceData, 0, 0)
    grain = new THREE.CanvasTexture(surface.canvas)
    grain.wrapS = grain.wrapT = THREE.MirroredRepeatWrapping
    grain.anisotropy = 8
  }
  return { albedo, roughness, bump, coating, grain }
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

export function bankCard({ glossyNetwork = false, texturedGold = false } = {}) {
  const group = new THREE.Group(), w = 1.58, h = 2.5, thickness = .027
  const maps = cardMaps(glossyNetwork, texturedGold)
  const textureSettings = { value: new THREE.Vector4(1, 1, 1, .42) }
  // A single precision-cut metal core, with a continuous chamfer and clean back.
  const edge = new THREE.MeshPhysicalMaterial({ color: texturedGold ? '#d3bf94' : '#c5b48d', metalness: 1, roughness: .21, envMapIntensity: 1.3 })
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: maps.albedo, metalness: .94, metalnessMap: maps.roughness, roughness: texturedGold ? .42 : .47, roughnessMap: maps.roughness,
    bumpMap: maps.bump, bumpScale: texturedGold ? .0015 : .0005, anisotropy: texturedGold ? 0 : .55, anisotropyRotation: Math.PI / 2,
    clearcoat: 1, clearcoatRoughness: 1, clearcoatMap: maps.coating, clearcoatRoughnessMap: maps.coating, envMapIntensity: texturedGold ? .8 : .65,
  })
  // The rest of the scene retains photographic, display-referred textures.
  // Compress only this fully lit metal's HDR highlights before sRGB output.
  frontMaterial.onBeforeCompile = (shader) => {
    if (maps.grain) {
      shader.uniforms.uGoldGrain = { value: maps.grain }
      shader.uniforms.uGoldTexture = textureSettings
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform sampler2D uGoldGrain;
        uniform vec4 uGoldTexture;
      `).replace('#include <map_fragment>', `
        #include <map_fragment>
        vec2 grainUv = .5 + (vMapUv - .5) / uGoldTexture.x;
        vec3 grainField = texture2D(uGoldGrain, grainUv).rgb * 2. - 1.;
        float grainMask = texture2D(clearcoatMap, vClearcoatMapUv).b;
        float grainStrength = uGoldTexture.y * grainMask;
        diffuseColor.rgb *= 1. + dot(grainField, vec3(5., 4., 2.)) * .012 * grainStrength;
      `).replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        float grainRoughness = uGoldTexture.w * (205. + dot(grainField, vec3(22., 14., 6.)) * uGoldTexture.y) / 255.;
        roughnessFactor = mix(roughnessFactor, clamp(grainRoughness, .06, 1.), grainMask);
      `).replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        float grainHeight = dot(grainField, vec3(6., 3., 0.)) / 255. * .0015 * grainStrength * uGoldTexture.z;
        normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(grainHeight), dFdy(grainHeight)), faceDirection);
      `)
    }
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
  frontMaterial.customProgramCacheKey = () => texturedGold ? 'studio-grain-controls-v1' : 'studio-brushed-card-v3'
  const backMaterial = new THREE.MeshStandardMaterial({ color: '#96805c', metalness: .95, roughness: .36 })
  // No laminated overlay planes: each triangle is rendered exactly once.
  const body = new THREE.Mesh(cardSolid(w, h, thickness, .087), [frontMaterial, backMaterial, edge])
  body.name = 'Solid metal card'; group.add(body)
  const integratedCircuit = chip(); integratedCircuit.position.set(-.43, .82, thickness / 2 + .003); group.add(integratedCircuit)
  // Lean back around the horizontal bottom edge before turning in yaw.
  // No roll: the full lower edge can rest naturally on a level shelf.
  group.rotation.set(-.14, -.24, 0, 'YXZ')
  return Object.assign(group, {
    grainTexture: maps.grain,
    // Uniform changes reuse the baked grain; dragging never rebuilds maps or
    // scales the card's artwork, chip, or geometry.
    setTexture(size: number, strength: number, relief: number, roughness: number) {
      textureSettings.value.set(size, strength, relief, roughness)
    },
  })
}
