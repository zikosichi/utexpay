# Studio hero exploration

Open `/hero-studio`. The existing `/hero-depth`, `/hero-3d`, and projection labs are unchanged. The new route also has a Forge story entry matching the existing project convention. The Forge documentation MCP was unavailable in this session.

## Rendering approach

The terraced blocks are closed, beveled extrusions. Their surfaces use individual, object-space texture charts derived from the existing `public/projection-blocks.png` reference. Each chart is rectified with a homography, excludes the original silhouette, and remains attached to its own face as the camera moves. Sides and curved corners blend between these surface charts. This is a real mesh with surface textures, not an image displaced by a depth map or projected through a fixed camera.

Lower blocks have square hidden right corners and tuck 0.04 units into their taller neighbours. Successive front faces advance by 0.055 units, allowing one solid to occlude the previous edge without coplanar surfaces. Analytic contact shading follows the neighbouring solids' bounds, including during the entrance.

Gold inlays are round metal tubes, 0.026 units in diameter, half-seated in the block fronts. Their continuous radial normals reflect the studio environment, including a low softbox that illuminates front-facing metal. Top texture charts stop inside the photographed gold lines, leaving one continuous geometric edge as the camera turns. Display bezels have physical thickness; display faces and lettering are high-resolution, local CanvasTextures that depth-test in the same WebGL scene. Reference: [Three.js physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

The card is one closed chamfered mesh with separate front, back, and edge material groups, plus a modeled chip and contact grooves. There are no overlapping face planes. Its 1024 × 1620 procedural maps provide brushed grain, foil artwork, micro-relief, and separate roughness/metalness for printing. Subpixel grain stays out of the normal map to avoid specular shimmer. The card uses physical materials and a finite reflected studio strip that travels with the view. Local highlight compression preserves the metal without changing the exposure of the photographic bronze.

The resting card leans back without roll, with yaw applied after tilt so its lower edge stays level. Placement measures the actual transformed mesh vertices, leaving 0.002 units of clearance above the shelf and at least 0.09 units ahead of the furthest block front. The shelf extends 0.32 units further forward to support the whole lower edge within its flat surface. Entrance poses are also checked for wall clearance. This avoids both the gap caused by an approximate rotated bounding box and the upper corner intersecting a block. Its animated inverse transform also drives the local reflection and shadow proxy.

Bronze retains the reference's baked diffuse detail while sampling the same prefiltered studio environment as the glass, bezels, card and inlays. Reflections vary with surface roughness, view direction and Fresnel response. Five local reflection rays blend neighbouring bronze surfaces and top inlays into the environment response; they use animated box proxies and the card transform, so the reflected forms remain attached as the camera moves. Side faces have a slightly smoother finish and stronger grazing response. These are restrained secondary reflections, not a recursive ray-traced render. Continuous soft key/fill visibility adds cast shadows to the bronze, alongside contact occlusion at the seams.

The pedestal has a 0.14-unit rounded shoulder with a 0.028-unit round inlay running only around its top perimeter; there is no bottom or descending front trim. Its lower body fades to black in world space. The horizontal shelf samples a mirrored-camera pass directly in its bronze shader, with distance-dependent blur and Fresnel blending. The contribution rolls off with the actual shoulder normal, so there is no separate flat mirror overlay. The source chart excludes the photographed trim to prevent duplicate edge highlights. The 1536 × 1024 reflection target has 2× antialiasing, captures immediately before each main render, excludes the receiving pedestal to avoid framebuffer feedback, and is released on unmount. Reference: [Three.js Reflector](https://threejs.org/docs/pages/Reflector.html).

Color textures are tagged sRGB; shader math runs in linear RGB and explicitly converts output back to the renderer's color space. Reference: [Three.js color management](https://threejs.org/manual/en/color-management.html).

## Interaction and performance

- Mouse movement over the hero orbits a perspective camera around the assembly in the reverse direction on both axes. Frame-rate-independent exponential damping settles smoothly, with no perpetual idle animation.
- The default range is ±12° horizontally and ±3.84° vertically around the starting view. Studio controls independently set starting rotation (−25° to 25°), tilt (5° to 30°), and mouse travel (4–24°). The final pitch stays between 3° and 38°. Framing accounts for the full configured motion envelope.
- Starting rotation, tilt, Z rotation (roll, −15° to 15°), and travel are saved locally in this browser. Z rotation defaults to 0°, replacing the former fixed −1.5° camera roll; “Level Z rotation” restores just that axis. Framing includes the chosen roll. Reset view/Home centers the pointer offset while keeping the chosen starting pose; Restore defaults resets the settings. Storage is optional and validated before use.
- On opening, the blocks rise through the pedestal in sequence, followed by a rising, turning card. World-space clipping keeps submerged geometry hidden in both camera passes. The entrance lasts 2.45 seconds after shaders are ready; Studio controls can replay it. Hidden tabs pause the sequence, and reduced-motion users immediately see the final pose.
- Touch users can drag the scene horizontally while retaining vertical page scrolling. Arrow keys rotate a focused scene; Home resets it.
- “See how it works” and “Play movement” play one 6.5-second camera sweep. Pointer input interrupts it.
- `prefers-reduced-motion` disables interactive motion and the reveal transition. The Follow pointer control provides an additional manual pause.
- Rendering runs on demand, stops when the page is hidden, and caps device pixel ratio at 2. Geometry, materials, textures, the environment target, observers, events, and the WebGL context are released on unmount.
- A static reference preview appears if WebGL initialization/context fails.

## Art direction and limits

The first goal is photographic surface quality with convincing hero-scale movement. This does not claim pixel-identical reconstruction of an AI-generated image: the source has a single viewpoint, so unseen surface detail, coherent solid geometry, displays, and changing reflections must be reconstructed. The baked diffuse light is intentionally retained; this is not a fully relightable, physically based scanned asset or a 360° product configurator.

Use Studio controls to compare Bronze, Clay, and the original reference, hide product displays, change light intensity and bronze-reflection strength, adjust the starting pose and mouse travel, replay the entrance, and reset. Reflection strength affects the environment, local bronze reflections and mirrored shelf; the card and gold trim retain their intrinsic metal finish. The previous exploration is linked there. Navigation and account links go to the existing landing prototype; no financial/account workflow is implemented by this exploration.

## Validation

Run `node scripts/verify-studio-card.mjs`, `npx tsc --noEmit`, and `npm run build`. The geometry regression check covers 65 viewing angles, exclusive triangle groups, metal thickness, exact surface contact and wall clearance in three poses, and lower-edge support within the flat shelf. The build includes the repository's prerender verification. Browser checks cover entrance/replay, pedestal reflection, starting-angle controls and persistence, camera-angle changes, bronze/clay views, reset, desktop framing, and mobile overflow. Shader warnings/errors should be absent on the new route.
