import * as THREE from 'three'
import { defaultAppearance, normalizeAppearance, type GlobeAppearance } from './appearance'

export type GlobeScene = {
  setAppearance(value: GlobeAppearance): void
  dispose(): void
}

const initialTilt = .22
const initialTurn = .24
const hoverTrailLength = 40
const hoverTrailLifetime = 1.3
const unit = (lat: number, lon: number) => {
  const a = lat * Math.PI / 180, b = lon * Math.PI / 180
  return new THREE.Vector3(Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b))
}

// Payments spawn between random pairs of these, so the routes never repeat.
const cities = [
  [40.71, -74.01], [51.51, -.13], [52.52, 13.4], [25.2, 55.27], [1.35, 103.82], [-23.55, -46.63],
  [41.72, 44.79], [52.37, 4.9], [48.86, 2.35], [40.42, -3.7], [38.72, -9.14], [52.23, 21.01],
  [41.01, 28.98], [35.68, 139.69], [22.32, 114.17], [-33.87, 151.21], [19.08, 72.88], [-1.29, 36.82],
  [6.52, 3.38], [-33.92, 18.42], [43.65, -79.38], [19.43, -99.13], [-34.6, -58.38], [34.05, -118.24],
  [41.88, -87.63], [59.33, 18.07], [24.71, 46.68], [37.57, 126.98], [13.76, 100.5], [50.11, 8.68],
  [47.38, 8.54], [45.46, 9.19], [30.04, 31.24], [55.76, 37.62], [-6.21, 106.85], [33.89, 35.5],
].map(([lat, lon]) => unit(lat, lon))

const maxRadius = 740
const arcPool = 10
const arcSegments = 72
const arcTubeSides = 6
const arcTubeRadius = .003
const arcFadeLength = .35

/**
 * Shared unit geometry for every route: `progress` runs along the arc and `around` runs round the
 * tube. The vertex shader lifts it onto a great circle between two uniforms, so a route only
 * costs a few uniform writes when it appears.
 */
function arcGeometry(sides: number) {
  const progress: number[] = [], around: number[] = [], index: number[] = []
  for (let i = 0; i <= arcSegments; i++) {
    for (let j = 0; j < sides; j++) { progress.push(i / arcSegments); around.push(j / sides * Math.PI * 2) }
  }
  if (sides > 1) {
    for (let i = 0; i < arcSegments; i++) for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + (j + 1) % sides, c = a + sides, d = b + sides
      index.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(progress.length * 3), 3))
  geometry.setAttribute('progress', new THREE.Float32BufferAttribute(progress, 1))
  geometry.setAttribute('around', new THREE.Float32BufferAttribute(around, 1))
  if (index.length) geometry.setIndex(index)
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.3)
  return geometry
}

const arcShader = `
  uniform vec3 uA; uniform vec3 uB; uniform float uLift; uniform float uAngle;
  vec3 arcPoint(float t) {
    vec3 p = normalize((sin((1.0 - t) * uAngle) * uA + sin(t * uAngle) * uB) / sin(uAngle));
    return p * (1.007 + uLift * sin(3.14159265 * t));
  }`

