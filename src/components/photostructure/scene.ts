import * as THREE from 'three'
import { createProjector, createStructureGeometry, imagePoint } from './geometry'
import { photographicMaterial } from './material'
import { DEFAULT_OPTIONS } from './config'
import type { PhotoScene } from './config'
import type { PersonalVariant } from './personalVariants'
import { createDecal, paintDecal, prepareDecalTexture } from './decals'
import { PANEL_SURFACES, PERSONAL_SURFACES, panelImage, personalPanel } from './surfaces'
import type { PanelName } from './surfaces'

export async function createPhotoScene(canvas: HTMLCanvasElement, source: HTMLImageElement, signal: AbortSignal): Promise<PhotoScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor('#000000', 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  const scene = new THREE.Scene()
  const resources: { dispose(): void }[] = []
  let frame = 0, disposed = false, previous = 0
  let resizeObserver: ResizeObserver | undefined
  let removeListeners = () => {}
  const dispose = () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    removeListeners()
    resources.forEach((resource) => resource.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
  }
  // Baked panel images (see panels.tsx). They load alongside the photograph;
  // a missing one leaves its face bare rather than failing the whole scene.
  const loader = new THREE.TextureLoader()
  const panels = new Map<PanelName, Promise<THREE.Texture>>()
  const loadPanel = (name: PanelName) => {
    let pending = panels.get(name)
    if (!pending) {
      pending = loader.loadAsync(panelImage(name)).then((texture) => {
        if (disposed) { texture.dispose(); throw new DOMException('Scene disposed', 'AbortError') }
        resources.push(texture)
        return prepareDecalTexture(texture, renderer.capabilities.getMaxAnisotropy())
      })
      pending.catch((error: unknown) => { if (!disposed) console.warn(`Panel image ${panelImage(name)} did not load:`, error) })
      panels.set(name, pending)
    }
    return pending
  }
  try {
    const initialPanels = (['personal-title', 'business-title', 'business-panel', 'payments-title', 'payments-panel', personalPanel(DEFAULT_OPTIONS.layout)] as PanelName[])
      .map((name) => loadPanel(name).then((texture) => [name, texture] as const))
    await source.decode()
    const image = new THREE.Texture(source)
    image.needsUpdate = true
    resources.push(image)
    if (signal.aborted) throw new DOMException('Scene cancelled', 'AbortError')
    image.colorSpace = THREE.SRGBColorSpace
    image.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const projector = createProjector(), camera = projector.clone()
    const material = photographicMaterial(image, projector)
    resources.push(material)
    const sculpture = new THREE.Group()
    scene.add(sculpture)
    const geometries = createStructureGeometry(projector)
    resources.push(...geometries)
    const blocks = geometries.map((geometry) => new THREE.Mesh(geometry, material))
    sculpture.add(...blocks)
    // One decal per calibrated surface. Personal has two panel profiles because
    // the Currency-inlays layout takes a wider patch of the face.
    const decals = {
      'personal-title': createDecal(blocks[0], projector, PANEL_SURFACES['personal-title']),
      personalPanel: createDecal(blocks[0], projector, PERSONAL_SURFACES.panel),
      personalInlays: createDecal(blocks[0], projector, PERSONAL_SURFACES.inlays),
      'business-title': createDecal(blocks[1], projector, PANEL_SURFACES['business-title']),
      'business-panel': createDecal(blocks[1], projector, PANEL_SURFACES['business-panel']),
      'payments-title': createDecal(blocks[2], projector, PANEL_SURFACES['payments-title']),
      'payments-panel': createDecal(blocks[2], projector, PANEL_SURFACES['payments-panel']),
    }
    const decoration = new THREE.Group()
    decoration.add(...Object.values(decals))
    sculpture.add(decoration)
    Object.values(decals).forEach((decal) => resources.push(decal.geometry, decal.material))
    let layoutRequest = 0
    function showLayout(layout: PersonalVariant) {
      const request = ++layoutRequest
      loadPanel(personalPanel(layout)).then((texture) => {
        if (request !== layoutRequest || disposed) return
        const [target, other] = layout === 'tiles' ? [decals.personalInlays, decals.personalPanel] : [decals.personalPanel, decals.personalInlays]
        paintDecal(target, texture)
        other.visible = false
        invalidate()
      }, () => {})
    }

    // A reference plane uses the identical framing. Switching views is a direct
    // comparison of the reconstructed silhouette against the supplied image.
    const sourceGeometry = new THREE.BufferGeometry()
    const corners: [number, number][] = [[0, 941], [1672, 941], [1672, 0], [0, 0]]
    sourceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap((p) => imagePoint(p, 0, projector).toArray()), 3))
    sourceGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
    sourceGeometry.setIndex([0, 1, 2, 0, 2, 3])
    const sourceMaterial = new THREE.MeshBasicMaterial({ map: image, toneMapped: false, side: THREE.DoubleSide })
    const sourcePlane = new THREE.Mesh(sourceGeometry, sourceMaterial)
    resources.push(sourceGeometry, sourceMaterial)
    sourcePlane.visible = false
    scene.add(sourcePlane)

    const focusPoints = {
      full: imagePoint([836, 582], 0, projector),
      personal: imagePoint([362, 599], 0, projector),
      business: imagePoint([865, 541], 0, projector),
      payments: imagePoint([1354, 498], 0, projector),
    }
    const focus = focusPoints[DEFAULT_OPTIONS.focus].clone()
    const baseYaw = THREE.MathUtils.degToRad(-12), basePitch = THREE.MathUtils.degToRad(16)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const introDuration = 1.45
    let introTime = 0
    const introEase = (value: number) => {
      const t = THREE.MathUtils.clamp(value, 0, 1)
      return 1 - Math.pow(1 - t, 4)
    }
    const entranceProgress = () => reduced.matches ? 1 : introEase(introTime / introDuration)
    let options = { ...DEFAULT_OPTIONS }, targetX = 0, targetY = 0, x = 0, y = 0
    let visible = !document.hidden, initialized = false, viewportWidth = 1, viewportHeight = 1
    let detailMix = DEFAULT_OPTIONS.focus === 'full' ? 0 : 1
    function framing() {
      const aspect = viewportWidth / viewportHeight
      const fullWidth = Math.max(19.7, 8.6 * aspect), detailWidth = Math.max(4.6, 4.8 * aspect)
      const settledWidth = THREE.MathUtils.lerp(fullWidth, detailWidth, detailMix)
      const introProgress = entranceProgress()
      const width = settledWidth * THREE.MathUtils.lerp(1.18, 1, introProgress)
      camera.left = -width / 2; camera.right = width / 2
      camera.top = width / aspect / 2; camera.bottom = -camera.top
      camera.updateProjectionMatrix()
    }
    const pose = (yaw: number, pitch: number) => {
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * 40, Math.sin(pitch) * 40, Math.cos(yaw) * Math.cos(pitch) * 40).add(focus)
      camera.lookAt(focus)
      camera.updateMatrixWorld()
    }
    function invalidate() {
      if (initialized && !frame && !disposed && visible) frame = requestAnimationFrame(render)
    }
    function render(time: number) {
      frame = 0
      if (disposed || !visible) return
      const dt = previous ? Math.min((time - previous) / 1000, .05) : 1 / 60
      previous = time
      introTime = reduced.matches ? introDuration : Math.min(introDuration, introTime + dt)
      const active = options.motion && !reduced.matches && options.mode !== 'source'
      const tx = active ? targetX : 0, ty = active ? targetY : 0
      const ease = 1 - Math.exp(-dt * 5.5)
      x += (tx - x) * ease
      y += (ty - y) * ease
      const detailTarget = options.focus === 'full' ? 0 : 1
      detailMix = reduced.matches ? detailTarget : detailMix + (detailTarget - detailMix) * ease
      const focusTarget = focusPoints[options.focus]
      if (reduced.matches) focus.copy(focusTarget)
      else focus.lerp(focusTarget, ease)
      framing()
      if (options.mode === 'source' || reduced.matches) { x = 0; y = 0 }
      const introTurn = 1 - entranceProgress()
      const yaw = baseYaw + x * THREE.MathUtils.degToRad(options.range) - THREE.MathUtils.degToRad(16) * introTurn
      const pitch = basePitch + y * THREE.MathUtils.degToRad(options.range * .36) + THREE.MathUtils.degToRad(3.5) * introTurn
      pose(yaw, pitch)
      camera.getWorldDirection(material.uniforms.uView.value).negate()
      renderer.render(scene, camera)
      canvas.dataset.yaw = THREE.MathUtils.radToDeg(yaw - baseYaw).toFixed(3)
      canvas.dataset.pitch = THREE.MathUtils.radToDeg(pitch - basePitch).toFixed(3)
      canvas.dataset.mode = options.mode
      canvas.dataset.framing = options.focus
      canvas.dataset.motion = reduced.matches ? 'reduced' : options.motion ? 'enabled' : 'paused'
      canvas.dataset.intro = introTime >= introDuration ? 'complete' : 'playing'
      if (introTime < introDuration || Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(detailTarget - detailMix) + focus.distanceTo(focusTarget) > .00005) invalidate()
    }
    function resize() {
      const { width, height } = canvas.getBoundingClientRect()
      viewportWidth = Math.max(1, width); viewportHeight = Math.max(1, height)
      renderer.setSize(Math.max(1, width), Math.max(1, height), false)
      framing()
      invalidate()
    }
    const onVisibility = () => {
      visible = !document.hidden; previous = 0
      if (visible) invalidate()
      else { cancelAnimationFrame(frame); frame = 0 }
    }
    const onReduced = () => { targetX = 0; targetY = 0; invalidate() }
    document.addEventListener('visibilitychange', onVisibility)
    reduced.addEventListener('change', onReduced)
    removeListeners = () => {
      document.removeEventListener('visibilitychange', onVisibility)
      reduced.removeEventListener('change', onReduced)
    }
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()
    pose(baseYaw, basePitch)
    for (const settled of await Promise.allSettled(initialPanels)) {
      if (settled.status !== 'fulfilled') continue
      const [name, texture] = settled.value
      if (name === personalPanel(DEFAULT_OPTIONS.layout)) paintDecal(DEFAULT_OPTIONS.layout === 'tiles' ? decals.personalInlays : decals.personalPanel, texture)
      else paintDecal(decals[name as Exclude<typeof name, `personal-${PersonalVariant}`>], texture)
    }
    if (signal.aborted) throw new DOMException('Scene cancelled', 'AbortError')
    renderer.compile(scene, camera)
    initialized = true
    render(performance.now())
    canvas.dataset.ready = 'true'
    return {
      move(px, py) { targetX = THREE.MathUtils.clamp(px, -1, 1); targetY = THREE.MathUtils.clamp(py, -1, 1); invalidate() },
      reset() { targetX = 0; targetY = 0; invalidate() },
      replayIntro() { introTime = 0; previous = 0; targetX = 0; targetY = 0; invalidate() },
      update(next) {
        const layoutChanged = next.layout !== options.layout
        options = next
        material.uniforms.uGeometry.value = next.mode === 'mesh' ? 1 : 0
        material.uniforms.uResponse.value = next.response
        sculpture.visible = next.mode !== 'source'
        sourcePlane.visible = next.mode === 'source'
        decoration.visible = next.mode === 'photo'
        if (layoutChanged) showLayout(next.layout)
        invalidate()
      },
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}
