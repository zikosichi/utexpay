import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { bronzeSurface, inlay, solid, pedestalSolid, pedestalInlay } from './surfaces'
import { display, label, seatOnPedestal } from './details'
import { bankCard } from './card'
import { pedestalReflection } from './reflections'
import { DEFAULTS, viewAngles, type StudioOptions } from './settings'
export interface StudioScene {
  update: (options: StudioOptions) => void
  move: (x: number, y: number) => void
  reset: () => void
  replayEntrance: () => void
  dispose: () => void
}

export async function createStudioScene(canvas: HTMLCanvasElement, onReady: () => void): Promise<StudioScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setClearColor(0x000000, 0)
  renderer.localClippingEnabled = true
  let disposed = false, frame = 0, visible = !document.hidden
  const resources: { dispose: () => void }[] = []
  try {
    const loader = new THREE.TextureLoader()
    const loaded = await Promise.allSettled([loader.loadAsync('/projection-blocks.png')])
    for (const item of loaded) if (item.status === 'fulfilled') resources.push(item.value)
    const failed = loaded.find((item) => item.status === 'rejected')
    if (failed?.status === 'rejected') throw failed.reason
    const [source] = loaded.map((item) => (item as PromiseFulfilledResult<THREE.Texture>).value)
    for (const t of [source]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()) }
    // Canvas typography is built after fonts resolve, for identical metrics on
    // first load and subsequent visits (including a slow network).
    await Promise.allSettled([document.fonts.load('400 32px "DM Sans"'), document.fonts.load('400 32px "IBM Plex Mono"')])
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 2.3, 5, 100)
    const assembly = new THREE.Group(); scene.add(assembly)
    const bronze: THREE.ShaderMaterial[] = [], details = new THREE.Group(), trims = new THREE.Group()
    assembly.add(details, trims)
    const steps: { root: THREE.Group; details: THREE.Group; trim: THREE.Mesh; height: number }[] = []
    const emergencePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const clipAtPedestal = (object: THREE.Object3D) => object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      for (const m of Array.isArray(child.material) ? child.material : [child.material]) m.clippingPlanes = [emergencePlane]
    })
    RectAreaLightUniformsLib.init()
    const env = new THREE.Scene(); env.background = new THREE.Color('#161411')
    for (const [pos, scale, intensity] of [
      [[-8, 12, 10], [18, 9, 1], 2.3], [[10, 7, -5], [5, 12, 1], 2.0], [[-14, 3, -2], [3, 8, 1], .65],
      [[-7, 3, 16], [3.5, 11, 1], .8], [[7, 2, 18], [2, 10, 1], .85],
      // The front-facing gold reflects below the camera's eyeline.
      // A low strip and broad fill keep that metal luminous as it turns.
      [[0, -4.5, 18], [24, 2.8, 1], 3.2], [[-1, -7, 20], [27, 13, 1], .9],
    ] as [[number, number, number], [number, number, number], number][]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity * .88, intensity * .7), side: THREE.DoubleSide }))
      panel.position.set(...pos); panel.scale.set(...scale); panel.lookAt(0, 1, 0); env.add(panel)
    }
    const pmrem = new THREE.PMREMGenerator(renderer), environment = pmrem.fromScene(env, .025, .1, 100)
    scene.environment = environment.texture; resources.push(environment)
    pmrem.dispose()
    env.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
    scene.add(new THREE.AmbientLight('#d9c5a0', .5))
    const key = new THREE.DirectionalLight('#ffe7bb', 2.2); key.position.set(-5, 10, 10); scene.add(key)
    const cardSoftbox = new THREE.RectAreaLight('#fff0d0', 2.8, 3, 5)
    cardSoftbox.position.set(-2.7, 3.2, 5); cardSoftbox.lookAt(2.08, 1.4, 1.14); scene.add(cardSoftbox)
    const gold = new THREE.MeshPhysicalMaterial({
      color: '#dfbc80', vertexColors: true, metalness: 1, roughness: .22,
      clearcoat: .22, clearcoatRoughness: .2, envMapIntensity: 1.05,
    })
    gold.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight /= (1. + outgoingLight * .55);\n#include <opaque_fragment>')
    }
    gold.customProgramCacheKey = () => 'studio-metal-inlay-v1'
    const blockMin = Array.from({ length: 3 }, () => new THREE.Vector3())
    const blockMax = Array.from({ length: 3 }, () => new THREE.Vector3())
    const specs = [
      { x: -5, w: 5.04, h: 3.15, d: 2.35, front: .68, panel: [3.03, 1.98], name: 'PERSONAL' },
      { x: 0, w: 5.04, h: 3.92, d: 2.35, front: .735, panel: [3.18, 2.53], name: 'BUSINESS' },
      { x: 5, w: 5.04, h: 4.67, d: 2.35, front: .79, panel: [3.13, 3.13], name: 'PAYMENTS' },
    ]
    specs.forEach((b, i) => {
      const root = new THREE.Group(), stepDetails = new THREE.Group(); assembly.add(root); root.add(stepDetails)
      const m = bronzeSurface(source, [b.w, b.h, b.d], i, environment); bronze.push(m)
      // The lower top runs into the taller neighbour. Its hidden right
      // corner stays square, eliminating the notch between rounded boxes.
      const rightRadius = i === 2 ? .22 : 0
      const body = new THREE.Mesh(solid(b.w, b.h, b.d, .22, rightRadius), m)
      body.position.set(b.x, b.h / 2, b.front - b.d / 2); root.add(body)
      const stepGold = gold.clone()
      stepGold.onBeforeCompile = gold.onBeforeCompile; stepGold.customProgramCacheKey = gold.customProgramCacheKey
      const edge = inlay(b.w, b.h, .22, b.front, stepGold, rightRadius)
      edge.position.x = b.x; edge.position.y = b.h / 2; root.add(edge); clipAtPedestal(edge)
      const [w, h] = b.panel, screen = display(i, w, h)
      screen.position.set(b.x + (i === 1 ? -.32 : 0), h / 2 + .18, b.front + .026); stepDetails.add(screen)
      const lettering = label(b.name, 2.78)
      lettering.position.set(b.x, b.h - .46, b.front + .024); stepDetails.add(lettering); clipAtPedestal(stepDetails)
      steps.push({ root, details: stepDetails, trim: edge, height: b.h })
      blockMin[i].set(b.x - b.w / 2, 0, b.front - b.d)
      blockMax[i].set(b.x + b.w / 2, b.h, b.front)
    })
    // Extra shelf depth is added only at the front; the back remains aligned.
    const baseDims: [number, number, number] = [15.65, 1.35, 3.7]
    const baseZ = .04
    const baseMat = bronzeSurface(source, baseDims, 3, environment); bronze.push(baseMat)
    const blockSize = specs.map((b) => new THREE.Vector3(b.w, b.h, b.d))
    const cardInverse = new THREE.Matrix4()
    bronze.forEach((material) => {
      material.uniforms.uBlockMin.value = blockMin; material.uniforms.uBlockMax.value = blockMax
      material.uniforms.uBlockSize.value = blockSize; material.uniforms.uCardInverse.value = cardInverse
    })
    const base = new THREE.Mesh(pedestalSolid(...baseDims), baseMat)
    base.position.set(.02, -.675, baseZ); assembly.add(base)
    const baseEdge = pedestalInlay(baseDims[0], baseDims[2], gold)
    baseEdge.position.set(.02, 0, baseZ); trims.add(baseEdge)
    const reflection = pedestalReflection(base); resources.push(reflection)
    const card = bankCard(); card.position.set(2.08, 0, 1.04); details.add(card)
    clipAtPedestal(card)
    // Seat the actual rotated metal core on the slab: no floating lower edge.
    const wallFront = Math.max(...specs.map((b) => b.front))
    seatOnPedestal(card, wallFront)
    const cardRest = card.position.clone(), cardRotation = card.quaternion.clone()
    const cardStartRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.26, -.9, -.16))
    const entranceBounds = new THREE.Box3()
    // Local contact shadow: translucent geometry, attached to the slab. There
    // is no depth-grid smearing or expensive per-frame shadow-map render.
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 256; shadowCanvas.height = 128
    const sctx = shadowCanvas.getContext('2d')!
    const shadowGradient = sctx.createRadialGradient(128, 64, 5, 128, 64, 120)
    shadowGradient.addColorStop(0, 'rgba(0,0,0,.65)'); shadowGradient.addColorStop(1, 'rgba(0,0,0,0)')
    sctx.fillStyle = shadowGradient; sctx.fillRect(0, 0, 256, 128)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas); resources.push(shadowTexture)
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.05, .52), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(2.08, .004, cardRest.z + .14); details.add(shadow)

    let options: StudioOptions = { ...DEFAULTS }
    let tx = 0, ty = 0, x = 0, y = 0, previous = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const target = new THREE.Vector3(0, 1.65, 0)
    const entranceDuration = 2.45
    let entranceTime = 0, started = false
    const easeOut = (value: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(value, 0, 1), 4)
    function poseEntrance(time: number) {
      for (const [i, step] of steps.entries()) {
        const progress = easeOut((time - .12 - i * .18) / 1.45)
        step.root.position.y = -(step.height + .12) * (1 - progress)
        blockMax[i].y = Math.max(0, step.height + step.root.position.y)
      }
      const progress = easeOut((time - .85) / 1.5)
      card.position.copy(cardRest)
      card.position.y -= 2.9 * (1 - progress)
      card.position.z += .35 * (1 - progress)
      card.quaternion.slerpQuaternions(cardStartRotation, cardRotation, progress)
      if (progress < 1) {
        card.updateWorldMatrix(true, true)
        entranceBounds.setFromObject(card, true)
        card.position.z += Math.max(0, wallFront + .09 - entranceBounds.min.z)
      }
      card.updateWorldMatrix(true, false)
      cardInverse.copy(card.matrixWorld).invert()
      bronze.forEach((material) => { material.uniforms.uCardVisible.value = options.screens && !options.clay ? progress : 0 })
      shadow.material.opacity = progress * progress
    }
    const framingPoints: THREE.Vector3[] = []
    for (const box of [...specs.map((b) => ({ x: b.x, y: b.h / 2, z: b.front - b.d / 2, w: b.w, h: b.h, d: b.d })),
      { x: .02, y: -.675, z: baseZ, w: baseDims[0], h: baseDims[1], d: baseDims[2] }]) {
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
        framingPoints.push(new THREE.Vector3(box.x + dx * box.w / 2, box.y + dy * box.h / 2, box.z + dz * box.d / 2))
      }
    }
    function cameraPose(yaw: number, pitch: number) {
      camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * 40, target.y + Math.sin(pitch) * 40, Math.cos(yaw) * Math.cos(pitch) * 40)
      camera.lookAt(target); camera.rotateZ(THREE.MathUtils.degToRad(options.baseRoll)); camera.updateMatrixWorld()
    }
    function fitCamera() {
      const viewWidth = camera.aspect < 1.55 ? 17.8 : 17.5
      const baseTan = viewWidth / (2 * 40 * camera.aspect)
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(baseTan)); camera.updateProjectionMatrix()
      // Refit the complete motion envelope around the chosen starting pose.
      let fit = 1
      for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
        const angle = viewAngles(options, dx, dy)
        cameraPose(THREE.MathUtils.degToRad(angle.yaw), THREE.MathUtils.degToRad(angle.tilt))
        for (const point of framingPoints) {
          const p = point.clone().project(camera)
          fit = Math.max(fit, Math.abs(p.x) / .965, Math.abs(p.y) / .965)
        }
      }
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(baseTan * fit)); camera.updateProjectionMatrix()
    }
    function resize() {
      const rect = canvas.parentElement!.getBoundingClientRect()
      const w = Math.max(1, rect.width), h = Math.max(1, rect.height)
      renderer.setSize(w, h, false); camera.aspect = w / h
      fitCamera(); invalidate()
    }
    function render(now: number) {
      frame = 0
      if (disposed || !visible) return
      const delta = previous ? Math.min((now - previous) / 1000, .05) : .016; previous = now
      entranceTime = reducedMotion.matches ? entranceDuration : Math.min(entranceDuration, entranceTime + delta)
      poseEntrance(entranceTime)
      const active = options.motion && !reducedMotion.matches
      const dx = active ? tx : 0, dy = active ? ty : 0
      const ease = 1 - Math.exp(-delta * 5.8)
      x += (dx - x) * ease; y += (dy - y) * ease
      const angle = viewAngles(options, x, y)
      const yaw = THREE.MathUtils.degToRad(angle.yaw)
      const pitch = THREE.MathUtils.degToRad(angle.tilt)
      cameraPose(yaw, pitch)
      if (!options.clay && options.reflections > 0) reflection.capture(renderer, scene, camera)
      renderer.render(scene, camera)
      canvas.dataset.yaw = THREE.MathUtils.radToDeg(yaw).toFixed(2)
      canvas.dataset.pitch = THREE.MathUtils.radToDeg(pitch).toFixed(2)
      canvas.dataset.roll = options.baseRoll.toFixed(2)
      canvas.dataset.entrance = entranceTime >= entranceDuration ? 'complete' : 'playing'
      if (entranceTime < entranceDuration || Math.abs(dx - x) + Math.abs(dy - y) > .00008) invalidate()
    }
    function invalidate() { if (started && !frame && !disposed && visible) frame = requestAnimationFrame(render) }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas.parentElement!)
    const onVisibility = () => { visible = !document.hidden; previous = 0; if (visible) invalidate(); else { cancelAnimationFrame(frame); frame = 0 } }
    const onReduced = () => invalidate()
    document.addEventListener('visibilitychange', onVisibility); reducedMotion.addEventListener('change', onReduced)
    resize()
    await renderer.compileAsync(scene, camera)
    poseEntrance(reducedMotion.matches ? entranceDuration : 0)
    started = true
    invalidate(); onReady()
    return {
      move(px, py) { tx = THREE.MathUtils.clamp(px, -1, 1); ty = THREE.MathUtils.clamp(py, -1, 1); invalidate() },
      reset() { tx = 0; ty = 0; invalidate() },
      replayEntrance() { entranceTime = 0; previous = 0; tx = 0; ty = 0; invalidate() },
      update(next) {
        const viewChanged = next.range !== options.range || next.baseYaw !== options.baseYaw || next.baseTilt !== options.baseTilt || next.baseRoll !== options.baseRoll
        options = next; if (viewChanged) fitCamera()
        details.visible = next.screens && !next.clay; trims.visible = !next.clay
        steps.forEach((step) => { step.details.visible = next.screens && !next.clay; step.trim.visible = !next.clay })
        bronze.forEach((m) => { m.uniforms.uBrightness.value = next.brightness; m.uniforms.uReflections.value = next.reflections; m.uniforms.uClay.value = next.clay ? 1 : 0 }); invalidate()
      },
      dispose() {
        disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect()
        document.removeEventListener('visibilitychange', onVisibility); reducedMotion.removeEventListener('change', onReduced)
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
        scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return
          geometries.add(o.geometry)
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            materials.add(m)
            Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) textures.add(v) })
          }
        })
        geometries.forEach((g) => g.dispose()); textures.forEach((t) => t.dispose()); materials.forEach((m) => m.dispose())
        resources.forEach((r) => r.dispose()); renderer.dispose(); renderer.forceContextLoss()
      },
    }
  } catch (error) {
    resources.forEach((r) => r.dispose()); renderer.dispose(); renderer.forceContextLoss(); throw error
  }
}
