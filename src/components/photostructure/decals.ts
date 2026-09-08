import * as THREE from 'three'
import { surfaceGrid } from './surfaces'
import type { SurfaceSpec } from './surfaces'

/**
 * A baked panel image lying on the bronze. The image is premultiplied on
 * upload and composited ONE / ONE_MINUS_SRC_ALPHA straight onto the sRGB-encoded
 * output — the same arithmetic the browser used when the panel was a DOM layer
 * over the canvas, so the bake matches at rest. In motion the GPU resamples it
 * with mipmaps and anisotropic filtering instead of Chrome re-rasterizing six
 * projective layers every frame.
 */
export function decalMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null as THREE.Texture | null }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() { gl_FragColor = texture2D(uMap, vUv) * uOpacity; }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  })
}

/** Sampling setup for a baked panel: premultiplied, filtered in the encoded space it was painted in. */
export function prepareDecalTexture(texture: THREE.Texture, maxAnisotropy: number) {
  texture.premultiplyAlpha = true
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = Math.min(16, maxAnisotropy)
  texture.needsUpdate = true
  return texture
}

export type Decal = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>

export function createDecal(mesh: THREE.Mesh, projector: THREE.OrthographicCamera, spec: SurfaceSpec): Decal {
  const grid = surfaceGrid(mesh, projector, spec)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(grid.uvs, 2))
  geometry.setIndex(grid.indices)
  const decal: Decal = new THREE.Mesh(geometry, decalMaterial())
  decal.visible = false
  decal.renderOrder = 1
  return decal
}

export function paintDecal(decal: Decal, texture: THREE.Texture) {
  decal.material.uniforms.uMap.value = texture
  decal.visible = true
}
