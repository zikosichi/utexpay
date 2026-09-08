import * as THREE from 'three'

import { BLOCK_ID, MAP_ASPECT, MAP_H, MAP_W, PLATE_CAM } from './scene'
import type { Role } from './scene'

export interface DepthMaps {
  /** rgb = world position seen through that pixel, a = 1 on the structure, 0 on the background */
  position: THREE.Texture
  /** rgb = world normal, a = same mask */
  normal: THREE.Texture
  /** the underlying targets (debug read-back) */
  targets: { position: THREE.WebGLRenderTarget; normal: THREE.WebGLRenderTarget }
  dispose(): void
}

/** the structure's meshes, with their world matrices already applied */
export interface SceneMesh {
  role: Role
  geometry: THREE.BufferGeometry
  matrixWorld: THREE.Matrix4
}

/** The camera the plate image was shot from — the solved render camera, or a bake's view. */
export function createRestCamera() {
  const cam = new THREE.PerspectiveCamera(PLATE_CAM.vfov, MAP_ASPECT, 0.1, 200)
  cam.position.copy(PLATE_CAM.position)
  cam.quaternion.copy(PLATE_CAM.quaternion)
  cam.updateMatrixWorld(true)
  cam.updateProjectionMatrix()
  return cam
}

/* ------------------------------------------------------------------
   G-buffer pass: the mesh seen from the rest camera
   ------------------------------------------------------------------ */

const gbufferVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const positionFragment = /* glsl */ `
  uniform float uMask;
  varying vec3 vWorld;
  void main() {
    gl_FragColor = vec4(vWorld, uMask);
  }
`

const normalFragment = /* glsl */ `
  uniform float uMask;
  varying vec3 vNormal;
  void main() {
    gl_FragColor = vec4(normalize(vNormal), uMask);
  }
`

/* ------------------------------------------------------------------
   Background fill. The render's background is pure black, so those
   pixels can sit at any depth without being seen — the best place is
   the nearest structure pixel's face plane: every silhouette then moves
   as one piece with its block and no gap can open at it, and the few
   pixels where the render runs past the mesh sit on the right surface.
   Nearest-seed lookup is a jump flood over a seed-coordinate map.
   ------------------------------------------------------------------ */

const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const rayGLSL = /* glsl */ `
  uniform mat4 uInvProjView;
  uniform vec3 uCamPos;
  uniform vec3 uCamForward;
  vec3 rayDir(vec2 uv) {
    vec4 far = uInvProjView * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    return normalize(far.xyz / far.w - uCamPos);
  }
`

/** seeds: xy = pixel centre of the nearest structure texel found so far, z = 1 if any */
const jfaInitFragment = /* glsl */ `
  uniform sampler2D uSrc;
  varying vec2 vUv;
  void main() {
    float mask = texture2D(uSrc, vUv).a;
    gl_FragColor = mask > 0.5 ? vec4(gl_FragCoord.xy, 1.0, 1.0) : vec4(-1.0, -1.0, 0.0, 0.0);
  }
`

const jfaStepFragment = /* glsl */ `
  uniform sampler2D uSeed;
  uniform vec2 uTexel;
  uniform float uStep;
  varying vec2 vUv;
  void main() {
    vec2 p = gl_FragCoord.xy;
    vec4 best = texture2D(uSeed, vUv);
    float bestD = best.z > 0.5 ? distance(best.xy, p) : 1e9;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 uv = vUv + vec2(float(x), float(y)) * uStep * uTexel;
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;
        vec4 s = texture2D(uSeed, uv);
        if (s.z > 0.5) {
          float d = distance(s.xy, p);
          if (d < bestD) {
            bestD = d;
            best = s;
          }
        }
      }
    }
    gl_FragColor = best;
  }
`

const resolvePositionFragment = /* glsl */ `
  uniform sampler2D uSeed;
  uniform sampler2D uPos;
  uniform sampler2D uNor;
  uniform vec2 uTexel;
  ${rayGLSL}
  varying vec2 vUv;
  void main() {
    vec4 own = texture2D(uPos, vUv);
    vec4 seed = texture2D(uSeed, vUv);
    if (own.a > 0.5 || seed.z < 0.5) {
      gl_FragColor = own;
      return;
    }
    vec2 seedUv = seed.xy * uTexel;
    vec3 S = texture2D(uPos, seedUv).xyz;
    vec3 nS = normalize(texture2D(uNor, seedUv).xyz);
    vec3 dir = rayDir(vUv);
    float tDepth = dot(S - uCamPos, uCamForward) / max(dot(dir, uCamForward), 1e-4);
    float denom = dot(dir, nS);
    float tPlane = dot(S - uCamPos, nS) / (abs(denom) < 1e-4 ? 1e-4 : denom);
    bool usePlane = abs(denom) > 0.25 && tPlane > 0.7 * tDepth && tPlane < 1.4 * tDepth;
    float t = usePlane ? tPlane : tDepth;
    gl_FragColor = vec4(uCamPos + dir * t, 0.0);
  }
`

/** normals: copy the nearest seed's; mask 0/1 (alpha carries block ids upstream) */
const resolveNormalFragment = /* glsl */ `
  uniform sampler2D uSeed;
  uniform sampler2D uSrc;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec4 own = texture2D(uSrc, vUv);
    vec4 seed = texture2D(uSeed, vUv);
    vec4 near = seed.z > 0.5 ? texture2D(uSrc, seed.xy * uTexel) : own;
    gl_FragColor = vec4(near.xyz, step(0.5, own.a));
  }
`

