/** Local reflection/shadow rays use the animated solids, so contact stays put
 * when the camera moves. Rounded corners retain their rasterized normals;
 * secondary rays use box proxies with a softly filtered footprint. */
export const bronzeLighting = /* glsl */ `
  uniform sampler2D uEnvironment;
  uniform mat3 uFrontCharts[3], uTopCharts[3];
  uniform vec3 uBlockSize[3];
  uniform mat4 uCardInverse;
  uniform float uCardVisible;
  #include <cube_uv_reflection_fragment>

  float boxRay(vec3 origin, vec3 direction, vec3 low, vec3 high) {
    vec3 safeDirection = mix(vec3(.00001), direction, step(vec3(.00001), abs(direction)));
    vec3 a = (low - origin) / safeDirection;
    vec3 b = (high - origin) / safeDirection;
    vec3 nearHit = min(a, b), farHit = max(a, b);
    float entry = max(max(nearHit.x, nearHit.y), nearHit.z);
    float leave = min(min(farHit.x, farHit.y), farHit.z);
    return leave > max(entry, .002) ? max(entry, .002) : 1000.;
  }

  float cardRay(vec3 origin, vec3 direction) {
    if (uCardVisible < .001) return 1000.;
    vec3 localOrigin = (uCardInverse * vec4(origin, 1.)).xyz;
    vec3 localDirection = (uCardInverse * vec4(direction, 0.)).xyz;
    float hit = boxRay(localOrigin, localDirection, vec3(-.79, -1.25, -.0135), vec3(.79, 1.25, .0135));
    return (origin + direction * hit).y >= 0. ? hit : 1000.;
  }

  float distanceToOccluder(vec3 point) {
    float distance = 8.;
    for (int i = 0; i < 3; i++) {
      if (abs(float(i) - uIndex) < .5 || uBlockMax[i].y < .02) continue;
      vec3 separation = max(max(uBlockMin[i] - point, point - uBlockMax[i]), vec3(0.));
      distance = min(distance, length(separation));
    }
    if (uCardVisible > .001 && point.y > 0.) {
      vec3 cardPoint = (uCardInverse * vec4(point, 1.)).xyz;
      float cardDistance = length(max(abs(cardPoint) - vec3(.79, 1.25, .0135), vec3(0.)));
      distance = min(distance, mix(8., cardDistance, uCardVisible));
    }
    return distance;
  }

  float visibilityTo(vec3 origin, vec3 lightPosition, float lightSize) {
    vec3 direction = normalize(lightPosition - origin);
    float travel = .035, visibility = 1.;
    // Continuous cone visibility produces a soft penumbra, avoiding the
    // striped shadows produced by a handful of discrete point lights.
    for (int i = 0; i < 12; i++) {
      float distance = distanceToOccluder(origin + direction * travel);
      visibility = min(visibility, distance / (travel * lightSize));
      if (distance < .001 || travel > 8.) break;
      travel += clamp(distance, .035, 1.25);
    }
    return smoothstep(0., 1., visibility);
  }

  float softShadow(vec3 origin) {
    float key = visibilityTo(origin, vec3(-4., 10.5, 8.), .19);
    float fill = visibilityTo(origin, vec3(9., 9.5, 5.), .24);
    return .69 + .22 * key + .09 * fill;
  }

  vec4 reflectedNeighbour(vec3 origin, vec3 direction) {
    float nearest = 1000.;
    vec3 reflectedColor = vec3(0.);
    for (int i = 0; i < 3; i++) {
      if (abs(float(i) - uIndex) < .5 || uBlockMax[i].y < .02) continue;
      float hit = boxRay(origin, direction, uBlockMin[i], uBlockMax[i]);
      if (hit >= nearest) continue;
      nearest = hit;
      vec3 point = origin + direction * hit;
      vec3 q = (point - vec3(uBlockMin[i].x, uBlockMax[i].y - uBlockSize[i].y, uBlockMin[i].z)) / uBlockSize[i];
      vec3 frontUV = uFrontCharts[i] * vec3(clamp(vec2(q.x, 1. - q.y), .002, .998), 1.);
      vec3 topUV = uTopCharts[i] * vec3(clamp(vec2(q.x, q.z), .002, .998), 1.);
      float isTop = step(uBlockMax[i].y - .015, point.y);
      reflectedColor = mix(texture2D(uImage, frontUV.xy / frontUV.z).rgb, texture2D(uImage, topUV.xy / topUV.z).rgb, isTop);
      // Include the neighbouring top inlay in the secondary reflection.
      // Its footprint widens with distance instead of sparkling at subpixels.
      float edgeDistance = length(vec2(point.y - uBlockMax[i].y, point.z - uBlockMax[i].z));
      float edgeWidth = .017 + hit * .006;
      float goldEdge = exp(-pow(edgeDistance / edgeWidth, 2.));
      reflectedColor = mix(reflectedColor, vec3(.5, .35, .16), goldEdge * .7);
    }
    float cardHit = cardRay(origin, direction);
    if (cardHit < nearest) {
      nearest = cardHit;
      reflectedColor = vec3(.22, .16, .075) * uCardVisible;
    }
    return vec4(reflectedColor, nearest < 999. ? exp(-nearest * .055) : 0.);
  }

  vec3 studioReflection(vec3 origin, vec3 normal, vec3 viewDirection, float roughness) {
    vec3 ray = reflect(-viewDirection, normal);
    vec3 environment = textureCubeUV(uEnvironment, ray, roughness).rgb;
    // The shelf has its own full-scene planar reflection. Other surfaces
    // catch restrained, rough reflections of the neighbouring architecture.
    if (uSlab < .5) {
      vec3 tangent = normalize(cross(ray, abs(ray.y) < .9 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
      vec3 bitangent = cross(ray, tangent);
      vec4 local = reflectedNeighbour(origin, ray) * .36;
      float spread = roughness * .28;
      local += reflectedNeighbour(origin, normalize(ray + tangent * spread)) * .16;
      local += reflectedNeighbour(origin, normalize(ray - tangent * spread)) * .16;
      local += reflectedNeighbour(origin, normalize(ray + bitangent * spread)) * .16;
      local += reflectedNeighbour(origin, normalize(ray - bitangent * spread)) * .16;
      // Occluded studio light is replaced by the reflected bronze, rather
      // than adding a glowing copy on top of an already illuminated surface.
      float side = smoothstep(.15, .8, abs(normal.x));
      environment = environment * (1. - local.a * .8) + local.rgb * mix(1.7, 4.0, side);
    }
    float side = smoothstep(.15, .8, abs(normal.x));
    float fresnel = mix(.013, .026, side) + mix(.085, .14, side) * pow(1. - max(dot(normal, viewDirection), 0.), 5.);
    return environment * fresnel * vec3(1., .91, .76);
  }
`;
