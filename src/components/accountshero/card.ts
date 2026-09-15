import * as THREE from 'three'
import { bankCard } from '../herostudio/card'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { seatAccountCard } from './cardPlacement'
import { createCardShelfReflection } from './shelfReflection'
import { CARD_APPEARANCE_LIMITS, CARD_LIGHT_YAW_LIMIT, CARD_SHADOW_RADIUS, DEFAULT_CARD_APPEARANCE, DEFAULT_OPTIONS } from './config'
import type { CardAppearance } from './config'
import { taperAccountCard } from './cardPerspective'


/** Reuse the physical foil card; seat its actual vertices on this new shelf. */
export async function addAccountCard(
  renderer: THREE.WebGLRenderer, scene: THREE.Scene, sculpture: THREE.Group,
  shelf: THREE.Plane, blocks: THREE.Mesh[],
  resources: { dispose(): void }[],
) {
  await Promise.allSettled([document.fonts.load('400 32px "DM Sans"'), document.fonts.load('400 32px "IBM Plex Mono"')])
  const studio = new THREE.Scene()
  studio.background = new THREE.Color('#211b14')
  // The key light sits high and to the left, like the softbox that lit the
  // bronze photograph. The floor bounce is kept modest so the lower half of
  // the card reads darker than its top, matching the falloff on every block.
  for (const [x, y, z, w, h, intensity] of [
    [-8, 12, 10, 18, 9, 2.8], [10, 7, -5, 5, 12, 2],
    [-7, 3, 16, 3.5, 11, .8], [7, 2, 18, 2, 10, .85], [0, -4.5, 18, 24, 2.8, 1.3], [-1,-7,20,27,13,.45],
  ]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity * .88, intensity * .7), side: THREE.DoubleSide }))
    panel.position.set(x, y, z); panel.lookAt(0, 1, 0); studio.add(panel)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(studio, .025, .1, 100)
  scene.environment = environment.texture; resources.push(environment)
  pmrem.dispose()
  studio.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); (node.material as THREE.Material).dispose() } })
  scene.add(new THREE.AmbientLight('#e8d4ab', .5))
  const key = new THREE.DirectionalLight('#ffe9c6', 2.2); key.position.set(-5, 10, 10); scene.add(key)
  const fill = new THREE.DirectionalLight('#ffe2a0', .6); fill.position.set(8, 3, 7); scene.add(fill)
  RectAreaLightUniformsLib.init()
  const softbox = new THREE.RectAreaLight('#fff0d0',1.1,3,5)
  scene.add(softbox)
  const cardLight = { value: new THREE.Vector2() }
  function setLight(degrees: number, strength: number) {
    const yaw = THREE.MathUtils.clamp(Number.isFinite(degrees) ? degrees : DEFAULT_OPTIONS.cardLightYaw, -CARD_LIGHT_YAW_LIMIT, CARD_LIGHT_YAW_LIMIT)
    const power = THREE.MathUtils.clamp(Number.isFinite(strength) ? strength : DEFAULT_OPTIONS.cardLightStrength, 0, 2)
    const lightX = 2.28 + Math.tan(THREE.MathUtils.degToRad(yaw)) * 4.9
    softbox.position.set(lightX,-.5,6); softbox.lookAt(2.28,-.9,1.1)
    softbox.intensity = 1.1 * power
    cardLight.value.set(lightX + .3,power)
  }
  setLight(DEFAULT_OPTIONS.cardLightYaw,DEFAULT_OPTIONS.cardLightStrength)
  const card = bankCard({ glossyNetwork: true, texturedGold: true })
  if (card.grainTexture) resources.push(card.grainTexture)
  card.name = 'Gold UTEX card'
  const body = card.getObjectByName('Solid metal card') as THREE.Mesh
  const setPerspective = taperAccountCard(card,body)
  const cardPerspective = { value: DEFAULT_OPTIONS.cardPerspective }
  // The composition camera is orthographic, so Three would reflect the same
  // environment sample at every point of the flat face and the metal reads as
  // a sticker. A virtual eye a few units in front of the card restores the
  // sweep a real viewer sees: reflections travel across the face and the
  // brushed anisotropy changes with position.
  const cardCenter = { value: new THREE.Vector3() }
  const cardEye = { value: DEFAULT_CARD_APPEARANCE.cardEye }
  // x = brightness at the shelf, y = brightness at the crown.
  const cardShade = { value: new THREE.Vector2(DEFAULT_CARD_APPEARANCE.cardBottomLight, DEFAULT_CARD_APPEARANCE.cardTopLight) }
  const front = (body.material as THREE.MeshPhysicalMaterial[])[0]
  const compile = front.onBeforeCompile
  front.onBeforeCompile = (shader, renderer) => {
    compile.call(front, shader, renderer)
    shader.uniforms.uCardLight = cardLight
    shader.uniforms.uCardCenter = cardCenter
    shader.uniforms.uCardEye = cardEye
    shader.uniforms.uCardShade = cardShade
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uCardLight, uCardShade;\nuniform vec3 uCardCenter;\nuniform float uCardEye;')
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );',
      'vec3 geometryViewDir = normalize( ( viewMatrix * vec4( uCardCenter, 1. ) ).xyz + vec3( 0., 0., uCardEye ) + vViewPosition );',
    ).replace('vec3 cardView = normalize(cameraPosition - vCardWorld);', 'vec3 cardView = inverseTransformDirection(geometryViewDir, viewMatrix);')
    // Light the textured gold finish from above like
    // the bronze around it: bright crown, darker towards the shelf, with a
    // little occlusion where it meets the metal. Position the moving reflection
    // across the face using the selected light angle.
    shader.fragmentShader = shader.fragmentShader.replace(
      'outgoingLight *= .58 / (1. + .5 * cardPeak);',
      `
        float cardHeight = clamp(vMapUv.y, 0., 1.);
        float cardShade = mix(uCardShade.x, uCardShade.y, smoothstep(0., 1., cardHeight)) * mix(.72, 1., smoothstep(0., .14, cardHeight));
        outgoingLight = (diffuseColor.rgb * .09 + outgoingLight * .98 / (1. + .4 * cardPeak)) * cardShade;
      `,
    ).replace(
      'float stripX = (stripHit.x + .6 + (stripHit.y - 2.) * .22) / .8;',
      'float stripX = (stripHit.x - uCardLight.x + 1.2 + (stripHit.y + .5) * .2) / 1.5;',
    ).replace('float stripY = (stripHit.y - 2.) / 4.;', 'float stripY = (stripHit.y + .5) / 4.;')
      .replace('outgoingLight += diffuseColor.rgb * strip * 1.75;', `
        float foil = (1.-smoothstep(.24,.34,roughnessFactor))*step(.75,metalnessFactor);
        float lacquer = smoothstep(.65,.9,texture2D(clearcoatMap,vClearcoatMapUv).r);
        outgoingLight += diffuseColor.rgb * strip * (.8 + foil * 1.4) * uCardLight.y;
        outgoingLight += vec3(1.,.96,.87) * pow(strip,8.) * lacquer * .14 * uCardLight.y;
      `)
  }
  front.customProgramCacheKey = () => 'accounts-card-grain-controls-v13'
  let outline = seatAccountCard(card,body,shelf,blocks)
  cardCenter.value.setFromMatrixPosition(card.matrixWorld)
  sculpture.add(card)
  // The same card plane casts a soft local shadow onto the bronze and shelf.
  // This modifies only the account scene's material instances, not the source photo.
  // The shadow light is the studio key: high, left and in front of the set, so
  // the card throws a tight shadow onto the wall and shelf behind it. The live
  // HTML panels draw the same shadow from the same light (see livePanels).
  const shadowLight = new THREE.Vector3()
  // x = cast strength, y = penumbra growth with distance from the card.
  const cardShadow = { value: new THREE.Vector2(DEFAULT_CARD_APPEARANCE.cardShadowStrength, DEFAULT_CARD_APPEARANCE.cardShadowSoftness) }
  const placeShadowLight = (yaw: number, height: number) => shadowLight.set(
    Math.sin(THREE.MathUtils.degToRad(yaw)) * CARD_SHADOW_RADIUS, height, Math.cos(THREE.MathUtils.degToRad(yaw)) * CARD_SHADOW_RADIUS,
  )
  placeShadowLight(DEFAULT_CARD_APPEARANCE.cardShadowYaw, DEFAULT_CARD_APPEARANCE.cardShadowHeight)
  const inverse = card.matrixWorld.clone().invert()
  const foot = [-.703,.703].map((x) => shelf.projectPoint(new THREE.Vector3(x,-1.25,-.0135).applyMatrix4(body.matrixWorld),new THREE.Vector3()))
  for (const material of new Set(blocks.map((block) => block.material as THREE.ShaderMaterial))) {
    material.uniforms.uCardInverse = { value: inverse }
    material.uniforms.uCardPerspective = cardPerspective
    material.uniforms.uCardFootA = { value: foot[0] }
    material.uniforms.uCardFootB = { value: foot[1] }
    material.uniforms.uCardShadowLight = { value: shadowLight }
    material.uniforms.uCardShadow = cardShadow
    material.fragmentShader = material.fragmentShader.replace('uniform vec4 uFloor;', `
      uniform vec4 uFloor;
      uniform mat4 uCardInverse;
      uniform float uCardPerspective;
      uniform vec3 uCardFootA, uCardFootB, uCardShadowLight;
      uniform vec2 uCardShadow;
      float cardShadow(vec3 point) {
        vec3 edgeVector = uCardFootB-uCardFootA;
        float along = clamp(dot(point-uCardFootA,edgeVector)/dot(edgeVector,edgeVector),0.,1.);
        float distanceToFoot = length(point-mix(uCardFootA,uCardFootB,along));
        float contact = (.7*exp(-pow(distanceToFoot/.04,2.)) + .26*exp(-pow(distanceToFoot/.16,2.))) * uCardShadow.x * 2.;
        vec3 localOrigin = (uCardInverse * vec4(point,1.)).xyz;
        vec3 ray = normalize(uCardShadowLight - point);
        vec3 localRay = (uCardInverse * vec4(ray,0.)).xyz;
        if (abs(localRay.z) < .0001) return contact;
        float t = -localOrigin.z/localRay.z;
        if (t <= 0. || t > 15.) return contact;
        vec2 hit = (localOrigin+localRay*t).xy;
        hit.x /= 1.-uCardPerspective*clamp((hit.y+1.25)/2.5,0.,1.);
        vec2 d = abs(hit)-vec2(.703,1.163);
        float edge = length(max(d,0.))+min(max(d.x,d.y),0.)-.087;
        float softness = .02+uCardShadow.y*t;
        return max(contact,(1.-smoothstep(-softness,softness,edge)) * uCardShadow.x);
      }
    `).replace('gl_FragColor = vec4(max(color, vec3(0.)), alpha);', `
      if (uGeometry < .5) color *= 1.-cardShadow(vWorld);
      gl_FragColor = vec4(max(color, vec3(0.)), alpha);
    `)
  }
  const foundation = blocks.find((block) => block.geometry.name === 'Foundation')!
  const reflection = createCardShelfReflection(card,sculpture,foundation,shelf,scene)
  resources.push(reflection)
  // Each card material keeps its authored env intensity; the control scales all of them together.
  const reflective: { material: THREE.MeshStandardMaterial; base: number }[] = []
  card.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof THREE.MeshStandardMaterial) reflective.push({ material, base: material.envMapIntensity })
    }
  })
  const materials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
  const clay = new THREE.MeshStandardMaterial({ color: '#b8bec5', roughness: .8 })
  const owned = new Set<{ dispose(): void }>([clay])
  card.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    materials.set(node, node.material); owned.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      owned.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) owned.add(value)
    }
  })
  resources.push(...owned)
  // Metadata supports a browser check of physical support, separate from UI.
  card.userData.shelfClearance = .003
  blocks.forEach((block) => block.updateMatrixWorld(true))
  const clamp = (key: keyof CardAppearance, value: number) => {
    const [minimum, maximum] = CARD_APPEARANCE_LIMITS[key]
    return THREE.MathUtils.clamp(Number.isFinite(value) ? value : DEFAULT_CARD_APPEARANCE[key], minimum, maximum)
  }
  return {
    get outline() { return outline },
    shadowLight,
    /** Live appearance controls: none of these change geometry, so no reseating is needed. */
    setAppearance(next: CardAppearance) {
      card.setTexture(clamp('cardGrainSize', next.cardGrainSize), clamp('cardTextureStrength', next.cardTextureStrength), clamp('cardTextureRelief', next.cardTextureRelief), clamp('cardTextureRoughness', next.cardTextureRoughness))
      cardEye.value = clamp('cardEye', next.cardEye)
      cardShade.value.set(clamp('cardBottomLight', next.cardBottomLight), clamp('cardTopLight', next.cardTopLight))
      cardShadow.value.set(clamp('cardShadowStrength', next.cardShadowStrength), clamp('cardShadowSoftness', next.cardShadowSoftness))
      placeShadowLight(clamp('cardShadowYaw', next.cardShadowYaw), clamp('cardShadowHeight', next.cardShadowHeight))
      const reflection = clamp('cardReflection', next.cardReflection)
      for (const entry of reflective) entry.material.envMapIntensity = entry.base * reflection
    },
    reflection,
    setLight,
    setPose(degrees: number, perspective: number) {
      if (cardPerspective.value !== perspective) cardPerspective.value = setPerspective(perspective)
      outline = seatAccountCard(card,body,shelf,blocks,degrees,cardPerspective.value)
      cardCenter.value.setFromMatrixPosition(card.matrixWorld)
      inverse.copy(card.matrixWorld).invert()
      foot.forEach((point, i) => {
        point.set(i === 0 ? -.703 : .703,-1.25,-.0135).applyMatrix4(body.matrixWorld)
        shelf.projectPoint(point,point)
      })
    },
    setGeometryView(enabled: boolean) { materials.forEach((original, mesh) => { mesh.material = enabled ? clay : original }) },
  }
}
