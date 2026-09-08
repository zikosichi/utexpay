import * as THREE from 'three'

import { createRestCamera } from './maps'
import type { SceneMesh } from './maps'
import { MAP_H, MAP_W, viewCamera } from './scene'

export type BoxExportMode = 'clay' | 'lines'

/**
 * The bare boxes, rendered through the rest camera at the render's own
 * resolution — so anything drawn from this image lands back on the plate
 * pixel for pixel. Shot offscreen, so the live hero is untouched.
 */
export interface BoxExportView {
  locked: boolean
  yaw: number
  pitch: number
  widthFraction: number
}

export function exportBoxesPNG(
  gl: THREE.WebGLRenderer,
  meshes: SceneMesh[],
  mode: BoxExportMode,
  view: BoxExportView,
) {
  const target = new THREE.WebGLRenderTarget(MAP_W, MAP_H, { samples: 4 })
  target.texture.colorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(mode === 'lines' ? 0xffffff : 0x000000)

  const clay = new THREE.ShaderMaterial({
    uniforms: { uFlat: { value: mode === 'lines' ? 1 : 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      void main() {
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFlat;
      varying vec3 vN;
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        float lam = clamp(dot(n, normalize(vec3(-0.35, 0.82, 0.45))), 0.0, 1.0);
        gl_FragColor = vec4(vec3(mix(0.20 + 0.68 * lam, 1.0, uFlat)), 1.0);
      }
    `,
    side: THREE.DoubleSide,
  })
  const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 })
  const owned: THREE.BufferGeometry[] = []
  for (const m of meshes) {
    const mesh = new THREE.Mesh(m.geometry, clay)
    mesh.matrixAutoUpdate = false
    mesh.matrix.copy(m.matrixWorld)
    scene.add(mesh)
    const eg = new THREE.EdgesGeometry(m.geometry, 16)
    owned.push(eg)
    const ls = new THREE.LineSegments(eg, lineMat)
    ls.matrixAutoUpdate = false
    ls.matrix.copy(m.matrixWorld)
    scene.add(ls)
  }

  const prevTarget = gl.getRenderTarget()
  gl.setRenderTarget(target)
  // locked -> exactly the view you framed; unlocked -> the camera the render was solved for
  const cam = view.locked
    ? viewCamera(view.yaw, view.pitch, view.widthFraction, MAP_W / MAP_H)
    : createRestCamera()
  gl.render(scene, cam)
  const buf = new Uint8Array(MAP_W * MAP_H * 4)
  gl.readRenderTargetPixels(target, 0, 0, MAP_W, MAP_H, buf)
  gl.setRenderTarget(prevTarget)

  // readRenderTargetPixels is bottom-up; a canvas is top-down
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(MAP_W, MAP_H)
  for (let y = 0; y < MAP_H; y++) {
    const src = (MAP_H - 1 - y) * MAP_W * 4
    img.data.set(buf.subarray(src, src + MAP_W * 4), y * MAP_W * 4)
  }
  ctx.putImageData(img, 0, 0)
  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `utex-boxes-${mode}${view.locked ? `-yaw${Math.round(view.yaw)}-pitch${Math.round(view.pitch)}` : '-rest'}-${MAP_W}x${MAP_H}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }, 'image/png')

  target.dispose()
  clay.dispose()
  lineMat.dispose()
  owned.forEach((g) => g.dispose())
}
