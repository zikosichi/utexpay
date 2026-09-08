import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

import type { Hero3DConfig } from './config'

const MODES = {
  neutral: ToneMappingMode.NEUTRAL,
  aces: ToneMappingMode.ACES_FILMIC,
  agx: ToneMappingMode.AGX,
} as const

export function Effects({ config }: { config: Hero3DConfig }) {
  const { show, lights } = config
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={show.bloom}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.25}
        radius={0.65}
      />
      {lights.toneMap === 'none' ? <></> : <ToneMapping mode={MODES[lights.toneMap]} />}
      <Vignette offset={0.18} darkness={show.vignette} />
      <Noise opacity={show.grainFx} premultiply />
    </EffectComposer>
  )
}
