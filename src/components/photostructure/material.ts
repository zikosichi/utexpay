import * as THREE from 'three'
import { DEFAULT_OPTIONS } from './config'

export function photographicMaterial(image: THREE.Texture, illuminated: THREE.Texture, projector: THREE.OrthographicCamera, floor?: THREE.Plane) {
  return new THREE.ShaderMaterial({
    transparent: !!floor,
    uniforms: {
      uImage: { value: image },
      uIlluminated: { value: illuminated },
      uLighting: { value: DEFAULT_OPTIONS.lighting === 'illuminated' ? DEFAULT_OPTIONS.backgroundLight : 0 },
      uReferenceView: { value: projector.getWorldDirection(new THREE.Vector3()).negate() },
      uView: { value: projector.getWorldDirection(new THREE.Vector3()).negate() },
      uGeometry: { value: 0 },
      uResponse: { value: .3 },
      uFloor: { value: floor ? new THREE.Vector4(floor.normal.x, floor.normal.y, floor.normal.z, floor.constant) : new THREE.Vector4(0, 0, 0, 1) },
      uFoundation: { value: floor ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec2 fallbackUv;
      attribute float sourceVisible;
      varying vec2 vUv, vFallback;
      varying vec3 vNormal, vWorld;
      varying float vVisible;
      void main() {
        vUv = uv; vFallback = fallbackUv; vVisible = sourceVisible;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vWorld = (modelMatrix * vec4(position, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uImage, uIlluminated;
      uniform vec3 uReferenceView, uView;
      uniform float uGeometry, uResponse, uFoundation, uLighting;
      uniform vec4 uFloor;
      varying vec2 vUv, vFallback;
      varying vec3 vNormal, vWorld;
      varying float vVisible;
      float softbox(vec3 n, vec3 view) {
        vec3 ray = reflect(-view, n);
        vec3 light = normalize(vec3(-.45, .85, .7));
        return pow(max(dot(ray, light), 0.), 14.);
      }
      vec3 photograph(vec2 uv) {
        vec3 original = texture2D(uImage, uv).rgb;
        vec3 illuminated = texture2D(uIlluminated, uv).rgb;
        // Blend in linear light: zero is the untouched original, one the new
        // baked render. Above one increases only the added light, not the base.
        return max(mix(original, illuminated, uLighting), vec3(0.));
      }
      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(uView);
        // Preserve all baked lighting. Only add the DIFFERENCE in a restrained
        // broad reflection as the view changes; never light the image twice.
        float facing = dot(n, uReferenceView);
        float photographed = step(.025, facing) * vVisible;
        vec3 plate = photograph(vUv);
        vec3 extension = photograph(vFallback) * .65;
        vec3 color = mix(extension, plate, photographed);
        float response = softbox(n, view) - softbox(n, uReferenceView);
        float surface = smoothstep(.001, .02, dot(color, vec3(.2126, .7152, .0722)));
        color += vec3(1., .79, .52) * response * uResponse * .035 * surface;
        if (uGeometry > .5) {
          float light = .16 + .45 * max(dot(n, normalize(vec3(-.5, 1., .8))), 0.);
          color = vec3(.72, .76, .81) * light;
        }
        float alpha = 1.;
        if (uFoundation > .5 && uGeometry < .5) {
          float height = dot(uFloor, vec4(vWorld, 1.));
          // Fade only the photographed crop into the floor's contact shadow.
          alpha = smoothstep(.015, .42, height);
          color *= mix(.45, 1., smoothstep(.08, .65, height));
        }
        gl_FragColor = vec4(max(color, vec3(0.)), alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}
