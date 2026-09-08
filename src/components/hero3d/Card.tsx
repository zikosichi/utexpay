import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

import { FRONT_Z, SLAB_TOP } from './geometry'
import { CardFace } from './Panels'
import { DISTANCE_FACTOR, PPU } from './Structure'

const CARD_W = 1.62
const CARD_H = 2.58
const CARD_T = 0.05

interface CardProps {
  material: THREE.Material
  visible: boolean
}

/** Gold card leaning on the Business / Payments seam. */
export function Card({ material, visible }: CardProps) {
  const geometry = useMemo(() => new RoundedBoxGeometry(CARD_W, CARD_H, CARD_T, 4, 0.16), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const lean = -0.11
  return (
    <group
      visible={visible}
      position={[1.52, SLAB_TOP + CARD_H / 2 - 0.02, FRONT_Z + 0.3]}
      rotation={[lean, -0.16, 0.025]}
    >
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <Html
        transform
        center
        distanceFactor={DISTANCE_FACTOR}
        position={[0, 0, CARD_T / 2 + 0.004]}
        zIndexRange={[2, 1]}
        style={{ pointerEvents: 'none' }}
        className={`h3d-html ${visible ? 'is-on' : ''}`}
      >
        <div style={{ width: CARD_W * PPU, height: CARD_H * PPU }}>
          <CardFace />
        </div>
      </Html>
    </group>
  )
}
