import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { bronzeLighting } from './lighting'
import { shelfReflectionShader } from './reflections'

type Point = [number, number]
type Quad = [Point, Point, Point, Point]

// Each material owns a surface chart, in source-image pixels (TL, TR, BR, BL).
// No screen-space projector or depth displacement is involved. The charts stop
// inside the original edges; the silhouette and inlay belong to real geometry.
const CHARTS: { front: Quad; top: Quad }[] = [
  { front: [[132, 537], [608, 502], [608, 704], [132, 733]], top: [[135, 465], [558, 442], [595, 474], [146, 499]] },
  { front: [[647, 441], [1090, 408], [1090, 674], [647, 704]], top: [[639, 380], [1017, 359], [1071, 382], [662, 406]] },
  { front: [[1125, 360], [1582, 336], [1582, 641], [1125, 670]], top: [[1089, 307], [1480, 291], [1547, 310], [1144, 331]] },
  { front: [[120, 800], [1630, 697], [1630, 871], [120, 932]], top: [[145, 753], [1574, 664], [1611, 677], [145, 773]] },
]

/** Exact unit-square → quadrilateral homography, normalized to the source PNG. */
function homography(q: Quad) {
  const [a, b, c, d] = q.map(([x, y]) => [x / 1672, 1 - y / 941])
  const dx1 = b[0] - c[0], dx2 = d[0] - c[0], dx3 = a[0] - b[0] + c[0] - d[0]
  const dy1 = b[1] - c[1], dy2 = d[1] - c[1], dy3 = a[1] - b[1] + c[1] - d[1]
  const det = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const h = (dx1 * dy3 - dx3 * dy1) / det
  return new THREE.Matrix3().set(b[0] - a[0] + g * b[0], d[0] - a[0] + h * d[0], a[0], b[1] - a[1] + g * b[1], d[1] - a[1] + h * d[1], a[1], g, h, 1)
}

