import * as THREE from 'three'

export function photographicMaterial(image: THREE.Texture, projector: THREE.OrthographicCamera) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uImage: { value: image },
      uReferenceView: { value: projector.getWorldDirection(new THREE.Vector3()).negate() },
      uView: { value: projector.getWorldDirection(new THREE.Vector3()).negate() },
      uGeometry: { value: 0 },
      uResponse: { value: .3 },
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
      uniform sampler2D uImage;
      uniform vec3 uReferenceView, uView;
      uniform float uGeometry, uResponse;
      varying vec2 vUv, vFallback;
      varying vec3 vNormal, vWorld;
      varying float vVisible;
      float softbox(vec3 n, vec3 view) {
        vec3 ray = reflect(-view, n);
        vec3 light = normalize(vec3(-.45, .85, .7));
        return pow(max(dot(ray, light), 0.), 14.);
      }
      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(uView);
        // Preserve all baked lighting. Only add the DIFFERENCE in a restrained
        // broad reflection as the view changes; never light the image twice.
        float facing = dot(n, uReferenceView);
        float photographed = step(.025, facing) * vVisible;
        vec3 plate = texture2D(uImage, vUv).rgb;
        vec3 extension = texture2D(uImage, vFallback).rgb * .65;
        vec3 color = mix(extension, plate, photographed);
        float response = softbox(n, view) - softbox(n, uReferenceView);
        float surface = smoothstep(.001, .02, dot(color, vec3(.2126, .7152, .0722)));
        color += vec3(1., .79, .52) * response * uResponse * .035 * surface;
        if (uGeometry > .5) {
          float light = .16 + .45 * max(dot(n, normalize(vec3(-.5, 1., .8))), 0.);
          color = vec3(.72, .76, .81) * light;
        }
        gl_FragColor = vec4(max(color, vec3(0.)), 1.);
        #include <colorspace_fragment>
      }
    `,
  })
}
