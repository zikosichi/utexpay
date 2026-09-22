import * as THREE from 'three'
import { createProjector, createStructureGeometry, imagePoint, HEIGHT_ADDED, createShelfPlane } from './geometry'
import { photographicMaterial } from './material'
import { DEFAULT_OPTIONS, ILLUMINATED_SOURCE, COMPOSITION_SCALE } from './config'
import type { PhotoScene } from './config'
import { createPhotoEnvironment } from './environment'
import { createLivePanels } from './livePanels'
import { addAccountCard } from './card'
import { decalMaterial, prepareDecalTexture } from '../photostructure/decals'
import { createPanelGeometries, PANEL_NAMES, PANEL_SURFACES, BLEED, panelImage } from './surfaces'

/** World units the stage shows across its width in the full view. The sculpture is about 14.2
    units wide and 6.2 tall, so 16.4 units of width and 7.6 of height frame it with a slim margin
    for the pointer rotation and the card shadow: the stage's width is, near enough, the
    sculpture's width, and the CSS breakpoints size the stage. Wider stages keep the 7.6-unit
    height (the sculpture centred, room at the sides); taller ones keep the width. */
function fullWorldWidth(width: number, height: number) {
  return Math.max(16.4, 7.6 * width / height)
}

export async function createPhotoScene(canvas: HTMLCanvasElement, source: HTMLImageElement, stage: HTMLElement, signal: AbortSignal, htmlPanels: HTMLElement): Promise<PhotoScene> {
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
  try {
    const loader = new THREE.TextureLoader()
    const loadTexture = async (url: string) => {
      const texture = await loader.loadAsync(url)
      if (disposed) { texture.dispose(); throw new DOMException('Scene disposed', 'AbortError') }
      resources.push(texture)
      return texture
    }
    const [, illuminated, panelTextures] = await Promise.all([
      source.decode(),
      loadTexture(ILLUMINATED_SOURCE),
      Promise.all(PANEL_NAMES.filter((name) => name.endsWith('-title')).map(async (name) => {
        const texture = await loadTexture(panelImage(name))
        const spec = PANEL_SURFACES[name]
        const expectedAspect = (spec.width+2*BLEED)/(spec.height+2*BLEED)
        const actualAspect = texture.image.width/texture.image.height
        if (Math.abs(actualAspect/expectedAspect-1) > .001) throw new Error(`Panel ${name} texture needs to be rebaked at its current size`)
        return [name, prepareDecalTexture(texture, renderer.capabilities.getMaxAnisotropy())] as const
      })),
    ])
    illuminated.colorSpace = THREE.SRGBColorSpace
    illuminated.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const image = new THREE.Texture(source)
    image.needsUpdate = true
    resources.push(image)
    if (signal.aborted) throw new DOMException('Scene cancelled', 'AbortError')
    image.colorSpace = THREE.SRGBColorSpace
    image.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const projector = createProjector(), camera = projector.clone()
    const environment = createPhotoEnvironment(projector)
    resources.push(environment)
    scene.add(environment.group)
    const material = photographicMaterial(image, illuminated, projector)
    const foundationMaterial = photographicMaterial(image, illuminated, projector, environment.floorPlane)
    resources.push(material, foundationMaterial)
    const sculpture = new THREE.Group()
    scene.add(sculpture)
    const geometries = createStructureGeometry(projector)
    resources.push(...geometries)
    const blocks = geometries.map((geometry) => new THREE.Mesh(geometry, geometry.name === 'Foundation' ? foundationMaterial : material))
    sculpture.add(...blocks)
    const card = await addAccountCard(renderer,scene,sculpture,createShelfPlane(projector),blocks,resources)
    if (signal.aborted) throw new DOMException('Scene cancelled', 'AbortError')
    const textureMap = new Map(panelTextures)
    const surfaces = createPanelGeometries(projector)
    const live = createLivePanels(htmlPanels,surfaces,renderer.capabilities.getMaxAnisotropy(),invalidate)
    resources.push(live)
    const decals = surfaces.map(({ name, geometry }) => {
      const panelMaterial = decalMaterial()
      panelMaterial.uniforms.uMap.value = textureMap.get(name) ?? live.textures.get(name)
      // Dynamic DOM reflections have no baked bleed; trim just this sampler.
      if (!name.endsWith('-title')) {
        panelMaterial.fragmentShader = panelMaterial.fragmentShader.replace('texture2D(uMap, vUv)', `texture2D(uMap, clamp((vUv * vec2(${PANEL_SURFACES[name].width+2*BLEED}., ${PANEL_SURFACES[name].height+2*BLEED}.) - vec2(${BLEED}.)) / vec2(${PANEL_SURFACES[name].width}., ${PANEL_SURFACES[name].height}.), 0., 1.))`)
      }
      const mesh = new THREE.Mesh(geometry, panelMaterial)
      mesh.name = name
      mesh.visible = name.endsWith('-title')
      mesh.renderOrder = 1
      resources.push(geometry, panelMaterial)
      return mesh
    })
    const decoration = new THREE.Group()
    decoration.add(...decals)
    sculpture.add(decoration)
    if (signal.aborted) throw new DOMException('Scene cancelled', 'AbortError')

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
    // Preserve the home-page camera, lifting its target half the added height.
    Object.values(focusPoints).forEach((point) => { point.y += HEIGHT_ADDED * .5 })
    // Stable reference framing places the overhead source above the headline.
    // It follows responsive layout, not pointer motion or studio close-ups.
    const lightingCamera = projector.clone()
    lightingCamera.position.add(focusPoints.full)
    lightingCamera.lookAt(focusPoints.full)
    lightingCamera.updateMatrixWorld()
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
    const sculptureViewport = new THREE.Vector4()
    let detailMix = DEFAULT_OPTIONS.focus === 'full' ? 0 : 1
    function framing() {
      const aspect = viewportWidth / viewportHeight
      const fullWidth = fullWorldWidth(viewportWidth, viewportHeight), detailWidth = Math.max(5.2, 5.5 * aspect)
      const settledWidth = THREE.MathUtils.lerp(fullWidth, detailWidth, detailMix)
      const introProgress = entranceProgress()
      const width = settledWidth / COMPOSITION_SCALE * THREE.MathUtils.lerp(1.18, 1, introProgress)
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
      live.update(camera, options.mode === 'photo', options.focus, entranceProgress() > .995, card.outline, card.shadowLight)
      camera.getWorldDirection(material.uniforms.uView.value).negate()
      foundationMaterial.uniforms.uView.value.copy(material.uniforms.uView.value)
      if (options.mode === 'photo') card.reflection.capture(renderer,camera)
      if (environment.group.visible && options.floorReflection > 0) {
        decals.forEach((decal) => { decal.material.uniforms.uLinearOutput.value = 1; decal.visible = true })
        environment.capture(renderer, scene, camera)
        decals.forEach((decal) => { decal.material.uniforms.uLinearOutput.value = 0; decal.visible = decal.name.endsWith('-title') })
      }
      // Draw the room over the whole hero, then preserve the sculpture's
      // original top/side crop even when a studio close-up is selected.
      const showSculpture = sculpture.visible, showSource = sourcePlane.visible
      sculpture.visible = false; sourcePlane.visible = false
      renderer.render(scene, camera)
      const showEnvironment = environment.group.visible
      environment.group.visible = false
      sculpture.visible = showSculpture; sourcePlane.visible = showSource
      renderer.autoClear = false
      renderer.setScissor(sculptureViewport)
      renderer.setScissorTest(true)
      renderer.render(scene, camera)
      renderer.setScissorTest(false)
      renderer.autoClear = true
      environment.group.visible = showEnvironment
      canvas.dataset.yaw = THREE.MathUtils.radToDeg(yaw - baseYaw).toFixed(3)
      canvas.dataset.pitch = THREE.MathUtils.radToDeg(pitch - basePitch).toFixed(3)
      canvas.dataset.card = 'metal'
      canvas.dataset.cardYaw = options.cardYaw.toFixed(1)
      canvas.dataset.cardPerspective = String(options.cardPerspective)
      canvas.dataset.cardLightYaw = options.cardLightYaw.toFixed(1)
      canvas.dataset.cardLightStrength = String(options.cardLightStrength)
      canvas.dataset.cardEye = String(options.cardEye)
      canvas.dataset.cardGrainSize = String(options.cardGrainSize)
      canvas.dataset.cardTextureStrength = String(options.cardTextureStrength)
      canvas.dataset.cardTextureRelief = String(options.cardTextureRelief)
      canvas.dataset.cardTextureRoughness = String(options.cardTextureRoughness)
      canvas.dataset.cardShadow = `${options.cardShadowYaw}/${options.cardShadowHeight}/${options.cardShadowStrength}`
      canvas.dataset.shelfReflection = options.mode === 'photo' ? 'card' : 'hidden'
      canvas.dataset.mode = options.mode
      canvas.dataset.framing = options.focus
      canvas.dataset.motion = reduced.matches ? 'reduced' : options.motion ? 'enabled' : 'paused'
      canvas.dataset.intro = introTime >= introDuration ? 'complete' : 'playing'
      canvas.dataset.environment = environment.group.visible ? 'studio' : 'hidden'
      canvas.dataset.lighting = options.lighting
      canvas.dataset.objectLight = String(material.uniforms.uLighting.value)
      canvas.dataset.backgroundLight = String(options.backgroundLight)
      canvas.dataset.lightSpread = String(options.lightSpread)
      canvas.dataset.floorReflection = String(options.floorReflection)
      canvas.dataset.overheadLight = String(options.lighting === 'illuminated' ? options.overheadLight : 0)
      if (introTime < introDuration || Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(detailTarget - detailMix) + focus.distanceTo(focusTarget) > .00005) invalidate()
    }
    function resize() {
      const bounds = canvas.getBoundingClientRect(), stageBounds = stage.getBoundingClientRect()
      viewportWidth = Math.max(1, stageBounds.width); viewportHeight = Math.max(1, stageBounds.height)
      const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height)
      renderer.setSize(width, height, false)
      sculptureViewport.set(stageBounds.left - bounds.left, 0, stageBounds.width, Math.max(1, bounds.bottom - stageBounds.top))
      // Extend the canvas over the whole hero while preserving the original
      // stage's exact composition, scale and responsive camera framing.
      camera.setViewOffset(viewportWidth, viewportHeight, bounds.left - stageBounds.left, bounds.top - stageBounds.top, width, height)
      const fullWidth = fullWorldWidth(viewportWidth, viewportHeight) / COMPOSITION_SCALE
      lightingCamera.left = -fullWidth / 2; lightingCamera.right = fullWidth / 2
      lightingCamera.top = fullWidth * viewportHeight / viewportWidth / 2; lightingCamera.bottom = -lightingCamera.top
      lightingCamera.setViewOffset(viewportWidth, viewportHeight, bounds.left - stageBounds.left, bounds.top - stageBounds.top, width, height)
      environment.frameOverhead(lightingCamera)
      environment.resize(width, height)
      card.reflection.resize(width, height)
      const targetWorldWidth = (options.focus === 'full' ? fullWorldWidth(viewportWidth, viewportHeight) : Math.max(5.2,5.5*viewportWidth/viewportHeight)) / COMPOSITION_SCALE
      live.resize(width,height,viewportWidth,targetWorldWidth,{ top: stageBounds.top-bounds.top, left: stageBounds.left-bounds.left, right: bounds.right-stageBounds.right })
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
    resizeObserver.observe(stage)
    // A font swap can move the stage without changing its width or height.
    void document.fonts.ready.then(() => { if (!disposed) resize() })
    resize()
    pose(baseYaw, basePitch)
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
        const focusChanged = options.focus !== next.focus
        if (options.cardYaw !== next.cardYaw || options.cardPerspective !== next.cardPerspective) card.setPose(next.cardYaw,next.cardPerspective)
        if (options.cardLightYaw !== next.cardLightYaw || options.cardLightStrength !== next.cardLightStrength) card.setLight(next.cardLightYaw,next.cardLightStrength)
        card.setAppearance(next)
        options = next
        material.uniforms.uGeometry.value = next.mode === 'mesh' ? 1 : 0
        material.uniforms.uResponse.value = next.response
        material.uniforms.uLighting.value = next.lighting === 'illuminated' ? next.backgroundLight : 0
        foundationMaterial.uniforms.uGeometry.value = material.uniforms.uGeometry.value
        foundationMaterial.uniforms.uResponse.value = next.response
        foundationMaterial.uniforms.uLighting.value = material.uniforms.uLighting.value
        environment.update(next)
        sculpture.visible = next.mode !== 'source'
        sourcePlane.visible = next.mode === 'source'
        decoration.visible = next.mode === 'photo'
        card.setGeometryView(next.mode === 'mesh')
        if (focusChanged) resize()
        invalidate()
      },
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}