export function bronzeSurface(source: THREE.Texture, dims: [number, number, number], chart: number, environment: THREE.WebGLRenderTarget) {
  return new THREE.ShaderMaterial({
    defines: {
      ...(chart === 3 ? { STUDIO_PEDESTAL: '' } : {}),
      ENVMAP_TYPE_CUBE_UV: '',
      CUBEUV_TEXEL_WIDTH: 1 / environment.width,
      CUBEUV_TEXEL_HEIGHT: 1 / environment.height,
      CUBEUV_MAX_MIP: Math.log2(environment.height / 4).toFixed(1),
    },
    uniforms: {
      uImage: { value: source }, uDims: { value: new THREE.Vector3(...dims) },
      uFront: { value: homography(CHARTS[chart].front) }, uTop: { value: homography(CHARTS[chart].top) },
      uReflections: { value: .65 }, uBrightness: { value: 1.05 }, uClay: { value: 0 }, uSlab: { value: chart === 3 ? 1 : 0 },
      uIndex: { value: chart },
      uBlockMin: { value: Array.from({ length: 3 }, () => new THREE.Vector3()) },
      uBlockMax: { value: Array.from({ length: 3 }, () => new THREE.Vector3()) },
      uEnvironment: { value: environment.texture },
      uFrontCharts: { value: CHARTS.slice(0, 3).map((c) => homography(c.front)) },
      uTopCharts: { value: CHARTS.slice(0, 3).map((c) => homography(c.top)) },
      uBlockSize: { value: Array.from({ length: 3 }, () => new THREE.Vector3()) },
      uCardInverse: { value: new THREE.Matrix4() }, uCardVisible: { value: 0 },
      uShelfReflection: { value: null }, uShelfMatrix: { value: new THREE.Matrix4() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vP; varying vec3 vN; varying vec3 vWorld; varying vec3 vWorldN;
      void main() {
        vP = position; vN = normal;
        vWorld = (modelMatrix * vec4(position, 1.)).xyz;
        vWorldN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uImage;
      uniform vec3 uDims;
      uniform mat3 uFront, uTop;
      uniform float uBrightness, uClay, uSlab, uReflections;
      uniform float uIndex;
      uniform vec3 uBlockMin[3], uBlockMax[3];
      varying vec3 vP, vN, vWorld, vWorldN;
      ${bronzeLighting}
      ${shelfReflectionShader}
      vec3 sampleChart(mat3 chart, vec2 uv) {
        vec3 p = chart * vec3(clamp(uv, .001, .999), 1.);
        return texture2D(uImage, p.xy / p.z).rgb;
      }
      void main() {
        // Blocks rise through the pedestal during the entrance, staying
        // clipped at its top in both the main and mirrored camera passes.
        if (uSlab < .5 && vWorld.y < 0.) discard;
        vec3 q = vP / uDims + .5;
        vec3 n = normalize(vN);
        vec3 weights = pow(abs(n), vec3(4.));
        weights /= max(dot(weights, vec3(1.)), .001);
        vec3 front = sampleChart(uFront, vec2(q.x, 1.-q.y));
        vec3 top = sampleChart(uTop, vec2(q.x, q.z));
        vec3 side = sampleChart(uFront, vec2(q.z, 1.-q.y)) * .67;
        vec3 color = front * weights.z + top * weights.y + side * weights.x;
        vec3 wn = normalize(vWorldN);
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 rayOrigin = vWorld + wn * .018;
        float roughness = mix(mix(.29, .24, abs(wn.x)), .4, max(wn.y, 0.));
        float castShadow = softShadow(rayOrigin);
        color *= castShadow;
        color += uReflections * studioReflection(rayOrigin, wn, viewDir, roughness);
        // Contact darkening anchored to the solid, not the viewer.
        float contact = mix(.72, 1., smoothstep(0., .15, q.y));
        color *= mix(contact, 1., uSlab) * uBrightness;
        // Soft contact occlusion from neighbouring solids. Their bounds are
        // updated during the entrance, so a shadow cannot precede its block.
        float occlusion = 0.;
        for (int i = 0; i < 3; i++) {
          if (abs(float(i) - uIndex) < .5 || uBlockMax[i].y < .02) continue;
          vec3 separation = max(max(uBlockMin[i] - vWorld, vWorld - uBlockMax[i]), vec3(0.));
          float distanceToBlock = length(separation);
          float reach = mix(.12, .36, max(wn.y, 0.));
          float heightMask = smoothstep(vWorld.y - .15, vWorld.y + .08, uBlockMax[i].y);
          occlusion += exp(-distanceToBlock / reach) * heightMask * mix(.27, .48, max(wn.y, 0.));
        }
        color *= 1. - min(occlusion, .58);
        #ifdef STUDIO_PEDESTAL
          vec4 reflectedShelf = shelfReflection(vWorld);
          float grazing = 1. - max(dot(wn, viewDir), 0.);
          float shelfWeight = (.24 + .32 * pow(grazing, 4.)) * pow(max(wn.y, 0.), 12.);
          color = mix(color, reflectedShelf.rgb * vec3(1., .94, .84), uReflections * shelfWeight * reflectedShelf.a);
        #endif
        if (uClay > .5) {
          float light = .28 + .42 * max(dot(wn, normalize(vec3(-.4, .9, 1.))), 0.);
          color = vec3(light * castShadow * (1. - min(occlusion, .58)));
        }
        // A world-space falloff keeps the rounded upper lip and shelf crisp,
        // then lets the lower bronze disappear without a visible bottom edge.
        color *= mix(1., pow(smoothstep(-1.25, -.04, vWorld.y), 1.1), uSlab);
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }
    `,
  })
}

export function profile(w: number, h: number, radius: number, rightRadius = radius) {
  const s = new THREE.Shape(), l = -w / 2, r = w / 2, b = -h / 2, t = h / 2
  s.moveTo(l, b); s.lineTo(r, b); s.lineTo(r, t - rightRadius)
  if (rightRadius > 0) s.quadraticCurveTo(r, t, r - rightRadius, t)
  s.lineTo(l + radius, t); s.quadraticCurveTo(l, t, l, t - radius); s.lineTo(l, b)
  return s
}

export function solid(w: number, h: number, d: number, radius: number, rightRadius = radius) {
  const g = new THREE.ExtrudeGeometry(profile(w, h, radius, rightRadius), {
    depth: d - .016, bevelEnabled: true, bevelThickness: .008, bevelSize: .008,
    bevelSegments: 3, curveSegments: 24, steps: 1,
  })
  g.translate(0, 0, -d / 2 + .008)
  return g
}

export function inlay(w: number, h: number, r: number, z: number, material: THREE.Material, rightRadius = r) {
  // A round wire half-seated in the bronze catches a narrow moving highlight.
  const outline = profile(w, h, r, rightRadius)
  class EdgeCurve extends THREE.Curve<THREE.Vector3> {
    constructor() { super() }
    getPoint(t: number, target = new THREE.Vector3()) {
      const p = outline.getPoint(t)
      return target.set(p.x, p.y, 0)
    }
  }
  const geo = new THREE.TubeGeometry(new EdgeCurve(), 768, .013, 10, true)
  const positions = geo.getAttribute('position'), colors: number[] = []
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i)
    const top = THREE.MathUtils.smoothstep(y, h / 2 - .15, h / 2 - .025)
    const sweep = .78 + .22 * Math.cos(x * .7 + 1.1)
    const intensity = (.67 + .33 * top) * sweep
    const c = new THREE.Color(intensity, intensity, intensity)
    colors.push(c.r, c.g, c.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.z = z + .004
  return mesh
}

export function pedestalSolid(w: number, h: number, d: number) {
  return new RoundedBoxGeometry(w, h, d, 6, .14)
}

/** The pedestal inlay follows only its rounded upper shoulder in X/Z. */
export function pedestalInlay(w: number, d: number, material: THREE.Material) {
  const shape = new THREE.Shape(), x = w / 2 - .041, z = d / 2 - .041, r = .13
  shape.moveTo(-x + r, -z); shape.lineTo(x - r, -z)
  shape.quadraticCurveTo(x, -z, x, -z + r); shape.lineTo(x, z - r)
  shape.quadraticCurveTo(x, z, x - r, z); shape.lineTo(-x + r, z)
  shape.quadraticCurveTo(-x, z, -x, z - r); shape.lineTo(-x, -z + r)
  shape.quadraticCurveTo(-x, -z, -x + r, -z)
  class ShoulderCurve extends THREE.Curve<THREE.Vector3> {
    constructor() { super() }
    getPoint(t: number, target = new THREE.Vector3()) {
      const p = shape.getPoint(t)
      return target.set(p.x, -.041, p.y)
    }
  }
  const geometry = new THREE.TubeGeometry(new ShoulderCurve(), 1024, .014, 10, true)
  const colors = new Float32Array(geometry.getAttribute('position').count * 3).fill(.92)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return new THREE.Mesh(geometry, material)
}
