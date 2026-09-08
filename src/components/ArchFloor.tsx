import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

/* ------------------------------------------------------------------
   The gold light-line floor under the arch.

   A single ground plane in a real perspective scene; the fan is drawn
   procedurally in the fragment shader from the plane's world XZ, so the
   lines converge correctly and will keep converging when the camera
   eventually moves.

   The shader only draws a thin, hot filament — the surrounding glow is a
   real bloom pass, which is what makes the lines read as electricity
   rather than as strokes with a soft edge.

   The canvas is opaque black. It composites with `mix-blend-mode: screen`
   (screen against black is a no-op, so only the filaments show) and an
   SVG mask cuts it to the floor and the arch opening. That keeps alpha
   out of the postprocessing chain entirely.
   ------------------------------------------------------------------ */

export type FloorSettings = {
  count: number
  spread: number
  width: number
  bright: number
  speed: number
  bow: number
  snake: number
  snakeFreq: number
  wave: number
  fade: number
  glow: number
  glowRadius: number
  camY: number
  camZ: number
  lookY: number
  originZ: number
  reach: number
}

export const FLOOR_DEFAULTS: FloorSettings = {
  count: 55,
  spread: 35,
  width: 0.008,
  bright: 0.38,
  speed: 0.5,
  bow: 2.55,
  snake: 0.2,
  snakeFreq: 0.67,
  wave: 0.17,
  fade: 17,
  glow: 3.8,
  glowRadius: 0.39,
  camY: 2.35,
  camZ: 5,
  lookY: -1.9,
  originZ: -12,
  reach: 46,
}

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vWorld;

  uniform float uTime;
  uniform float uCount;
  uniform float uSpread;
  uniform float uWidth;
  uniform float uBright;
  uniform float uSpeed;
  uniform float uBow;
  uniform float uSnake;
  uniform float uSnakeFreq;
  uniform float uWave;
  uniform float uFade;
  uniform float uOriginZ;
  uniform float uReach;

  void main() {
    // origin sits behind the arch; +y here is depth toward the camera
    vec2 p = vec2(vWorld.x, vWorld.z - uOriginZ);
    if (p.y <= 0.05) discard;

    float dist = length(p);
    float ang = atan(p.x, p.y);

    // Rays bow outward as they travel, so the fan reads as flowing curves
    // instead of a straight starburst. bend is how much wider the family has
    // splayed by this distance; dividing it out recovers the ray's angle back
    // at the origin, which is what gets quantised into lines.
    float t = clamp(dist / (uReach * 0.5), 0.0, 2.0);
    float bend = 1.0 + uBow * t * t * t;
    float base0 = ang / bend;

    float k = uCount / (2.0 * uSpread);

    // Serpentine: a lateral wave travelling along each line. The phase is a
    // CONTINUOUS function of base0 (not of a discrete ray index) so that
    // neighbouring lines wind out of step without a seam where the index
    // would flip. Dividing by dist turns a world-space displacement into an
    // angle, so the amplitude stays physical at every depth.
    // Neighbours must stay in near-phase: d(wig)/d(base0) has to stay below 1
    // or the mapping folds and lines cross. 0.55 * k keeps adjacent lines
    // about half a radian apart, which reads as a flowing shoal rather than a
    // tangle. The distance clamp stops the amplitude blowing up far away,
    // where the angular scale is tiny.
    // NOT animated: the paths themselves are fixed geometry. Only the charge
    // running along them (below) moves.
    float wig = (uSnake / max(dist, 9.0)) *
                sin(dist * uSnakeFreq + base0 * 0.55 * k);
    float base = base0 + wig;
    if (abs(base) > uSpread) discard;

    float a = base * k;
    float offset = (fract(a) - 0.5) / k;
    // back through the bend, then to a world distance, so every line keeps a
    // constant physical width however far it has curved
    float w = abs(offset * bend) * dist;

    // analytic AA: widen the edge to the pixel footprint so a filament this
    // thin stays smooth instead of stair-stepping
    float aa = fwidth(w) * 0.9;
    float core = 1.0 - smoothstep(uWidth - aa, uWidth + aa, w);
    float sheath = 1.0 - smoothstep(0.0, uWidth * 5.0 + aa, w);

    // where the fan converges the rays fall below a pixel apart and moire;
    // fwidth(a) is how many rays a pixel spans, so fade them out there
    float density = 1.0 - smoothstep(0.22, 0.62, fwidth(a));

    // a charge running outward along each ray, desynchronised by the golden
    // angle, plus two detuned oscillators for an electrical flicker
    float ray = floor(a);
    float phase = dist * uWave - uTime * uSpeed + ray * 2.39996;
    float crest = pow(0.5 + 0.5 * sin(phase), 3.0);
    float flicker = 0.84 + 0.16 * sin(uTime * 7.3 + ray * 5.1) * sin(uTime * 3.1 + ray * 1.7);
    float pulse = (0.55 + 0.8 * crest) * flicker;

    // dissolve into the distance (small dist = far end, up inside the arch)
    float depth = smoothstep(uFade * 0.45, uFade, dist);
    float front = 1.0 - smoothstep(uReach * 0.75, uReach, dist);
    float edge = 1.0 - smoothstep(uSpread * 0.7, uSpread, abs(base));
    float att = depth * front * edge * density;

    float intensity = (core + sheath * 0.14) * pulse * att * uBright;

    // hot white-gold filament falling off to amber, so bloom picks up a warm
    // halo around a near-white centre
    vec3 rgb = mix(vec3(1.0, 0.55, 0.14), vec3(1.0, 0.94, 0.78), core * (0.4 + 0.6 * crest));
    gl_FragColor = vec4(rgb * intensity, 1.0);
  }
