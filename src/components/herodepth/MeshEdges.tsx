import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import type { SceneMesh } from './maps'
import { PIVOT_Z, PLATE_CAM } from './scene'

interface MeshEdgesProps {
  meshes: SceneMesh[]
  visible: boolean
  depthScale: number
}

/**
 * The mesh's edges drawn over the plate (magenta), deepened along the same
 * rays as the plate. At rest this is the fit check: every edge should sit
 * on the render's own edge.
 */
export function MeshEdges({ meshes, visible, depthScale }: MeshEdgesProps) {
  const geometries = useMemo(
    () => meshes.map((m) => new THREE.EdgesGeometry(m.geometry, 12)),
    [meshes],
  )
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uDepthScale: { value: depthScale },
          uPivotZ: { value: PIVOT_Z },
          uRestCam: { value: PLATE_CAM.position.clone() },
        },
        vertexShader: /* glsl */ `
          uniform float uDepthScale;
          uniform float uPivotZ;
          uniform vec3 uRestCam;
          void main() {
            vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
            vec3 ray = w - uRestCam;
            float t = length(ray);
            vec3 dir = ray / max(t, 1e-4);
            float tFront = (uPivotZ - uRestCam.z) / min(dir.z, -1e-4);
            w = uRestCam + dir * (tFront + (t - tFront) * uDepthScale);
            gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          void main() {
            gl_FragColor = vec4(1.0, 0.25, 0.55, 1.0);
          }
        `,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    [],
  )
  useEffect(() => {
    material.uniforms.uDepthScale.value = depthScale
  }, [material, depthScale])
  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose())
      material.dispose()
    },
    [geometries, material],
  )

  return (
    <group visible={visible}>
      {meshes.map((m, i) => (
        <lineSegments
          key={m.role}
          geometry={geometries[i]}
          material={material}
          matrixAutoUpdate={false}
          matrix={m.matrixWorld}
          renderOrder={10}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}
