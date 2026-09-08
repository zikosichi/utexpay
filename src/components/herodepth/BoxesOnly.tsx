import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import type { SceneMesh } from './maps'

interface BoxesOnlyProps {
  meshes: SceneMesh[]
  visible: boolean
  /** 0 = clay only, 1 = lines only */
  lines: number
}

/**
 * The bare matched boxes: flat clay shading plus crease/silhouette lines,
 * with nothing of the render on them. This is the view to hand to an image
 * model — it states the geometry unambiguously and hides nothing behind a
 * texture. Shot from the live camera, so frame it with the rest view.
 */
export function BoxesOnly({ meshes, visible, lines }: BoxesOnlyProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uLines: { value: lines } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uLines;
          varying vec3 vN;
          void main() {
            vec3 n = normalize(vN);
            if (!gl_FrontFacing) n = -n;
            float lam = clamp(dot(n, normalize(vec3(-0.35, 0.82, 0.45))), 0.0, 1.0);
            float c = mix(0.20 + 0.68 * lam, 1.0, uLines);
            gl_FragColor = vec4(vec3(c), 1.0);
          }
        `,
        side: THREE.DoubleSide,
      }),
    [],
  )
  useEffect(() => {
    material.uniforms.uLines.value = lines
  }, [material, lines])
  useEffect(() => () => material.dispose(), [material])

  const edges = useMemo(
    () => meshes.map((m) => ({ geo: new THREE.EdgesGeometry(m.geometry, 16), matrixWorld: m.matrixWorld })),
    [meshes],
  )
  useEffect(() => () => edges.forEach((e) => e.geo.dispose()), [edges])

  if (!visible) return null
  return (
    <group>
      {meshes.map((m, i) => (
        <mesh key={`f${i}`} geometry={m.geometry} material={material} matrixAutoUpdate={false} matrix={m.matrixWorld} />
      ))}
      {edges.map((e, i) => (
        <lineSegments key={`e${i}`} geometry={e.geo} matrixAutoUpdate={false} matrix={e.matrixWorld}>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      ))}
    </group>
  )
}
