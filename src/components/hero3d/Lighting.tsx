import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

import type { Hero3DConfig } from './config'
import { SLAB, SLAB_TOP, STRUCTURE_CENTER } from './geometry'

if (typeof window !== 'undefined') RectAreaLightUniformsLib.init()

interface LightingProps {
  config: Hero3DConfig
}

/**
 * Studio setup: one big warm softbox above and in front (the top-to-bottom
 * wash on the faces), a narrow rim strip top-right, a cool whisper of fill
 * from the left, and a floor bounce. The same formers feed the environment
 * map, so reflections and direct light agree.
 */
export function Lighting({ config }: LightingProps) {
  const { lights } = config
  const key = useRef<THREE.RectAreaLight>(null)

  useEffect(() => {
    key.current?.lookAt(...STRUCTURE_CENTER)
  }, [])

  // Environment renders its children once; remount when the values change.
  const envKey = `${lights.key}-${lights.rim}`

  return (
    <>
      <ambientLight intensity={lights.ambient} color="#4a3b2b" />
      <rectAreaLight
        ref={key}
        args={['#ffd8ad', lights.key * 0.6, 20, 8]}
        position={[-1, 9, 9]}
      />
      <directionalLight
        castShadow={lights.shadows}
        position={[-7, 12, 9]}
        intensity={lights.fill}
        color="#ffe2c0"
        shadow-mapSize={[2048, 2048]}
        shadow-radius={5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={8}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />

      <Environment key={envKey} resolution={256} frames={1}>
        {/* Big softbox just above camera height, behind the camera: the upper
            part of every front face mirrors it, which is the top-bright
            gradient in the reference render. */}
        <Lightformer
          form="rect"
          intensity={lights.key * 0.4}
          color="#ffd6a4"
          position={[0, 7.5, 20]}
          scale={[30, 11, 1]}
          target={[0, 2.5, 0]}
        />
        <Lightformer
          form="rect"
          intensity={lights.rim}
          color="#fff1dc"
          position={[9, 8, -6]}
          scale={[7, 3, 1]}
          target={[0, 3, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.45}
          color="#9fb0c9"
          position={[-16, 4, 2]}
          scale={[4, 6, 1]}
          target={[0, 2, 0]}
        />
        <Lightformer
          form="circle"
          intensity={0.3}
          color="#c99a5c"
          position={[0, -8, 6]}
          scale={[10, 10, 1]}
          target={[0, 2, 0]}
        />
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#050403" side={THREE.BackSide} />
        </mesh>
      </Environment>

      <ContactShadows
        position={[SLAB.x, SLAB_TOP + 0.002, 0]}
        scale={[SLAB.width + 2, SLAB.depth + 2]}
        blur={2.4}
        opacity={0.55}
        far={4.5}
        resolution={512}
        frames={Infinity}
        color="#000000"
      />
    </>
  )
}