/** Genuine WebGL geometry: one point cloud, a depth-only sphere, and a pool of transient routes. */
export async function createGlobeScene(canvas: HTMLCanvasElement, stage: HTMLElement, signal: AbortSignal): Promise<GlobeScene> {
  // The approved 100% composition is one file; the interleaved layer that the density control
  // reveals above 100% is a second one, fetched only when first asked for (see setAppearance).
  const loadPoints = async (name: string) => {
    const response = await fetch(`/globehorizon/${name}`, { signal })
    if (!response.ok) throw new Error('Globe geography unavailable')
    const points = new Int16Array(await response.arrayBuffer())
    signal.throwIfAborted()
    return points
  }
  let data = await loadPoints('earth-points-v3-base.bin')
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 5000)
  camera.position.z = 2000
  const world = new THREE.Group()
  scene.add(world)

  // Hide the rear hemisphere and routes without painting a solid globe surface.
  const occluder = new THREE.Mesh(new THREE.SphereGeometry(.997, 64, 48), new THREE.MeshBasicMaterial({ colorWrite: false }))
  occluder.renderOrder = -1
  world.add(occluder)
  let appearance = defaultAppearance
  let baseDotSize = 3.5
  let baseHoverRadius = 270
  const pointGeometry = (points: Int16Array) => {
    const buffer = new THREE.InterleavedBuffer(points, 5)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0, true))
    geometry.setAttribute('land', new THREE.InterleavedBufferAttribute(buffer, 1, 3, true))
    geometry.setAttribute('rank', new THREE.InterleavedBufferAttribute(buffer, 1, 4, true))
    return geometry
  }
  const geometry = pointGeometry(data)
  const dotMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uDpr: { value: 1 }, uSize: { value: 3.5 }, uDensity: { value: .5 },
      uPointer: { value: new THREE.Vector2(-1000, -1000) }, uViewport: { value: new THREE.Vector2(1, 1) },
      uHoverRadius: { value: 270 }, uHoverStrength: { value: 0 },
      uTrail: { value: Array.from({ length: hoverTrailLength }, () => new THREE.Vector3(-1000, -1000, 0)) },
      uGold: { value: new THREE.Color('#e3c995') }, uOcean: { value: new THREE.Color('#746548') },
    },
    vertexShader: `attribute float land; attribute float rank; uniform float uDpr; uniform float uSize;
      uniform vec2 uPointer; uniform vec2 uViewport; uniform float uHoverRadius; uniform float uHoverStrength; uniform float uDensity;
      uniform vec3 uTrail[${hoverTrailLength}];
      varying float vLand; varying float vFacing; varying float vRank;
      void main() {
        vec3 normal = normalize(normalMatrix * normalize(position));
        vFacing = normal.z; vLand = land; vRank = rank;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 screenPosition = (gl_Position.xy / gl_Position.w * .5 + .5) * uViewport;
        float nearby = 1.0 - smoothstep(0.0, uHoverRadius, distance(screenPosition, uPointer));
        float influence = nearby * uHoverStrength;
        if (vFacing > 0.0 && rank <= uDensity) {
          for (int i = 0; i < ${hoverTrailLength}; i++) {
            if (uTrail[i].z > .001) {
              float wake = 1.0 - smoothstep(0.0, uHoverRadius, distance(screenPosition, uTrail[i].xy));
              influence = max(influence, wake * uTrail[i].z);
            }
          }
        }
        float hoverScale = 1.0 + influence * .95;
        gl_PointSize = uSize * hoverScale * uDpr * mix(.55, 1.0, land) * (.69 + .31 * max(vFacing, 0.0));
      }`,
    fragmentShader: `uniform vec3 uGold; uniform vec3 uOcean; uniform float uDensity; varying float vLand; varying float vFacing; varying float vRank;
      void main() {
        if (vFacing <= 0.0 || vRank > uDensity) discard;
        float circle = 1.0 - smoothstep(.32, .5, length(gl_PointCoord - .5));
        float facing = smoothstep(.02, .24, vFacing);
        gl_FragColor = vec4(mix(uOcean, uGold, vLand), circle * facing * mix(.40, 1.0, vLand));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const dots = new THREE.Points(geometry, dotMaterial)
  world.add(dots)
  let extraLayer: Promise<void> | null = null
  const loadExtraLayer = () => extraLayer ??= loadPoints('earth-points-v3-extra.bin').then((extra) => {
    const merged = new Int16Array(data.length + extra.length)
    merged.set(data); merged.set(extra, data.length)
    data = merged
    dots.geometry.dispose()
    dots.geometry = pointGeometry(data)
    setAppearance(appearance)
  }).catch((error: unknown) => { if (!signal.aborted) console.warn('Globe detail layer unavailable', error) })

  // Analytic halos stay crisp at any resolution, without textures or a bloom pass.
  const glowGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()])
  const glowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 28 }, uDpr: { value: 1 }, uPulse: { value: 1 }, uAlpha: { value: 1 }, uGold: { value: new THREE.Color('#f4ce80') } },
    vertexShader: `uniform float uSize; uniform float uDpr; uniform float uPulse; void main() {
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=uSize*uDpr*uPulse;
    }`,
    fragmentShader: `uniform vec3 uGold; uniform float uAlpha; void main() {
      float r=length(gl_PointCoord-.5)*2.0;
      float halo=exp(-r*r*5.0)*(1.0-smoothstep(.6,1.0,r));
      gl_FragColor=vec4(uGold,halo*.62*uAlpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  })
  // One material describes both the crisp line and its soft tube halo; `uHead` reveals the route
  // behind the traveling marker and `uTail` dissolves it from the origin once the money has landed.
  const routeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uA: { value: new THREE.Vector3(1, 0, 0) }, uB: { value: new THREE.Vector3(0, 1, 0) }, uLift: { value: .14 }, uAngle: { value: 1 },
      uHead: { value: 0 }, uTail: { value: -1 }, uRadius: { value: 0 }, uOpacity: { value: .78 }, uGold: { value: new THREE.Color('#ecd09b') },
    },
    vertexShader: `${arcShader}
      attribute float progress; attribute float around; uniform float uRadius;
      varying float vProgress; varying float vFacing;
      void main() {
        vec3 p = arcPoint(progress);
        vec3 n = normalize(p);
        if (uRadius > 0.0) {
          vec3 tangent = normalize(arcPoint(min(progress + .01, 1.0)) - arcPoint(max(progress - .01, 0.0)));
          n = cos(around) * n + sin(around) * normalize(cross(tangent, n));
          p += n * uRadius;
        }
        vProgress = progress;
        vFacing = abs(normalize(normalMatrix * n).z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform vec3 uGold; uniform float uHead; uniform float uTail; uniform float uRadius; uniform float uOpacity;
      varying float vProgress; varying float vFacing;
      void main() {
        if (vProgress > uHead) discard;
        float alpha = smoothstep(uTail, uTail + ${arcFadeLength}, vProgress) * uOpacity;
        if (uRadius > 0.0) alpha *= pow(vFacing, 3.0);
        gl_FragColor = vec4(uGold, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const routeHaloMaterial = routeMaterial.clone()
  routeHaloMaterial.blending = THREE.AdditiveBlending
  routeHaloMaterial.uniforms.uRadius.value = arcTubeRadius
  routeHaloMaterial.uniforms.uOpacity.value = .23
  routeHaloMaterial.uniforms.uGold.value.set('#e8bc70')
  const lineGeometry = arcGeometry(1)
  const haloGeometry = arcGeometry(arcTubeSides)
  const beadGeometry = new THREE.SphereGeometry(.004, 8, 6)
  const beadMaterial = new THREE.MeshBasicMaterial({ color: '#fff4db' })
  type Route = {
    alive: boolean, start: number, duration: number, angle: number, lift: number
    a: THREE.Vector3, b: THREE.Vector3, line: THREE.ShaderMaterial, halo: THREE.ShaderMaterial, glow: THREE.ShaderMaterial
    objects: THREE.Object3D[], bead: THREE.Mesh
  }
  const routes: Route[] = Array.from({ length: arcPool }, () => {
    const line = routeMaterial.clone(), halo = routeHaloMaterial.clone(), glow = glowMaterial.clone()
    const bead = new THREE.Mesh(beadGeometry, beadMaterial)
    bead.add(new THREE.Points(glowGeometry, glow))
    const objects = [new THREE.Line(lineGeometry, line), new THREE.Mesh(haloGeometry, halo), bead]
    for (const object of objects) { object.visible = false; world.add(object) }
    return { alive: false, start: 0, duration: 1, angle: 1, lift: .14, a: new THREE.Vector3(), b: new THREE.Vector3(), line, halo, glow, objects, bead }
  })
  const glowMaterials = routes.map(route => route.glow)
  const arcLanding = .9, arcDissolve = 1.8
  const arcPoint = (route: Route, t: number, target: THREE.Vector3) => target.copy(route.a).multiplyScalar(Math.sin((1 - t) * route.angle))
    .addScaledVector(route.b, Math.sin(t * route.angle)).divideScalar(Math.sin(route.angle))
    .normalize().multiplyScalar(1.007 + route.lift * Math.sin(Math.PI * t))
  const facing = new THREE.Vector3()
  const facingOf = (point: THREE.Vector3) => facing.copy(point).applyQuaternion(world.quaternion).z
  /** Start a payment between two random cities, preferring pairs the viewer can currently see. */
  function spawnRoute(at: number, progress = 0) {
    const route = routes.find(item => !item.alive)
    if (!route) return
    let a = cities[0], b = cities[1], angle = 1
    for (let attempt = 0; attempt < 12; attempt++) {
      a = cities[Math.floor(Math.random() * cities.length)]
      b = cities[Math.floor(Math.random() * cities.length)]
      angle = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
      if (angle < .38 || angle > 2.7) continue
      if (facingOf(a) > .15 && facingOf(b) > -.1) break
    }
    route.alive = true
    route.a.copy(a); route.b.copy(b); route.angle = angle
    route.lift = Math.min(.13, .06 + angle * .03)
    route.duration = 3.6 + angle * 2.6
    route.start = at - route.duration * progress
    route.line.uniforms.uA.value.copy(a); route.line.uniforms.uB.value.copy(b)
    route.halo.uniforms.uA.value.copy(a); route.halo.uniforms.uB.value.copy(b)
    for (const material of [route.line, route.halo]) { material.uniforms.uAngle.value = angle; material.uniforms.uLift.value = route.lift }
    for (const object of route.objects) object.visible = true
  }
  let nextSpawn = 0
  function updateRoutes(now: number) {
    for (const route of routes) {
      if (!route.alive) continue
      const elapsed = now - route.start
      if (elapsed < 0 || elapsed > route.duration + arcDissolve) {
        route.alive = false
        for (const object of route.objects) object.visible = false
        continue
      }
      const travel = THREE.MathUtils.clamp(elapsed / route.duration, 0, 1)
      const head = travel * travel * (3 - 2 * travel)
      const settled = Math.max(0, elapsed - route.duration)
      const tail = settled > 0 ? THREE.MathUtils.lerp(-arcFadeLength, 1, settled / arcDissolve) : -1
      for (const material of [route.line, route.halo]) { material.uniforms.uHead.value = head; material.uniforms.uTail.value = tail }
      arcPoint(route, head, route.bead.position)
      const landing = THREE.MathUtils.clamp(settled / arcLanding, 0, 1)
      const arriving = Math.min(1, elapsed / .3)
      route.bead.visible = landing < 1
      route.bead.scale.setScalar(arriving * (1 - landing))
      route.glow.uniforms.uPulse.value = 1 + landing * 1.4
      route.glow.uniforms.uAlpha.value = arriving * (1 - landing * landing)
    }
    if (now >= nextSpawn) {
      spawnRoute(now)
      nextSpawn = now + 1.1 + Math.random() * 1.5
    }
  }

  let disposed = false, visible = false, lost = false, raf = 0, last = 0, time = 0
  let turn = initialTurn, tilt = initialTilt, pointerId: number | null = null, lastX = 0, lastY = 0, radius = 400
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let reduceMotion = reduced.matches
  const pointerTarget = new THREE.Vector2(-1000, -1000)
  const pointerCurrent = dotMaterial.uniforms.uPointer.value
  let hoverTarget = 0, hoverStrength = 0
  const hoverTrail = Array.from({ length: hoverTrailLength }, () => ({
    position: new THREE.Vector2(), born: -Infinity, strength: 0,
  }))
  let newestTrail = -1, trailFading = false, trailSamples = 0
  let frames = 0, seeded = false
  function seedRoutes() {
    // Open with a few payments already in flight so the first frame (and reduced motion) is never empty.
    seeded = true
    nextSpawn = time + 1.2
    for (const route of routes) { route.alive = false; for (const object of route.objects) object.visible = false }
    for (let i = 0; i < 3; i++) spawnRoute(time, .2 + i * .25)
  }
  function draw() {
    if (disposed || lost) return
    world.rotation.set(tilt, turn, -.06)
    if (!seeded) seedRoutes()
    updateRoutes(time)
    renderer.render(scene, camera)
    canvas.dataset.frame = String(++frames)
    canvas.dataset.rotation = `${tilt.toFixed(4)},${turn.toFixed(4)}`
    canvas.dataset.hover = hoverStrength.toFixed(3)
    canvas.dataset.trailSamples = String(trailSamples)
  }
  function canAnimate() { return visible && !document.hidden && !reduceMotion && !lost && pointerId === null }
  function hoverSettling() {
    return !reduceMotion && (trailFading || Math.abs(hoverStrength - hoverTarget) > .001 || (hoverTarget > 0 && pointerCurrent.distanceToSquared(pointerTarget) > .25))
  }
  function needsFrame() { return visible && !document.hidden && !lost && (canAnimate() || hoverSettling()) }
  function clearTrail() {
    newestTrail = -1; trailFading = false; trailSamples = 0
    for (let i = 0; i < hoverTrailLength; i++) {
      hoverTrail[i].born = -Infinity
      hoverTrail[i].strength = 0
      dotMaterial.uniforms.uTrail.value[i].z = 0
    }
  }
  function updateTrail() {
    if (reduceMotion) { clearTrail(); return }
    const now = performance.now() / 1000
    if (hoverTarget && hoverStrength > .01) {
      // Reuse a fixed pool. A stationary pointer refreshes just the newest sample.
      if (newestTrail < 0 || hoverTrail[newestTrail].position.distanceToSquared(pointerCurrent) > 9) {
        newestTrail = (newestTrail + 1) % hoverTrailLength
      }
      const tip = hoverTrail[newestTrail]
      tip.position.copy(pointerCurrent)
      tip.born = now
      tip.strength = hoverStrength
    }
    trailFading = false; trailSamples = 0
    for (let i = 0; i < hoverTrailLength; i++) {
      const sample = hoverTrail[i]
      const fade = 1 - THREE.MathUtils.smoothstep(now - sample.born, .15, hoverTrailLifetime)
      const strength = fade * sample.strength
      const active = strength > .001
      dotMaterial.uniforms.uTrail.value[i].set(sample.position.x, sample.position.y, active ? strength : 0)
      if (active) {
        trailSamples++
        if (i !== newestTrail || !hoverTarget) trailFading = true
      }
    }
  }
  function updateHover(dt: number) {
    // Screen-space falloff keeps the interaction circular at any aspect ratio or DPR.
    pointerCurrent.lerp(pointerTarget, reduceMotion ? 1 : 1 - Math.exp(-dt / .075))
    hoverStrength = THREE.MathUtils.lerp(hoverStrength, hoverTarget, reduceMotion ? 1 : 1 - Math.exp(-dt / (hoverTarget ? .14 : .22)))
    if (Math.abs(hoverStrength - hoverTarget) <= .001) hoverStrength = hoverTarget
    if (pointerCurrent.distanceToSquared(pointerTarget) <= .25) pointerCurrent.copy(pointerTarget)
    dotMaterial.uniforms.uHoverStrength.value = hoverStrength
    updateTrail()
  }
  function clearHover() {
    hoverTarget = 0; hoverStrength = 0
    dotMaterial.uniforms.uHoverStrength.value = 0
    clearTrail()
  }
  function tick(now: number) {
    raf = 0
    if (disposed || !needsFrame()) return
    if (now - last >= 1000 / 60) {
      const dt = Math.min((now - last) / 1000, .08)
      last = now
      if (canAnimate()) { time += dt; turn += dt * .018 }
      updateHover(dt)
      draw()
    }
    if (needsFrame()) raf = requestAnimationFrame(tick)
  }
  function sync() {
    cancelAnimationFrame(raf)
    raf = 0
    if (disposed) return
    if (!visible || document.hidden || lost) clearHover()
    if (reduceMotion) updateHover(0)
    const running = canAnimate()
    canvas.dataset.motion = running ? 'running' : 'still'
    if (visible && !document.hidden) draw()
    if (needsFrame()) { last = performance.now(); raf = requestAnimationFrame(tick) }
  }
  function resize() {
    if (disposed || lost) return
    const w = stage.clientWidth, h = stage.clientHeight
    if (!w || !h) return
    const dpr = Math.min(devicePixelRatio, w < 600 ? 1.5 : 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    dotMaterial.uniforms.uViewport.value.set(w, h)
    baseHoverRadius = THREE.MathUtils.clamp(w * .195, 195, 450)
    dotMaterial.uniforms.uHoverRadius.value = baseHoverRadius * appearance.radius / 100
    canvas.dataset.hoverPixels = dotMaterial.uniforms.uHoverRadius.value.toFixed(1)
    clearHover()
    // Fill narrow viewports edge to edge, but cap the sphere on desktop so it reads as a globe
    // rather than a horizon. Anchor the top into the masked stage with room for lifted routes.
    radius = w < 600 ? Math.max(270, w * .74) : Math.min(w * .54, maxRadius)
    camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2
    camera.position.z = radius * 3
    camera.far = radius * 6
    camera.updateProjectionMatrix()
    const centerY = radius + Math.round(radius * .08)
    world.position.y = h / 2 - centerY
    world.scale.setScalar(radius)
    dotMaterial.uniforms.uDpr.value = dpr
    const glowScale = THREE.MathUtils.clamp(w / 1440, .8, 2.5)
    for (const material of glowMaterials) { material.uniforms.uDpr.value = dpr; material.uniforms.uSize.value = 28 * glowScale }
    // Grow gradually on wide monitors while retaining the fine dotted texture.
    const baseSize = Math.min(3.5, Math.max(2.5, radius / 220))
    const monitorSize = Math.max(2.5, w / 360)
    baseDotSize = w < 600 ? 2.15 : THREE.MathUtils.lerp(baseSize, monitorSize, .5)
    dotMaterial.uniforms.uSize.value = baseDotSize * appearance.size / 100
    canvas.dataset.dotPixels = dotMaterial.uniforms.uSize.value.toFixed(3)
    draw()
  }
  function setAppearance(value: GlobeAppearance) {
    appearance = normalizeAppearance(value)
    if (appearance.density > 100) void loadExtraLayer()
    dotMaterial.uniforms.uSize.value = baseDotSize * appearance.size / 100
    dotMaterial.uniforms.uDensity.value = appearance.density / 200
    dotMaterial.uniforms.uHoverRadius.value = baseHoverRadius * appearance.radius / 100
    let count = 0
    for (let i = 4; i < data.length; i += 5) if (data[i] / 32767 <= appearance.density / 200) count++
    canvas.dataset.points = String(count)
    canvas.dataset.dotSize = String(appearance.size)
    canvas.dataset.dotDensity = String(appearance.density)
    canvas.dataset.hoverRadius = String(appearance.radius)
    canvas.dataset.hoverPixels = dotMaterial.uniforms.uHoverRadius.value.toFixed(1)
    canvas.dataset.dotPixels = dotMaterial.uniforms.uSize.value.toFixed(3)
    if (visible && !document.hidden) draw()
  }
  function endDrag(event?: PointerEvent) {
    if (pointerId === null || (event && event.pointerId !== pointerId)) return
    const id = pointerId
    pointerId = null
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
    canvas.dataset.dragging = 'false'
    sync()
  }
  function down(event: PointerEvent) {
    if (pointerId !== null || !event.isPrimary || event.button !== 0 || lost) return
    if (event.pointerType === 'touch') clearHover()
    pointerId = event.pointerId
    lastX = event.clientX; lastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
    canvas.dataset.dragging = 'true'
    sync()
  }
  function move(event: PointerEvent) {
    if (disposed || lost) return
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left, y = rect.bottom - event.clientY
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height
      if (!hoverTarget && !hoverStrength) pointerCurrent.set(x, y)
      pointerTarget.set(x, y)
      hoverTarget = inside ? 1 : 0
      if (reduceMotion) { updateHover(0); draw() }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) }
    } else if (hoverTarget || hoverStrength) {
      clearHover()
      draw()
    }
    if (event.pointerId !== pointerId) return
    turn += (event.clientX - lastX) / radius * 1.35
    tilt = THREE.MathUtils.clamp(tilt + (event.clientY - lastY) / radius, -1.15, 1.15)
    lastX = event.clientX; lastY = event.clientY
    draw()
  }
  function leave() { hoverTarget = 0; sync() }
  function key(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') { turn = initialTurn; tilt = initialTilt; time = 0; seeded = false; draw(); return }
    const step = event.shiftKey ? .24 : .10
    if (event.key === 'ArrowLeft') turn -= step
    if (event.key === 'ArrowRight') turn += step
    if (event.key === 'ArrowUp') tilt -= step
    if (event.key === 'ArrowDown') tilt += step
    tilt = THREE.MathUtils.clamp(tilt, -1.15, 1.15)
    draw()
  }
  function preferenceChanged(event: MediaQueryListEvent) { reduceMotion = event.matches; sync() }
  function contextLost(event: Event) { event.preventDefault(); lost = true; canvas.dataset.context = 'lost'; endDrag(); sync() }
  function contextRestored() { lost = false; canvas.dataset.context = 'ready'; resize(); sync() }
  const resizeObserver = new ResizeObserver(resize)
  const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) endDrag(); sync() })
  resizeObserver.observe(stage)
  visibilityObserver.observe(stage)
  document.addEventListener('visibilitychange', sync)
  window.addEventListener('blur', leave)
  window.addEventListener('scroll', leave, { passive: true })
  reduced.addEventListener('change', preferenceChanged)
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerenter', move)
  canvas.addEventListener('pointerleave', leave)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('pointercancel', leave)
  canvas.addEventListener('lostpointercapture', endDrag)
  canvas.addEventListener('keydown', key)
  canvas.addEventListener('webglcontextlost', contextLost)
  canvas.addEventListener('webglcontextrestored', contextRestored)
  canvas.dataset.renderer = 'three-webgl'
  canvas.dataset.context = 'ready'
  setAppearance(appearance)
  resize()

  return {
    setAppearance,
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(raf)
      resizeObserver.disconnect(); visibilityObserver.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('blur', leave)
      window.removeEventListener('scroll', leave)
      reduced.removeEventListener('change', preferenceChanged)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerenter', move)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('pointercancel', leave)
      canvas.removeEventListener('lostpointercapture', endDrag)
      canvas.removeEventListener('keydown', key)
      canvas.removeEventListener('webglcontextlost', contextLost)
      canvas.removeEventListener('webglcontextrestored', contextRestored)
      if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId)
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => {
        if ('geometry' in object) geometries.add(object.geometry as THREE.BufferGeometry)
        if ('material' in object) {
          const material = object.material as THREE.Material | THREE.Material[]
          ;(Array.isArray(material) ? material : [material]).forEach(item => materials.add(item))
        }
      })
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose())
      routeMaterial.dispose(); routeHaloMaterial.dispose(); glowMaterial.dispose()
      renderer.dispose()
      canvas.dataset.motion = 'still'
    },
  }
}
