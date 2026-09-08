import * as THREE from 'three'

import { PROJECTOR } from './geometry'

/* ------------------------------------------------------------------
   Shared GLSL
   ------------------------------------------------------------------ */

const noiseGLSL = /* glsl */ `
  float h3dHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float h3dNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h3dHash(i), h3dHash(i + vec3(1, 0, 0)), f.x),
          mix(h3dHash(i + vec3(0, 1, 0)), h3dHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(h3dHash(i + vec3(0, 0, 1)), h3dHash(i + vec3(1, 0, 1)), f.x),
          mix(h3dHash(i + vec3(0, 1, 1)), h3dHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`

/* ------------------------------------------------------------------
   Projector camera (frozen; the reference render's viewpoint)
   ------------------------------------------------------------------ */

export function createProjectorCamera() {
  const cam = new THREE.PerspectiveCamera(PROJECTOR.fov, PROJECTOR.aspect, 0.1, 100)
  cam.position.set(...PROJECTOR.position)
  cam.lookAt(...PROJECTOR.target)
  cam.rotateZ(THREE.MathUtils.degToRad(PROJECTOR.roll))
  cam.updateMatrixWorld(true)
  cam.updateProjectionMatrix()
  return cam
}

export function projectorVP(cam: THREE.PerspectiveCamera) {
  cam.updateMatrixWorld(true)
  return new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
}

/* ------------------------------------------------------------------
   A · Projected — unlit, the render is projected straight onto the geometry
   ------------------------------------------------------------------ */

export function createProjectedMaterial(texture: THREE.Texture, projector: THREE.PerspectiveCamera) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uProjVP: { value: projectorVP(projector) },
      uProjPos: { value: projector.position.clone() },
      uFallback: { value: new THREE.Color('#15110c') },
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
        float inFrustum = step(0.0, vProj.w) * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        vec3 toProjector = normalize(uProjPos - vWorldPos);
        float facing = smoothstep(0.02, 0.22, dot(normalize(vWorldNormal), toProjector));
        vec3 projected = texture2D(uMap, uv).rgb;
        vec3 color = mix(uFallback, projected, inFrustum * facing);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
  mat.toneMapped = false
  return mat
}

/* ------------------------------------------------------------------
   B · PBR and C · Hybrid — one physical material, extended in-shader:
     - gold inlay band along the fillet next to the front/top faces
     - procedural roughness grain + broad patina mottle (world-space,
       so no UV dependency and it wraps the fillets seamlessly)
     - optional projected render (hybrid) as emissive + partial albedo
   ------------------------------------------------------------------ */

export interface BronzeUniforms {
  uGoldColor: THREE.IUniform<THREE.Color>
  uGoldCenter: THREE.IUniform<number>
  uGoldWidth: THREE.IUniform<number>
  uGoldStrength: THREE.IUniform<number>
  uGoldDirectional: THREE.IUniform<number>
  uGoldTop: THREE.IUniform<number>
  uGoldFrontOnly: THREE.IUniform<number>
  uLightDir: THREE.IUniform<THREE.Vector3>
  uGrain: THREE.IUniform<number>
  uMottle: THREE.IUniform<number>
  uProjMap: THREE.IUniform<THREE.Texture | null>
  uProjVP: THREE.IUniform<THREE.Matrix4>
  uProjPos: THREE.IUniform<THREE.Vector3>
  uProjEmissive: THREE.IUniform<number>
  uProjAlbedo: THREE.IUniform<number>
  uProjFrontOnly: THREE.IUniform<number>
}

export function createBronzeUniforms(
  texture: THREE.Texture | null,
  projector: THREE.PerspectiveCamera,
): BronzeUniforms {
  return {
    uGoldColor: { value: new THREE.Color('#e0b06a') },
    uGoldCenter: { value: 0.07 },
    uGoldWidth: { value: 0.06 },
    uGoldStrength: { value: 1.1 },
    uGoldDirectional: { value: 0.6 },
    uGoldTop: { value: 0.35 },
    uGoldFrontOnly: { value: 1 },
    uLightDir: { value: new THREE.Vector3(-0.35, 0.72, 0.6).normalize() },
    uGrain: { value: 0.16 },
    uMottle: { value: 0.14 },
    uProjMap: { value: texture },
    uProjVP: { value: projectorVP(projector) },
    uProjPos: { value: projector.position.clone() },
    uProjEmissive: { value: 0.85 },
    uProjAlbedo: { value: 0.35 },
    uProjFrontOnly: { value: 1 },
  }
}

