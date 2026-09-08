import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'

import { loadConfig, saveConfig } from './config'
import type { Hero3DConfig } from './config'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import {
  createBronzeMaterial,
  createBronzeUniforms,
  createGlassMaterial,
  createGoldMaterial,
  createProjectedMaterial,
  createProjectorCamera,
} from './materials'
import { LabPanel } from './LabPanel'
import { Rig } from './Rig'
import type { PointerState } from './Rig'
import { Structure } from './Structure'
import './hero3d.css'

const TONE = {
  neutral: THREE.NeutralToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  none: THREE.NoToneMapping,
} as const

/* ------------------------------------------------------------------
   Scene (inside the Canvas)
   ------------------------------------------------------------------ */

interface SceneProps {
  config: Hero3DConfig
  pointer: React.RefObject<PointerState>
  introNonce: number
}

function Scene({ config, pointer, introNonce }: SceneProps) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    ;(window as unknown as { __h3dGl?: THREE.WebGLRenderer }).__h3dGl = gl
  }, [gl])
  const texture = useTexture('/projection-blocks.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  const projector = useMemo(() => createProjectorCamera(), [])
  const uniforms = useMemo(() => createBronzeUniforms(texture, projector), [texture, projector])
  const materials = useMemo(
    () => ({
      projected: createProjectedMaterial(texture, projector),
      pbr: createBronzeMaterial(uniforms, false),
      hybrid: createBronzeMaterial(uniforms, true),
      glass: createGlassMaterial(),
      gold: createGoldMaterial(),
    }),
    [texture, projector, uniforms],
  )
  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose())
    },
    [materials],
  )

  // Push the lab values into the materials.
  useEffect(() => {
    const { material, gold, projection } = config
    for (const m of [materials.pbr, materials.hybrid]) {
      m.color.set(material.color)
      m.roughness = material.roughness
      m.metalness = material.metalness
      m.envMapIntensity = material.envIntensity
    }
    uniforms.uGrain.value = material.grain
    uniforms.uMottle.value = material.mottle
    uniforms.uGoldColor.value.set(gold.color)
    uniforms.uGoldCenter.value = gold.center
    uniforms.uGoldWidth.value = gold.width
    uniforms.uGoldStrength.value = gold.strength
    uniforms.uGoldDirectional.value = gold.directional
    uniforms.uGoldTop.value = gold.topWeight
    uniforms.uGoldFrontOnly.value = gold.frontOnly ? 1 : 0
    uniforms.uProjEmissive.value = projection.emissive
    uniforms.uProjAlbedo.value = projection.albedo
    uniforms.uProjFrontOnly.value = projection.frontOnly ? 1 : 0
  }, [config, materials, uniforms])

  // Renderer grade (the composer takes over tone mapping when post is on).
  useEffect(() => {
    gl.toneMapping = config.show.post ? THREE.NoToneMapping : TONE[config.lights.toneMap]
    gl.toneMappingExposure = config.lights.exposure
    gl.shadowMap.enabled = config.lights.shadows
    gl.shadowMap.type = THREE.PCFShadowMap
  }, [gl, config.show.post, config.lights.toneMap, config.lights.exposure, config.lights.shadows])

  const blockMaterial = materials[config.mode]

  return (
    <>
      <color attach="background" args={['#020202']} />
      <Rig config={config} pointer={pointer} />
      <Lighting config={config} />
      <Structure
        config={config}
        blockMaterial={blockMaterial}
        glassMaterial={materials.glass}
        cardMaterial={materials.gold}
        introNonce={introNonce}
      />
      {config.show.post && <Effects config={config} />}
    </>
  )
}

/* ------------------------------------------------------------------
   Hero shell: canvas behind, copy in front, lab on the side
   ------------------------------------------------------------------ */

