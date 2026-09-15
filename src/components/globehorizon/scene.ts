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

class PaymentArc extends THREE.Curve<THREE.Vector3> {
  private angle: number
  constructor(private a: THREE.Vector3, private b: THREE.Vector3, private lift: number) {
    super()
    this.angle = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    return target.copy(this.a).multiplyScalar(Math.sin((1 - t) * this.angle))
      .addScaledVector(this.b, Math.sin(t * this.angle)).divideScalar(Math.sin(this.angle))
      .normalize().multiplyScalar(1.007 + this.lift * Math.sin(Math.PI * t))
  }
}

/** Genuine WebGL geometry: one point cloud, a depth-only sphere, and four routes. */
export async function createGlobeScene(canvas: HTMLCanvasElement, stage: HTMLElement, signal: AbortSignal): Promise<GlobeScene> {
  const response = await fetch('/globehorizon/earth-points-v2.bin', { signal })
  if (!response.ok) throw new Error('Globe geography unavailable')
  const data = new Int16Array(await response.arrayBuffer())
  signal.throwIfAborted()
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
  const buffer = new THREE.InterleavedBuffer(data, 5)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0, true))
  geometry.setAttribute('land', new THREE.InterleavedBufferAttribute(buffer, 1, 3, true))
  geometry.setAttribute('rank', new THREE.InterleavedBufferAttribute(buffer, 1, 4, true))
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
  world.add(new THREE.Points(geometry, dotMaterial))

  const cities = {
    ny: unit(40.71, -74.01), london: unit(51.51, -.13), berlin: unit(52.52, 13.4),
    dubai: unit(25.2, 55.27), singapore: unit(1.35, 103.82), sao: unit(-23.55, -46.63),
  }
  const specifications = [
    [cities.ny, cities.london, .17], [cities.london, cities.dubai, .12],
    [cities.berlin, cities.singapore, .16], [cities.ny, cities.sao, .14],
  ] as const
  // Analytic halos stay crisp at any resolution, without textures or a bloom pass.
  const glowGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()])
  const glowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 28 }, uDpr: { value: 1 }, uGold: { value: new THREE.Color('#f4ce80') } },
    vertexShader: `uniform float uSize; uniform float uDpr; void main() {
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=uSize*uDpr;
    }`,
    fragmentShader: `uniform vec3 uGold; void main() {
      float r=length(gl_PointCoord-.5)*2.0;
      float halo=exp(-r*r*5.0)*(1.0-smoothstep(.6,1.0,r));
      gl_FragColor=vec4(uGold,halo*.62);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  })
  const routeGlowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGold: { value: new THREE.Color('#e8bc70') } },
    vertexShader: `varying float vFacing; void main() {
      vFacing=abs(normalize(normalMatrix*normal).z);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }`,
    fragmentShader: `uniform vec3 uGold; varying float vFacing; void main() {
      gl_FragColor=vec4(uGold,pow(vFacing,3.0)*.23);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  })
  const routeMaterial = new THREE.LineBasicMaterial({ color: '#ecd09b', transparent: true, opacity: .78, depthWrite: false })
  const beadGeometry = new THREE.SphereGeometry(.004, 8, 6)
  const beadMaterial = new THREE.MeshBasicMaterial({ color: '#fff4db' })
  const routes = specifications.map(([a, b, lift], index) => {
    const curve = new PaymentArc(a, b, lift)
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(96)), routeMaterial))
    world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 96, .003, 8, false), routeGlowMaterial))
    const bead = new THREE.Mesh(beadGeometry, beadMaterial)
    bead.add(new THREE.Points(glowGeometry, glowMaterial))
    world.add(bead)
    return { curve, bead, phase: .12 + index * .22 }
  })
  for (const point of Object.values(cities)) {
    const marker = new THREE.Mesh(beadGeometry, beadMaterial)
    marker.position.copy(point).multiplyScalar(1.008)
    marker.scale.setScalar(.85)
    world.add(marker)
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
  let frames = 0
  function draw() {
    if (disposed || lost) return
    world.rotation.set(tilt, turn, -.06)
    for (const route of routes) route.bead.position.copy(route.curve.getPoint((time * .055 + route.phase) % 1))
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
    if (now - last >= 1000 / 30) {
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
    // Expand the sphere beyond the viewport edges without stretching geography.
    // Keep the top of the horizon anchored 32px into the existing masked stage.
    radius = w < 600 ? Math.max(270, w * .74) : w * .54
    camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2
    camera.position.z = radius * 3
    camera.far = radius * 6
    camera.updateProjectionMatrix()
    const centerY = radius + 32
    world.position.y = h / 2 - centerY
    world.scale.setScalar(radius)
    dotMaterial.uniforms.uDpr.value = dpr
    glowMaterial.uniforms.uDpr.value = dpr
    const glowScale = THREE.MathUtils.clamp(w / 1440, .8, 2.5)
    glowMaterial.uniforms.uSize.value = 28 * glowScale
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
    if (event.key === 'Home') { turn = initialTurn; tilt = initialTilt; time = 0; draw(); return }
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
      renderer.dispose()
      canvas.dataset.motion = 'still'
    },
  }
}