export function createBronzeMaterial(uniforms: BronzeUniforms, projected: boolean) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#3a2f24',
    roughness: 0.48,
    metalness: 0.78,
    envMapIntensity: 1.1,
  })
  if (projected) mat.defines = { USE_PROJ: '' }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vH3dObjN;
        varying vec3 vH3dWPos;
        varying vec3 vH3dWN;
        #ifdef USE_PROJ
        uniform mat4 uProjVP;
        varying vec4 vH3dProj;
        #endif`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
        vH3dObjN = objectNormal;`,
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `#include <project_vertex>
        {
          vec4 h3dWp = modelMatrix * vec4(transformed, 1.0);
          vH3dWPos = h3dWp.xyz;
          vH3dWN = normalize(mat3(modelMatrix) * objectNormal);
          #ifdef USE_PROJ
          vH3dProj = uProjVP * h3dWp;
          #endif
        }`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vH3dObjN;
        varying vec3 vH3dWPos;
        varying vec3 vH3dWN;
        uniform vec3 uGoldColor;
        uniform float uGoldCenter;
        uniform float uGoldWidth;
        uniform float uGoldStrength;
        uniform float uGoldDirectional;
        uniform float uGoldTop;
        uniform float uGoldFrontOnly;
        uniform vec3 uLightDir;
        uniform float uGrain;
        uniform float uMottle;
        #ifdef USE_PROJ
        uniform sampler2D uProjMap;
        uniform vec3 uProjPos;
        uniform float uProjEmissive;
        uniform float uProjAlbedo;
        uniform float uProjFrontOnly;
        varying vec4 vH3dProj;
        #endif
        ${noiseGLSL}`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        {
          float m = h3dNoise(vH3dWPos * 0.9) * 0.6 + h3dNoise(vH3dWPos * 2.3) * 0.4;
          diffuseColor.rgb *= 1.0 + (m - 0.5) * uMottle;
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        {
          float g = h3dNoise(vH3dWPos * 38.0) * 0.6 + h3dNoise(vH3dWPos * 91.0) * 0.4;
          roughnessFactor = clamp(roughnessFactor + (g - 0.5) * uGrain, 0.04, 1.0);
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          vec3 n = normalize(vH3dObjN);
          vec3 an = abs(n);
          float axisness = max(max(an.x, an.y), an.z);
          float ang = acos(clamp(axisness, 0.0, 1.0));
          float fw = fwidth(ang) * 0.8 + 0.0015;
          float band = 1.0 - smoothstep(uGoldWidth * 0.5 - fw, uGoldWidth * 0.5 + fw, abs(ang - uGoldCenter));
          float frontness = smoothstep(0.55, 0.9, n.z);
          float topness = smoothstep(0.55, 0.9, n.y) * uGoldTop;
          float faceW = mix(1.0, max(frontness, topness), uGoldFrontOnly);
          vec3 wn = normalize(vH3dWN);
          float lit = mix(1.0, clamp(dot(wn, uLightDir), 0.0, 1.0), uGoldDirectional);
          float gold = band * faceW * lit;
          diffuseColor.rgb = mix(diffuseColor.rgb, uGoldColor, gold * 0.85);
          roughnessFactor = mix(roughnessFactor, 0.35, gold);
          totalEmissiveRadiance += uGoldColor * gold * uGoldStrength;
          #ifdef USE_PROJ
          {
            vec3 ndc = vH3dProj.xyz / vH3dProj.w;
            vec2 uv = ndc.xy * 0.5 + 0.5;
            float inF = step(0.0, vH3dProj.w) * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
            vec3 toP = normalize(uProjPos - vH3dWPos);
            float facing = smoothstep(0.05, 0.3, dot(wn, toP));
            float frontW = mix(1.0, smoothstep(0.6, 0.9, n.z), uProjFrontOnly);
            float w = inF * facing * frontW * (1.0 - gold);
            vec3 pc = texture2D(uProjMap, uv).rgb;
            diffuseColor.rgb = mix(diffuseColor.rgb, pc, w * uProjAlbedo);
            totalEmissiveRadiance += pc * w * uProjEmissive;
          }
          #endif
        }`,
      )
  }
  mat.customProgramCacheKey = () => (projected ? 'h3d-bronze-proj' : 'h3d-bronze')
  return mat
}

/* ------------------------------------------------------------------
   Supporting materials
   ------------------------------------------------------------------ */

export function createGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#06050a',
    roughness: 0.14,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.9,
  })
}

export function createGoldMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#b08a48',
    roughness: 0.32,
    metalness: 1,
    anisotropy: 0.55,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.5,
  })
}
