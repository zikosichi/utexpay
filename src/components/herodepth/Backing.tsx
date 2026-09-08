import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import type { SceneMesh } from './maps'
import { PIVOT_Z, PLATE_CAM } from './scene'

interface BackingProps {
  meshes: SceneMesh[]
  visible: boolean
  color: string
  /** same deepening as the plate, along the rest camera's rays about the pivot plane */
  depthScale: number
}

/**
 * The mesh once more, in flat dark bronze, drawn before the plate without
 * writing depth and deepened along the same rays. Wherever the camera
 * moves far enough to look past a silhouette into pixels the render never
 * had, it sees this instead of the black canvas.
 */
export function Backing({ meshes, visible, color, depthScale }: BackingProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
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
          uniform vec3 uColor;
          void main() {
            gl_FragColor = vec4(uColor, 1.0);
            #include <colorspace_fragment>
          }
        `,
        // no depth writes: the plate always passes against it, yet still
        // resolves its own folds along edge-on faces with the depth test
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => {
    ;(material.uniforms.uColor.value as THREE.Color).set(color)
    material.uniforms.uDepthScale.value = depthScale
  }, [material, color, depthScale])
  useEffect(() => () => material.dispose(), [material])

  return (
    <group visible={visible}>
      {meshes.map((m) => (
        <mesh
          key={m.role}
          geometry={m.geometry}
          material={material}
          matrixAutoUpdate={false}
          matrix={m.matrixWorld}
          renderOrder={-1}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}
