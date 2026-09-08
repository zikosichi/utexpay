import * as THREE from 'three'

import type { DepthMaps } from './maps'
import { MAP_H, MAP_W, PIVOT_Z, PLATE_CAM } from './scene'

/**
 * The plate: a dense grid indexed by image UV. Each vertex is moved to the
 * world position the calibrated geometry has behind that pixel, so a moving
 * camera sees real parallax while the pixels stay the reference render's.
 * The fragment stage adds a pointer-driven light on top of the baked one,
 * shaded by the true normals, plus a glint on the gold inlay.
 */

const vertexShader = /* glsl */ `
  uniform sampler2D uPos;
  uniform float uDepthScale;
  uniform float uPivotZ;
  uniform vec3 uRestCam;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 p = texture2D(uPos, uv);
    // deepen the structure along the render camera's rays, about the block fronts' plane: at rest
    // nothing moves (every point slides along its own ray), the fronts and the HTML pinned to them
    // never move, and parallax under motion grows with the scale
    vec3 ray = p.xyz - uRestCam;
    float t = length(ray);
    vec3 dir = ray / max(t, 1e-4);
    float tFront = (uPivotZ - uRestCam.z) / min(dir.z, -1e-4);
    p.xyz = uRestCam + dir * (tFront + (t - tFront) * uDepthScale);
    vWorld = p.xyz;
    vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uImage;
  uniform sampler2D uNor;
  uniform sampler2D uDepthMap;
  uniform float uMapOverlay;
  uniform float uEdge;
  uniform float uCut;
  uniform float uRestRatio;
  uniform vec2 uMapSize;
  uniform float uLightOn;
  uniform vec3 uLightPos;
  uniform vec3 uLightColor;
  uniform vec3 uRestL;
  uniform float uSheen;
  uniform float uSheenPow;
  uniform float uSpec;
  uniform float uSpecPow;
  uniform float uShade;
  uniform float uGlint;
  uniform float uGlintPow;
  uniform float uGlintLocal;
  uniform vec2 uPointerUv;
  uniform float uAspect;
  uniform int uDebug;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vDepth;

  void main() {
    // A triangle bridging a silhouette gets stretched across the gap the
    // camera opened: its image pixels per screen pixel drop well below the
    // rest ratio. Surfaces at grazing angles only compress, never stretch.
    vec2 dUv = fwidth(vUv) * uMapSize;
    float stretch = uRestRatio / max(min(dUv.x, dUv.y), 1e-6);
    float cutEdge = step(uCut, stretch);
    if (uEdge > 0.5 && cutEdge > 0.5 && uDebug != 5) discard;

    vec3 c = texture2D(uImage, vUv).rgb; // linear (sRGB texture)
    // normals and mask per pixel, not per vertex: interpolating them across
    // a grid cell would stair-step every shading boundary between faces
    vec4 nm = texture2D(uNor, vUv);
    vec3 n = normalize(nm.xyz);
    float vMask = nm.a;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uLightPos - vWorld);
    vec3 H = normalize(L + V);
    float ndh = max(dot(n, H), 0.0);
    float ndl = max(dot(n, L), 0.0);
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));

    // the gold inlay: warm, saturated and bright against the bronze
    float gold = smoothstep(0.12, 0.3, c.r - c.b) * smoothstep(0.04, 0.15, lum);

    // optional locality of the glint around the pointer (image space, aspect-corrected)
    vec2 d = (vUv - uPointerUv) * vec2(1.0, uAspect);
    float local = exp(-dot(d, d) / 0.045);
    float localW = mix(1.0, local, uGlintLocal);

    // dark, shadowed metal still catches a little; lit metal catches more
    float surfaceW = vMask * (0.35 + 0.65 * smoothstep(0.0, 0.06, lum));
    vec3 light = uLightColor * (pow(ndh, uSheenPow) * uSheen + pow(ndh, uSpecPow) * uSpec) * surfaceW;
    light += uLightColor * pow(ndh, uGlintPow) * uGlint * gold * localW * vMask;
    light *= uLightOn;

    // shift the baked shading a touch towards the live light direction
    float shade = (ndl - max(dot(n, uRestL), 0.0)) * uShade * vMask * uLightOn;
    vec3 col = c * (1.0 + shade) + light;

    if (uMapOverlay > 0.0) {
      vec3 t = texture2D(uDepthMap, vUv).rgb;
      float g = (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0;
      col = mix(col, vec3(g), uMapOverlay);
    }

    if (uDebug == 1) col = vec3(1.0 - clamp((vDepth - 14.0) / 14.0, 0.0, 1.0));
    else if (uDebug == 2) col = n * 0.5 + 0.5;
    else if (uDebug == 3) col = vec3(vMask, gold, 0.0);
    else if (uDebug == 4) col = light + shade * 0.5 + 0.02;
    else if (uDebug == 5) col = mix(c, vec3(1.0, 0.1, 0.2), cutEdge);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function createPlateMaterial(image: THREE.Texture, depthMap: THREE.Texture, maps: DepthMaps) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uImage: { value: image },
      uDepthMap: { value: depthMap },
      uMapOverlay: { value: 0 },
      uDepthScale: { value: 1 },
      uPivotZ: { value: PIVOT_Z },
      uRestCam: { value: PLATE_CAM.position.clone() },
      uPos: { value: maps.position },
      uNor: { value: maps.normal },
      uEdge: { value: 1 },
      uCut: { value: 4 },
      uRestRatio: { value: 1 },
      uMapSize: { value: new THREE.Vector2(MAP_W, MAP_H) },
      uLightOn: { value: 1 },
      uLightPos: { value: new THREE.Vector3(-2, 8.5, 11) },
      uLightColor: { value: new THREE.Color('#ffd9a6') },
      uRestL: { value: new THREE.Vector3(-0.35, 0.72, 0.6).normalize() },
      uSheen: { value: 0.1 },
      uSheenPow: { value: 6 },
      uSpec: { value: 0.35 },
      uSpecPow: { value: 48 },
      uShade: { value: 0.12 },
      uGlint: { value: 1.6 },
      uGlintPow: { value: 24 },
      uGlintLocal: { value: 0.5 },
      uPointerUv: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: MAP_H / MAP_W },
      uDebug: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  })
  material.toneMapped = false
  return material
}

export type PlateMaterial = ReturnType<typeof createPlateMaterial>
