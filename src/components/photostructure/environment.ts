import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { createShelfPlane } from './geometry'
import { DEFAULT_OPTIONS } from './config'
import type { PhotoOptions } from './config'

/** A curved studio wall and satin floor, sharing the sculpture's world space. */
export function createPhotoEnvironment(projector: THREE.OrthographicCamera) {
  const floorPlane = createShelfPlane(projector)
  // The photograph continues to a rectangular crop below the pedestal crown.
  // Seat the visible plinth in a real floor before that crop becomes visible.
  floorPlane.constant += 1.05
  const group = new THREE.Group()
  group.position.copy(floorPlane.normal).multiplyScalar(-floorPlane.constant)
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), floorPlane.normal)
  group.updateMatrixWorld(true)
  const inverseRoom = group.matrixWorld.clone().invert()
  const wallPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 6.3).applyMatrix4(group.matrixWorld)
  const overheadSource = new THREE.Vector2(1.4, 12)
  const sourceRay = new THREE.Raycaster(), sourcePoint = new THREE.Vector3()

  const reflector = new Reflector(new THREE.PlaneGeometry(1, 1), {
    textureWidth: 768, textureHeight: 512, multisample: 0, clipBias: .001,
  }) as Reflector & { material: THREE.ShaderMaterial }
  reflector.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), floorPlane.normal)
  reflector.position.copy(group.position)
  reflector.updateMatrixWorld(true)
  reflector.visible = false
  // Trilinear mip levels provide a smooth rough reflection without a blur pass.
  const reflectionTexture = reflector.getRenderTarget().texture
  reflectionTexture.generateMipmaps = true
  reflectionTexture.minFilter = THREE.LinearMipmapLinearFilter
  const inverseReflectionPlane = reflector.matrixWorld.clone().invert()
  const reflectionMatrix = new THREE.Matrix4()
  const reflectionSize = new THREE.Vector2(1 / 768, 1 / 512)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLight: { value: DEFAULT_OPTIONS.backgroundLight }, uSpread: { value: DEFAULT_OPTIONS.lightSpread }, uReflection: { value: DEFAULT_OPTIONS.floorReflection },
      uOverhead: { value: DEFAULT_OPTIONS.overheadLight }, uOverheadSource: { value: overheadSource },
      uMirror: { value: reflector.getRenderTarget().texture },
      uMirrorMatrix: { value: reflectionMatrix }, uMirrorTexel: { value: reflectionSize },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPoint, vWorld, vNormal;
      void main() {
        vPoint = position;
        vNormal = normal;
        vWorld = (modelMatrix * vec4(position, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLight, uSpread, uReflection, uOverhead;
      uniform sampler2D uMirror;
      uniform mat4 uMirrorMatrix;
      uniform vec2 uMirrorTexel, uOverheadSource;
      varying vec3 vPoint, vWorld, vNormal;
      float gaussian(vec2 p) { return exp(-dot(p, p)); }
      void main() {
        float floorWeight = smoothstep(.25, .98, vNormal.y);
        float wallLight = gaussian(vec2((vPoint.x - 1.) / (8.8 * uSpread), (vPoint.y - 1.9) / (2.45 * uSpread)));
        float floorLight = gaussian(vec2((vPoint.x - 1.) / (11. * uSpread), (vPoint.z + 3.) / (6. * uSpread)));
        // A broad warm softbox wraps around the curved wall/floor junction.
        vec3 color = vec3(.0012, .0013, .0016);
        color += mix(vec3(.36, .169, .047) * wallLight, vec3(.105, .06, .024) * floorLight, floorWeight) * uLight;
        float cool = gaussian(vec2((abs(vPoint.x) - 12.) / 5., (vPoint.y - 6.) / 7.));
        color += vec3(.003, .005, .014) * cool * (1. - floorWeight) * uLight;

        if (floorWeight > .9) {
          // Soft rectangular contact shadow follows the pedestal footprint.
          vec2 outside = max(abs(vec2(vPoint.x + .06, vPoint.z - .65)) - vec2(7.95, 1.5), 0.);
          float contact = exp(-length(outside) * 2.1);
          // The rear softbox casts toward +Z, across the entire front edge.
          // Start at the calibrated floor contact (z ≈ 2.15), then widen and
          // soften the penumbra with distance instead of ending at the plinth.
          float frontDistance = vPoint.z - 2.15;
          float forward = max(frontDistance, 0.);
          float shadowHalfWidth = 7.95 + forward * .19;
          float sideDistance = max(abs(vPoint.x + .06 + forward * .08) - shadowHalfWidth, 0.);
          float penumbra = .32 + forward * .25;
          float frontShadow = exp(-pow(forward / 4.8, 1.5) - pow(sideDistance / penumbra, 2.));
          frontShadow *= smoothstep(-.8, .05, frontDistance);
          color *= 1. - max(contact * .985, frontShadow * .95);
          if (uReflection > .001) {
            vec4 projected = uMirrorMatrix * vec4(vWorld, 1.);
            vec2 uv = projected.xy / projected.w;
            float distanceFromBase = max(vPoint.z - 2.1, 0.);
            vec2 radius = uMirrorTexel * (1. + distanceFromBase * .35);
            float roughness = 1.6 + min(distanceFromBase * .3, 2.4);
            vec4 reflection = texture2D(uMirror, uv, roughness) * .4;
            reflection += texture2D(uMirror, clamp(uv + vec2(radius.x, 0.), .001, .999), roughness) * .15;
            reflection += texture2D(uMirror, clamp(uv - vec2(radius.x, 0.), .001, .999), roughness) * .15;
            reflection += texture2D(uMirror, clamp(uv + vec2(0., radius.y), .001, .999), roughness) * .15;
            reflection += texture2D(uMirror, clamp(uv - vec2(0., radius.y), .001, .999), roughness) * .15;
            float valid = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
            float falloff = exp(-distanceFromBase * .32) * valid;
            // Keep reflected fill from repainting a bright strip over the
            // contact. The distant gold reflection remains visible as it fades.
            float reflectedOcclusion = max(contact * .95, frontShadow * .68);
            vec3 reflectedColor = reflection.rgb * vec3(.94, .87, .73) * (1. - reflectedOcclusion);
            color = mix(color, reflectedColor, reflection.a * uReflection * falloff);
          }
        }
        // The set disappears into the same black as the page in every direction.
        float vignette = exp(-pow(abs(vPoint.x) / 21., 4.));
        float distanceFade = mix(1. - smoothstep(10., 22., vPoint.y), 1. - smoothstep(11., 27., vPoint.z), floorWeight);
        color *= vignette * distanceFade;
        // An implied overhead softbox, not a new render pass or a fog volume.
        // Two feathered shafts fan down to the illuminated crowns. Their source
        // is anchored above the copy at the reference pose, including on mobile.
        float descent = uOverheadSource.y - vPoint.y;
        float travel = descent / max(uOverheadSource.y - 1.5, 5.);
        float coneWidth = (.58 + max(travel, 0.) * 1.7) * sqrt(uSpread);
        float offset = vPoint.x - uOverheadSource.x;
        float leftRay = gaussian(vec2((offset + travel * 5.8) / coneWidth, travel * .7));
        float rightRay = gaussian(vec2((offset - travel * 4.7) / (coneWidth * 1.2), travel * .8));
        float shaftGate = smoothstep(-1.2, .7, descent) * (1. - smoothstep(1., 1.4, travel));
        float overheadHalo = gaussian(vec2(offset / (3.2 * sqrt(uSpread)), descent / 3.1));
        vec3 overhead = vec3(.027, .017, .0075) * overheadHalo;
        overhead += vec3(.026, .016, .0068) * (leftRay + rightRay * .68) * shaftGate;
        color += overhead * uOverhead * uLight * (1. - floorWeight) * vignette;
        // Fixed, sub-pixel dithering keeps the dark amber falloff free of bands.
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5;
        gl_FragColor = vec4(max(color, vec3(0.)), 1.);
        #include <colorspace_fragment>
        gl_FragColor.rgb += grain / 255.;
      }
    `,
  })

  // A continuous quarter-circle cove avoids a horizon line cutting the scene.
  const profile: [number, number][] = [[0, 60], [0, -4.5]]
  const radius = 1.8
  for (let i = 1; i <= 24; i++) {
    const angle = i / 24 * Math.PI / 2
    profile.push([radius - Math.cos(angle) * radius, -4.5 - Math.sin(angle) * radius])
  }
  profile.push([35, -4.5 - radius])
  const positions: number[] = [], indices: number[] = []
  profile.forEach(([y, z], i) => {
    positions.push(-60, y, z, 60, y, z)
    if (i) { const a = (i - 1) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const room = new THREE.Mesh(geometry, material)
  room.name = 'Satin floor and curved backdrop'
  room.frustumCulled = false
  group.add(room)
  return {
    group, floorPlane,
    update(options: PhotoOptions) {
      group.visible = options.mode === 'photo' && options.lighting !== 'unlit'
      material.uniforms.uLight.value = options.backgroundLight
      material.uniforms.uSpread.value = options.lightSpread
      material.uniforms.uReflection.value = options.floorReflection
      material.uniforms.uOverhead.value = options.lighting === 'illuminated' ? options.overheadLight : 0
    },
    frameOverhead(camera: THREE.OrthographicCamera) {
      // Reference-camera top center: no per-frame movement or screen-space overlay.
      sourceRay.setFromCamera(new THREE.Vector2(0, 1), camera)
      if (sourceRay.ray.intersectPlane(wallPlane, sourcePoint)) {
        sourcePoint.applyMatrix4(inverseRoom)
        overheadSource.set(sourcePoint.x, sourcePoint.y - .5)
      }
    },
    resize(width: number, height: number) {
      const scale = Math.min(.65, 960 / width, 960 / height)
      const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale))
      reflector.getRenderTarget().setSize(w, h)
      reflectionSize.set(1 / w, 1 / h)
    },
    capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
      if (!group.visible || material.uniforms.uReflection.value === 0) return
      group.visible = false
      try {
        reflector.onBeforeRender(renderer, scene, camera, reflector.geometry, reflector.material, group)
        reflectionMatrix.copy(reflector.material.uniforms.textureMatrix.value).multiply(inverseReflectionPlane)
      } finally {
        group.visible = true
        reflector.visible = false
      }
    },
    dispose() { reflector.dispose(); reflector.geometry.dispose(); geometry.dispose(); material.dispose() },
  }
}
