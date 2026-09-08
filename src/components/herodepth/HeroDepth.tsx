import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'

import { loadConfig, saveConfig } from './config'
import type { HeroDepthConfig } from './config'
import { Backing } from './Backing'
import { boxMatrix, DEFAULT_DIMS, topRoundedBoxGeometry } from './boxGeometry'
import { BoxesOnly } from './BoxesOnly'
import { LabPanel } from './LabPanel'
import { exportBoxesPNG } from './exportBoxes'
import { buildDepthMaps } from './maps'
import type { DepthMaps, SceneMesh } from './maps'
import { Plate } from './Plate'
import { createPlateMaterial } from './plateMaterial'
import type { PlateMaterial } from './plateMaterial'
import { Rig } from './Rig'
import type { PointerState } from './Rig'
import { CAMERA, setPlateCam, STRUCTURE_CENTER, UNIT } from './scene'
import { MeshEdges } from './MeshEdges'
import type { Role } from './scene'
import '../hero3d/hero3d.css'
import './hero-depth.css'

/* ------------------------------------------------------------------
   Scene (inside the Canvas)
   ------------------------------------------------------------------ */

/**
 * Runs before drei pre-uploads the textures: the render lands on the GPU as
 * sRGB, the packed 16-bit depth map as raw, unfiltered bytes.
 */
function prepareTextures(loaded: THREE.Texture | THREE.Texture[]) {
  const [render, depth, boxes] = Array.isArray(loaded) ? loaded : [loaded]
  // every colour plate is sRGB; leaving one raw lifts it to a washed grey
  for (const t of [render, boxes]) {
    if (!t) continue
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.needsUpdate = true
  }
  if (depth) {
    depth.colorSpace = THREE.NoColorSpace
    depth.generateMipmaps = false
    depth.minFilter = THREE.NearestFilter
    depth.magFilter = THREE.NearestFilter
    depth.needsUpdate = true
  }
}

interface SceneProps {
  config: HeroDepthConfig
  pointer: React.RefObject<PointerState>
  introNonce: number
}

/** Blender object names → roles (three.js strips the dots from glTF node names) */
const ROLES: Record<string, Role> = { Cube: 'slab', Plane: 'personal', Plane001: 'business', Plane002: 'payments' }
const roleOf = (name: string) => ROLES[name.replace(/[^a-zA-Z0-9]/g, '')]