`

function Fan({ settings, still }: { settings: FloorSettings; still: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCount: { value: settings.count },
      uSpread: { value: THREE.MathUtils.degToRad(settings.spread) },
      uWidth: { value: settings.width },
      uBright: { value: settings.bright },
      uSpeed: { value: settings.speed },
      uBow: { value: settings.bow },
      uSnake: { value: settings.snake },
      uSnakeFreq: { value: settings.snakeFreq },
      uWave: { value: settings.wave },
      uFade: { value: settings.fade },
      uOriginZ: { value: settings.originZ },
      uReach: { value: settings.reach },
    }),
    // built once; values are pushed every frame below
    [],
  )

  useFrame((_state, delta) => {
    const m = material.current
    if (!m) return
    if (!still) m.uniforms.uTime.value += delta
    m.uniforms.uCount.value = settings.count
    m.uniforms.uSpread.value = THREE.MathUtils.degToRad(settings.spread)
    m.uniforms.uWidth.value = settings.width
    m.uniforms.uBright.value = settings.bright
    m.uniforms.uSpeed.value = settings.speed
    m.uniforms.uBow.value = settings.bow
    m.uniforms.uSnake.value = settings.snake
    m.uniforms.uSnakeFreq.value = settings.snakeFreq
    m.uniforms.uWave.value = settings.wave
    m.uniforms.uFade.value = settings.fade
    m.uniforms.uOriginZ.value = settings.originZ
    m.uniforms.uReach.value = settings.reach
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[400, 400]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function Rig({ settings }: { settings: FloorSettings }) {
  useFrame(({ camera }) => {
    camera.position.set(0, settings.camY, settings.camZ)
    camera.lookAt(0, settings.lookY, settings.originZ)
    camera.updateProjectionMatrix()
  })
  return null
}

export function ArchFloor({ settings, still }: { settings: FloorSettings; still: boolean }) {
  return (
    <Canvas
      className="ah-floor__canvas"
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: false }}
      camera={{ fov: 36, near: 0.1, far: 600, position: [0, settings.camY, settings.camZ] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
      frameloop={still ? 'demand' : 'always'}
    >
      <Rig settings={settings} />
      <Fan settings={settings} still={still} />
      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          intensity={settings.glow}
          radius={settings.glowRadius}
          luminanceThreshold={0}
          luminanceSmoothing={0.15}
        />
      </EffectComposer>
    </Canvas>
  )
}

export default ArchFloor
