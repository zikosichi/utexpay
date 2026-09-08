import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

/** Capture only; the pedestal's own bronze shader renders the reflection. */
export function pedestalReflection(base: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>) {
  const reflector = new Reflector(new THREE.PlaneGeometry(1, 1), {
    textureWidth: 1536, textureHeight: 1024, multisample: 2, clipBias: .001,
  }) as Reflector & { material: THREE.ShaderMaterial }
  reflector.rotation.x = -Math.PI / 2
  reflector.position.set(base.position.x, 0, base.position.z)
  reflector.visible = false
  reflector.forceUpdate = true
  reflector.updateMatrixWorld(true)
  const worldToReflection = base.material.uniforms.uShelfMatrix.value as THREE.Matrix4
  const inversePlane = new THREE.Matrix4().copy(reflector.matrixWorld).invert()
  base.material.uniforms.uShelfReflection.value = reflector.getRenderTarget().texture
  return {
    capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
      // Exclude the reflecting solid from its own capture to avoid reading
      // the reflection attachment while writing to it.
      const wasVisible = base.visible
      base.visible = false
      try {
        reflector.onBeforeRender(renderer, scene, camera, reflector.geometry, reflector.material, base.parent as THREE.Group)
        worldToReflection.copy(reflector.material.uniforms.textureMatrix.value).multiply(inversePlane)
      } finally {
        base.visible = wasVisible
        reflector.visible = false
      }
    },
    dispose() { reflector.dispose(); reflector.geometry.dispose() },
  }
}

export const shelfReflectionShader = /* glsl */ `
  #ifdef STUDIO_PEDESTAL
  uniform sampler2D uShelfReflection;
  uniform mat4 uShelfMatrix;
  vec4 shelfReflection(vec3 point) {
    vec4 projected = uShelfMatrix * vec4(point, 1.);
    vec2 uv = projected.xy / projected.w;
    float distanceToBlocks = max(point.z - .76, 0.);
    vec2 radius = vec2(1. / 1536., 1. / 1024.) * (1. + distanceToBlocks * 5.);
    vec4 reflected = texture2D(uShelfReflection, uv) * .2;
    for (int i = 0; i < 12; i++) {
      float angle = float(i) * 2.399963;
      vec2 offset = vec2(cos(angle), sin(angle)) * sqrt((float(i) + .5) / 12.) * radius;
      reflected += texture2D(uShelfReflection, uv + offset) * (.8 / 12.);
    }
    reflected.rgb /= max(reflected.a, .01);
    return reflected;
  }
  #endif
`;