function Scene({ config, pointer, introNonce }: SceneProps) {
  const gl = useThree((s) => s.gl)
  const [renderImage, depthImage, boxesImage] = useTexture(
    ['/projection-blocks.png', '/projection-blocks-depth.png', '/utex-boxes-bronze.png'],
    prepareTextures,
  )
  const plateCfg = config.plate
  const image = plateCfg.source === 'boxes' ? boxesImage : renderImage
  const gltf = useGLTF('/utex-scene.glb')

  // the friend's mesh, scaled to the hero's units, as bare geometry + world matrices,
  // with the lab's per-box hand-match applied (scale about the box's own centre, then move)
  const boxes = config.boxes
  const geom = config.geometry
  const meshes = useMemo<SceneMesh[]>(() => {
    // real boxes, built from dimensions — the glTF mesh was modelled against a
    // render that isn't a physically consistent solid, so it can't be squared up
    if (geom.procedural) {
      return (Object.keys(DEFAULT_DIMS) as Role[]).map((role) => ({
        role,
        geometry: topRoundedBoxGeometry(geom.dims[role].w, geom.dims[role].h, geom.dims[role].d, geom.radius),
        matrixWorld: boxMatrix(geom.dims[role]),
      }))
    }
    const root = gltf.scene
    root.scale.setScalar(UNIT)
    root.updateMatrixWorld(true)
    const out: SceneMesh[] = []
    root.traverse((o) => {
      const m = o as THREE.Mesh
      const role = roleOf(m.name)
      if (!m.isMesh || !role) return
      let matrixWorld = m.matrixWorld.clone()
      const t = boxes?.[role]
      if (t && (t.tx !== 0 || t.ty !== 0 || t.tz !== 0 || t.sx !== 1 || t.sy !== 1 || t.sz !== 1)) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
        const c = m.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(matrixWorld)
        matrixWorld = new THREE.Matrix4()
          .makeTranslation(c.x + t.tx, c.y + t.ty, c.z + t.tz)
          .multiply(new THREE.Matrix4().makeScale(t.sx, t.sy, t.sz))
          .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z))
          .multiply(matrixWorld)
      }
      out.push({ role, geometry: m.geometry, matrixWorld })
    })
    if (out.length !== 4) console.warn('hero-depth: expected 4 meshes, found', out.map((m) => m.role))
    return out
  }, [gltf, boxes, geom])

  // procedural geometries are ours to free; the glTF's belong to the loader
  useEffect(() => {
    if (!geom.procedural) return
    const owned = meshes.map((m) => m.geometry)
    return () => owned.forEach((g) => g.dispose())
  }, [meshes, geom.procedural])

  // The maps are GPU work with a real lifetime, so they live in an effect
  // (StrictMode's mount/unmount/mount would otherwise dispose a memoised one).
  const [plate, setPlate] = useState<{ maps: DepthMaps; material: PlateMaterial } | null>(null)
  useEffect(() => {
    // the depth pass, the ray origin and the plate's size must all be the camera
    // the plate image was actually shot from — set it before anything is built
    setPlateCam(
      plateCfg.source === 'boxes'
        ? { yaw: plateCfg.yaw, pitch: plateCfg.pitch, widthFraction: plateCfg.widthFraction }
        : null,
    )
    const maps = buildDepthMaps(gl, meshes)
    const material = createPlateMaterial(image, depthImage, maps)
    setPlate({ maps, material })
    ;(window as unknown as { __hd?: unknown }).__hd = { gl, maps, material, scene: { CAMERA, STRUCTURE_CENTER } }
    ;(window as unknown as { __hdExportBoxes?: unknown }).__hdExportBoxes = (mode: 'clay' | 'lines') =>
      exportBoxesPNG(gl, meshes, mode, {
        locked: config.view.locked,
        yaw: config.view.yaw,
        pitch: config.view.pitch,
        widthFraction: config.framing.widthFraction,
      })
    return () => {
      material.dispose()
      maps.dispose()
    }
  }, [gl, image, depthImage, meshes, plateCfg])

  useEffect(() => {
    gl.toneMapping = THREE.NoToneMapping
  }, [gl])

  return (
    <>
      <color attach="background" args={['#000000']} />
      <Rig config={config} pointer={pointer} introNonce={introNonce} />
      <Backing
        meshes={meshes}
        visible={config.depth.backing && config.show.debug !== 'boxes'}
        color={config.depth.backingColor}
        depthScale={config.depth.scale}
      />
      {plate && config.show.debug !== 'boxes' && (
        <Plate config={config} material={plate.material} pointer={pointer} introNonce={introNonce} />
      )}
      <BoxesOnly meshes={meshes} visible={config.show.debug === 'boxes'} lines={0} />
      <MeshEdges meshes={meshes} visible={config.show.debug === 'mesh'} depthScale={config.depth.scale} />
    </>
  )
}

/* ------------------------------------------------------------------
   Hero shell: canvas behind, copy in front, lab on the side
   ------------------------------------------------------------------ */

export function HeroDepth() {
  const [config, setConfig] = useState<HeroDepthConfig | null>(null)
  const [introNonce, setIntroNonce] = useState(1)
  const [labOpen, setLabOpen] = useState(true)
  const [hasLab, setHasLab] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const pointer = useRef<PointerState>({ x: 0, y: 0, reduced: false })

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const loaded = loadConfig()
    const debug = q.get('debug')
    if (debug && ['none', 'mesh', 'depth', 'normal', 'mask', 'light', 'edges', 'wire'].includes(debug)) {
      loaded.show = { ...loaded.show, debug: debug as HeroDepthConfig['show']['debug'] }
    }
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
    <div className="h3d hd" ref={heroRef}>
      <div className="h3d-canvas">
        {config && (
          <Canvas
            dpr={[1, 2]}
            camera={{ manual: true, fov: 30, near: 0.5, far: 200, position: [0, 4, 20] }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
          >
            <Suspense fallback={null}>
              <Scene config={config} pointer={pointer} introNonce={introNonce} />
            </Suspense>
          </Canvas>
        )}
      </div>

      {overlaySrc && config && (
        <img src={overlaySrc} alt="" className="h3d-overlay" style={{ opacity: config.show.overlayOpacity }} />
      )}

      <div className="h3d-chrome" hidden={config?.show.debug === 'boxes'}>
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
