import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

/** Reflect the added card in the actual bronze crown, preserving its photo lighting. */
export function createCardShelfReflection(
  card: THREE.Group, sculpture: THREE.Group, foundation: THREE.Mesh,
  plane: THREE.Plane, scene: THREE.Scene,
) {
  const material = foundation.material as THREE.ShaderMaterial
  const reflector = new Reflector(new THREE.PlaneGeometry(1, 1), {
    textureWidth: 768, textureHeight: 512, multisample: 4, clipBias: .0001,
  }) as Reflector & { material: THREE.ShaderMaterial }
  reflector.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal)
  reflector.position.copy(plane.normal).multiplyScalar(-plane.constant)
  reflector.updateMatrixWorld(true)
  reflector.visible = false
  const inversePlane = reflector.matrixWorld.clone().invert()
  const matrix = new THREE.Matrix4(), texel = new THREE.Vector2(1 / 768, 1 / 512)
  const texture = reflector.getRenderTarget().texture
  texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter
  material.uniforms.uCardMirror = { value: texture }
  material.uniforms.uCardMirrorMatrix = { value: matrix }
  material.uniforms.uCardMirrorTexel = { value: texel }
  material.uniforms.uCardShelf = { value: new THREE.Vector4(...plane.normal.toArray(), plane.constant) }
  material.fragmentShader = material.fragmentShader.replace('uniform mat4 uCardInverse;', `
    uniform mat4 uCardInverse;
    uniform vec4 uCardShelf;
    uniform sampler2D uCardMirror;
    uniform mat4 uCardMirrorMatrix;
    uniform vec2 uCardMirrorTexel;
    vec4 cardReflection(vec3 point) {
      vec4 projected = uCardMirrorMatrix * vec4(point, 1.);
      vec2 uv = projected.xy / projected.w;
      float valid = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
      vec3 local = (uCardInverse * vec4(point, 1.)).xyz;
      float spread = max(local.z, 0.);
      // This is sampled inside the crown mask's non-uniform branch. Implicit
      // mip derivatives are undefined there and can produce moving seams.
      // An explicit, softly filtered LOD also keeps the contact edge stable
      // as it crosses pixels in the reduced-resolution reflection target.
      float roughness = 1.25 + min(spread * 1.5, 2.);
      vec2 radius = uCardMirrorTexel * (1. + spread * 2.);
      vec4 reflected = textureLod(uCardMirror, uv, roughness) * .4;
      reflected += textureLod(uCardMirror, uv + vec2(radius.x, 0.), roughness) * .15;
      reflected += textureLod(uCardMirror, uv - vec2(radius.x, 0.), roughness) * .15;
      reflected += textureLod(uCardMirror, uv + vec2(0., radius.y), roughness) * .15;
      reflected += textureLod(uCardMirror, uv - vec2(0., radius.y), roughness) * .15;
      reflected.rgb /= max(reflected.a, .001);
      reflected.a *= valid * exp(-spread * 1.8);
      return reflected;
    }
  `).replace('if (uGeometry < .5) color *= 1.-cardShadow(vWorld);', `
    if (uGeometry < .5) {
      float crown = smoothstep(.8, .98, dot(n, uCardShelf.xyz));
      crown *= 1. - smoothstep(.01, .04, abs(dot(uCardShelf, vec4(vWorld, 1.))));
      if (crown > .001) {
        vec4 reflected = cardReflection(vWorld);
        color = mix(color, reflected.rgb * vec3(.96, .87, .71), reflected.a * crown * .68);
      }
    }
    if (uGeometry < .5) color *= 1.-cardShadow(vWorld);
  `)
  return {
    resize(width: number, height: number) {
      const scale = Math.min(.6, 960 / width, 960 / height)
      const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale))
      reflector.getRenderTarget().setSize(w, h); texel.set(1 / w, 1 / h)
    },
    capture(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
      // Capture only the new object. The photograph already contains bronze
      // highlights; including the blocks here would light the crown twice.
      const hidden = [...scene.children.filter((node) => node !== sculpture && !(node instanceof THREE.Light)), ...sculpture.children.filter((node) => node !== card)]
      const visibility = hidden.map((node) => node.visible)
      hidden.forEach((node) => { node.visible = false })
      try {
        reflector.forceUpdate = true
        reflector.onBeforeRender(renderer, scene, camera, reflector.geometry, reflector.material, sculpture)
        matrix.copy(reflector.material.uniforms.textureMatrix.value).multiply(inversePlane)
      } finally {
        hidden.forEach((node, i) => { node.visible = visibility[i] })
        reflector.visible = false
      }
    },
    dispose() { reflector.dispose(); reflector.geometry.dispose() },
  }
}
