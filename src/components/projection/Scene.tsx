import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, RoundedBox, useTexture } from '@react-three/drei'

import type { ProjectionConfig } from './config'
import { createProjectedMaterial, updateProjectorUniforms } from './projectedMaterial'

interface SceneProps {
  config: ProjectionConfig
  /** Incremented by the panel to snap the view camera to the projector pose. */
  matchNonce: number
}

export function Scene({ config, matchNonce }: SceneProps) {
  const { projector, blocks, view } = config
  const camera = useThree((s) => s.camera)

  const texture = useTexture('/projection-blocks.png')
  texture.colorSpace = THREE.SRGBColorSpace

  const material = useMemo(() => createProjectedMaterial(texture), [texture])
  useEffect(() => () => material.dispose(), [material])

  // Plain lit material for inspecting the geometry itself, without projection.
  const clayMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9c8a6e', roughness: 0.6, metalness: 0.15 }),
    [],
  )
  useEffect(() => () => clayMaterial.dispose(), [clayMaterial])

  const projectorCam = useMemo(() => new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 100), [])

  const image = texture.image as { width: number; height: number } | undefined
  const textureAspect = image ? image.width / image.height : 16 / 9

  useEffect(() => {
    projectorCam.position.set(...projector.position)
    projectorCam.fov = projector.fov
    projectorCam.aspect = textureAspect
    projectorCam.lookAt(...projector.target)
    updateProjectorUniforms(material, projectorCam)
  }, [material, projectorCam, projector, textureAspect])

  useEffect(() => {
    material.wireframe = view.wireframe
    clayMaterial.wireframe = view.wireframe
  }, [material, clayMaterial, view.wireframe])

  // Snap the viewing camera to the projector pose (for overlay alignment).
  // The OrbitControls below are remounted (via key) so their target resets too.
  useEffect(() => {
    if (matchNonce === 0) return
    camera.position.set(...projector.position)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = projector.fov
      camera.updateProjectionMatrix()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchNonce])

  // Pointer parallax preview: orbit gently around the projector pose.
  const parallaxTarget = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    if (!view.parallax) return
    const base = new THREE.Vector3(...projector.position)
    const target = new THREE.Vector3(...projector.target)
    const dir = base.clone().sub(target)
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize()
    const up = new THREE.Vector3().crossVectors(dir, right).normalize()
    parallaxTarget
      .copy(base)
      .addScaledVector(right, -state.pointer.x * view.parallaxAmount)
      .addScaledVector(up, state.pointer.y * view.parallaxAmount * 0.6)
    camera.position.lerp(parallaxTarget, 0.06)
    camera.lookAt(target)
  })

  const helper = useMemo(() => new THREE.CameraHelper(projectorCam), [projectorCam])
  useEffect(() => () => helper.dispose(), [helper])
  useFrame(() => {
    if (view.showHelper) helper.update()
  })

  return (
    <>
      <color attach="background" args={['#020202']} />

      {view.clayView && (
        <>
          <hemisphereLight args={['#cdbfa4', '#2a231a', 1.6]} />
          <directionalLight position={[6, 10, 8]} intensity={2.8} color="#ffe3b0" />
          <directionalLight position={[-8, 4, -6]} intensity={1.1} color="#8fa0b4" />
        </>
      )}

      {blocks.map((block) => (
        <RoundedBox
          key={block.label}
          args={block.size}
          radius={Math.min(block.radius, Math.min(...block.size) / 2 - 0.001)}
          smoothness={6}
          position={block.position}
          material={view.clayView ? clayMaterial : material}
        />
      ))}

      <primitive object={projectorCam} />
      {view.showHelper && <primitive object={helper} />}

      <OrbitControls
        key={matchNonce}
        enabled={!view.parallax}
        autoRotate={view.autoRotate && !view.parallax}
        autoRotateSpeed={0.6}
        target={matchNonce > 0 ? projector.target : [0, 2.2, 0]}
        enableDamping
      />
    </>
  )
}