export function Hero3D() {
  const [config, setConfig] = useState<Hero3DConfig | null>(null)
  const [introNonce, setIntroNonce] = useState(1)
  const [labOpen, setLabOpen] = useState(true)
  const [hasLab, setHasLab] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const pointer = useRef<PointerState>({ x: 0, y: 0, reduced: false })

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const loaded = loadConfig()
    const mode = q.get('mode')
    if (mode === 'projected' || mode === 'pbr' || mode === 'hybrid') loaded.mode = mode
    setConfig(loaded)
    if (q.get('lab') === '0') setHasLab(false)
  }, [])

  useEffect(() => {
    if (config) saveConfig(config)
  }, [config])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    pointer.current.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (pointer.current.reduced) return

    let raf: number | null = null
    let cx = 0
    let cy = 0
    const tick = () => {
      const p = pointer.current
      cx += (p.x - cx) * 0.08
      cy += (p.y - cy) * 0.08
      if (copyRef.current) {
        copyRef.current.style.transform = `translate3d(${(cx * 10).toFixed(2)}px,${(cy * 6).toFixed(2)}px,0)`
      }
      if (Math.abs(p.x - cx) > 0.0005 || Math.abs(p.y - cy) > 0.0005) raf = requestAnimationFrame(tick)
      else raf = null
    }
    const kick = () => {
      if (raf === null) raf = requestAnimationFrame(tick)
    }
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect()
      pointer.current.x = (e.clientX - r.left) / r.width - 0.5
      pointer.current.y = (e.clientY - r.top) / r.height - 0.5
      kick()
    }
    const onLeave = () => {
      pointer.current.x = 0
      pointer.current.y = 0
      kick()
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  const overlaySrc =
    config?.show.overlay === 'blocks'
      ? '/projection-blocks.png'
      : config?.show.overlay === 'hero'
        ? '/hero-reference.png'
        : null

  return (
    <div className="h3d" ref={heroRef}>
      <div className="h3d-canvas">
        {config && (
          <Canvas
            shadows
            dpr={[1, 1.75]}
            camera={{ manual: true, fov: config.framing.fov, near: 0.5, far: 200, position: [0, 4, 20] }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
          >
            <Suspense fallback={null}>
              <Scene config={config} pointer={pointer} introNonce={introNonce} />
            </Suspense>
          </Canvas>
        )}
      </div>

      {overlaySrc && config && (
        <img
          src={overlaySrc}
          alt=""
          className="h3d-overlay"
          style={{ opacity: config.show.overlayOpacity }}
        />
      )}

      <div className="h3d-chrome">
        <nav className="h3d-nav">
          <div className="h3d-logo">
            <span className="u">UTEX</span>
            <span className="p">PAY</span>
          </div>
          <div className="h3d-links">
            <a href="#">Banking</a>
            <a href="#">Payments</a>
            <a href="#">Developers</a>
            <a href="#">Pricing</a>
          </div>
          <div className="h3d-navr">
            <a href="#">Log in</a>
            <a className="h3d-btn h3d-btn-gold" href="#">
              Sign up
            </a>
          </div>
        </nav>

        <div className="h3d-copy" ref={copyRef}>
          <div className="h3d-eyebrow">START WITH WHAT YOU NEED</div>
          <h1>
            Start with an account.
            <br />
            Grow into everything.
          </h1>
          <p className="h3d-sub">
            Add business banking and card payments when you're ready.
            <br />
            Your money stays in the same place.
          </p>
          <div className="h3d-cta">
            <a className="h3d-btn h3d-btn-gold" href="#">
              Open an account
            </a>
            <a className="h3d-btn h3d-btn-ghost" href="#">
              See how it works
            </a>
          </div>
          <div className="h3d-assur">
            <span>
              <i>✓</i>Licensed EMI
            </span>
            <span>
              <i>✓</i>Built for business
            </span>
            <span>
              <i>✓</i>Payments when you're ready
            </span>
          </div>
        </div>
      </div>

      {config && hasLab && labOpen && (
        <LabPanel
          config={config}
          onChange={setConfig}
          onReplayIntro={() => setIntroNonce((n) => n + 1)}
          onClose={() => setLabOpen(false)}
        />
      )}
      {config && hasLab && !labOpen && (
        <button type="button" className="h3d-labtoggle" onClick={() => setLabOpen(true)}>
          Lab
        </button>
      )}
    </div>
  )
}