function makeTarget() {
  return new THREE.WebGLRenderTarget(MAP_W, MAP_H, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
  })
}

const quadMaterial = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: quadVertex, fragmentShader, uniforms, depthTest: false, depthWrite: false })

/**
 * Renders world-position and world-normal maps of the structure from the
 * render's viewpoint, then fills the background with the nearest face
 * planes. Runs once.
 */
export function buildDepthMaps(gl: THREE.WebGLRenderer, meshes: SceneMesh[]): DepthMaps {
  const camera = createRestCamera()
  const scene = new THREE.Scene()
  const disposables: { dispose(): void }[] = []

  const gbufferMaterial = (fragment: string, mask: number) => {
    const m = new THREE.ShaderMaterial({ vertexShader: gbufferVertex, fragmentShader: fragment, uniforms: { uMask: { value: mask } } })
    disposables.push(m)
    return m
  }
  const items = meshes.map((m) => {
    const mesh = new THREE.Mesh(m.geometry)
    mesh.matrixAutoUpdate = false
    mesh.matrix.copy(m.matrixWorld)
    mesh.matrixWorld.copy(m.matrixWorld)
    mesh.frustumCulled = false
    scene.add(mesh)
    const id = BLOCK_ID[m.role]
    return { mesh, position: gbufferMaterial(positionFragment, id), normal: gbufferMaterial(normalFragment, id) }
  })
  // fallback wall so even a pixel with no structure anywhere has a position
  const wallGeometry = new THREE.PlaneGeometry(200, 200)
  disposables.push(wallGeometry)
  const wall = new THREE.Mesh(wallGeometry)
  wall.position.set(0, 0, -8)
  wall.frustumCulled = false
  scene.add(wall)
  const wallMaterials = { position: gbufferMaterial(positionFragment, 0), normal: gbufferMaterial(normalFragment, 0) }

  const target = () => {
    const rt = makeTarget()
    disposables.push(rt)
    return rt
  }
  const rawPos = target()
  const rawNor = target()
  const seedA = target()
  const seedB = target()
  const outPos = makeTarget()
  const outNor = makeTarget()

  const prevTarget = gl.getRenderTarget()
  const prevClear = new THREE.Color()
  gl.getClearColor(prevClear)
  const prevAlpha = gl.getClearAlpha()
  const prevAutoClear = gl.autoClear
  gl.autoClear = true
  gl.setClearColor(new THREE.Color(0, 0, 0), 0)

  // g-buffer passes
  items.forEach((it) => (it.mesh.material = it.position))
  wall.material = wallMaterials.position
  gl.setRenderTarget(rawPos)
  gl.render(scene, camera)
  items.forEach((it) => (it.mesh.material = it.normal))
  wall.material = wallMaterials.normal
  gl.setRenderTarget(rawNor)
  gl.render(scene, camera)

  // full-screen plumbing
  const quadScene = new THREE.Scene()
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quadGeometry = new THREE.PlaneGeometry(2, 2)
  disposables.push(quadGeometry)
  const quad = new THREE.Mesh(quadGeometry)
  quad.frustumCulled = false
  quadScene.add(quad)
  const texel = new THREE.Vector2(1 / MAP_W, 1 / MAP_H)
  const pass = (material: THREE.ShaderMaterial, rt: THREE.WebGLRenderTarget) => {
    quad.material = material
    gl.setRenderTarget(rt)
    gl.render(quadScene, quadCamera)
  }

  // jump flood from the structure's silhouette
  const init = quadMaterial(jfaInitFragment, { uSrc: { value: rawPos.texture } })
  const step = quadMaterial(jfaStepFragment, { uSeed: { value: null }, uTexel: { value: texel }, uStep: { value: 1 } })
  disposables.push(init, step)
  pass(init, seedA)
  let read = seedA
  let write = seedB
  let s = 1
  while (s * 2 < Math.max(MAP_W, MAP_H)) s *= 2
  for (; s >= 1; s = Math.floor(s / 2)) {
    step.uniforms.uSeed.value = read.texture
    step.uniforms.uStep.value = s
    pass(step, write)
    ;[read, write] = [write, read]
  }

  const resolvePosition = quadMaterial(resolvePositionFragment, {
    uSeed: { value: read.texture },
    uPos: { value: rawPos.texture },
    uNor: { value: rawNor.texture },
    uTexel: { value: texel },
    uInvProjView: { value: new THREE.Matrix4().multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse) },
    uCamPos: { value: camera.position.clone() },
    uCamForward: { value: camera.getWorldDirection(new THREE.Vector3()) },
  })
  const resolveNormal = quadMaterial(resolveNormalFragment, {
    uSeed: { value: read.texture },
    uSrc: { value: rawNor.texture },
    uTexel: { value: texel },
  })
  disposables.push(resolvePosition, resolveNormal)
  pass(resolvePosition, outPos)
  pass(resolveNormal, outNor)

  // restore
  gl.setRenderTarget(prevTarget)
  gl.setClearColor(prevClear, prevAlpha)
  gl.autoClear = prevAutoClear
  disposables.forEach((d) => d.dispose())

  return {
    position: outPos.texture,
    normal: outNor.texture,
    targets: { position: outPos, normal: outNor },
    dispose() {
      outPos.dispose()
      outNor.dispose()
    },
  }
}
