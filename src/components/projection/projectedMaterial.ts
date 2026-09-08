import * as THREE from 'three'

/**
 * Projective texture mapping material.
 *
 * The texture is projected from a (frozen) projector camera onto whatever
 * geometry uses this material. Because the projection is computed in world
 * space and the structure never moves (only the *viewing* camera does),
 * the texture sticks to the surfaces — rotating the view reads as a real
 * lit 3D object.
 *
 * Surfaces facing away from the projector (or outside its frustum) fall
 * back to a flat dark material so smearing artifacts stay invisible.
 */
export function createProjectedMaterial(texture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uProjVP: { value: new THREE.Matrix4() },
      uProjPos: { value: new THREE.Vector3() },
      uFallback: { value: new THREE.Color('#17130e') },
    },
    vertexShader: /* glsl */ `
      uniform mat4 uProjVP;
      varying vec4 vProj;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vProj = uProjVP * worldPos;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uProjPos;
      uniform vec3 uFallback;
      varying vec4 vProj;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vec3 ndc = vProj.xyz / vProj.w;
        vec2 uv = ndc.xy * 0.5 + 0.5;

        float inFrustum =
          step(0.0, vProj.w) *
          step(0.0, uv.x) * step(uv.x, 1.0) *
          step(0.0, uv.y) * step(uv.y, 1.0);

        // Fade out surfaces at grazing angles / facing away from the
        // projector — those would otherwise show streaked pixels.
        vec3 toProjector = normalize(uProjPos - vWorldPos);
        float facing = smoothstep(0.02, 0.22, dot(vWorldNormal, toProjector));

        vec3 projected = texture2D(uMap, uv).rgb;
        vec3 color = mix(uFallback, projected, inFrustum * facing);

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Recompute the projector view-projection uniform from a camera. */
export function updateProjectorUniforms(
  material: THREE.ShaderMaterial,
  projector: THREE.PerspectiveCamera,
) {
  projector.updateMatrixWorld(true)
  projector.updateProjectionMatrix()
  const vp = material.uniforms.uProjVP.value as THREE.Matrix4
  vp.multiplyMatrices(projector.projectionMatrix, projector.matrixWorldInverse)
  const pos = material.uniforms.uProjPos.value as THREE.Vector3
  pos.copy(projector.position)
}
