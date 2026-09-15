# Photographic hero

Routes: `/hero-projection` and `/hero-accounts` (the previous home-page hero, preserved after the interactive Accounts hero moved to `/`). The photographic sculpture now sits in the complete landing-page hero. `HeroContent.tsx` shares the navigation, brand, headline, description, calls to action, and assurances with `/hero-studio`; the two routes retain their own 3D scenes.

The study header, layout toolbar, framing buttons, and caption footer are removed from the hero. A discreet Studio controls button at the bottom right opens the retained configuration panel. Comparison modes, close-up framing, motion, reflection strength, and the earlier Personal layouts remain available there. The default view shows all three populated bronze blocks. The sculpture uses a wide 2.5:1 stage in the hero, with taller framing when inspecting individual boxes.

Laptop-height viewports (1024–1799px wide, up to 1000px high) use a more compact vertical rhythm: 32–52px above the headline, slightly tighter description/action gaps, and a 20–40px smaller gap before the full sculpture. Typography, buttons, sculpture scale, and close-up stage spacing are unchanged. Wider monitors, taller windows, and phone layouts keep their original spacing. These overrides are scoped to this hero, not the shared studio styles.

The original source is the user's clean, generated bronze structure image, preserved at its supplied 2004 × 1128 resolution in `public/photostructure/bronze-source.webp`. A quality-96 WebP keeps the photographic appearance while reducing the transfer from 1.7 MB to 106 KB. It remains untouched and selectable.

`bronze-source-illuminated-v1.webp` is a separate amber-relit alternative (1672 × 941, quality 95, 107 KB), generated with the built-in image editor from the clean source and the user's lighting reference. Its PNG master and exact generation prompt are retained; see `relight-prompt.md`. Only the blank bronze was regenerated: the panel artwork, calibrated geometry, and original texture are preserved. Both textures load once and use the same projected UVs. A linear-light shader blend switches between them without rebuilding the renderer; the intensity slider controls the added baked light in Full lighting mode. This is a baked photographic relight, not a physically relightable PBR material.

## Editing and re-baking panels

The original React/HTML, SVG figures, and CSS are preserved. `panels.tsx` assembles all 11 surfaces, including the six Personal layouts; `figures.tsx` contains the three engraved diagrams. Preview all editable panels at `/panel-bake`, or one flat panel at `/panel-bake?surface=personal-figure`.

The hero loads transparent WebP images from `public/photostructure/panels/`. It does not mount the panel HTML or apply the old per-frame CSS transforms. After editing the source or styles, run this from the project directory with the dev server running:

```sh
node --experimental-strip-types scripts/bake-panels.mjs
```

To re-render only selected images, append `--only personal-title,personal-figure`. The script uses installed Google Chrome and `cwebp`; its defaults are `http://127.0.0.1:3000`, 3× resolution, and quality 92. Reload the hero after baking to refresh its textures.

`surfaces.ts` maps each image onto a grid following the bronze mesh. The reference normal must face the projector: reversing it rejects every valid face sample and sends the grid onto a flat fallback plane, which can intersect the bronze and clip the artwork. The registration check also tests image clearance across the supported rotations and intro.

## Reconstruction

`geometry.ts` traces corresponding front and rear contours of the three blocks and their foundation. Source-camera rays initially intersect front/back planes separated by 2.35 units (3.38 for the foundation). A shared shelf plane then calibrates the foundation crown and all block bottoms; depth corrections taper up to the original block crowns. Caps and connecting surfaces make four solids with 2,762 triangles total. The depth scale and source camera follow the proportions of the studio construction, while the traced contours accommodate the generated image's imperfect perspective.

The shelf plane fixes the small reflected gold lines separating from the block feet on rotation. Previously, the image disguised physical gaps between 0.81 and 2.59 units at the front contact points. Both the feet and their photographed reflection roots now occupy the same 3D positions. The corrections follow the source-camera rays, preserving the image at the starting angle. Reflections remain photographed; this correction does not replace them with a live mirror.

Camera projection is baked into per-vertex UVs. The image stays attached to the surfaces while an orthographic viewing camera orbits the assembly. Front faces, crown, rounded corners, fine gold edges, and baked shadows retain their original image detail. Back-facing surfaces use bounded interior texture coordinates. The source has no information about unseen surfaces, so this is calibrated for a small viewing envelope, not a 360-degree reconstruction or a fully relightable asset.

The material preserves baked lighting and adds only a small difference between the reference-view and current-view softbox reflection. At the reference angle that difference is zero. This avoids applying a second set of lights over the photographed metal. Color textures use sRGB; shader calculations use linear color.

## Studio environment

`environment.ts` adds a curved wall and satin floor to the same Three.js scene. Warm light wraps around their junction, with cool ambient light near the sides and a soft contact shadow under the pedestal. The floor sits 1.05 world units below the calibrated crown; the photographed foundation fades into that contact before its rectangular source-image cutoff. The original treatment remains available as Backdrop only. Full lighting applies the new bronze photograph, including its brighter crown reflections, and the mirrored floor automatically captures that appearance.

The canvas covers the full hero. An orthographic view offset retains the original stage framing, and a scissor keeps close-up sculpture views out of the copy. The room draws across the whole canvas, so it has no CSS-gradient/canvas seam. Font loading and stage/canvas resizing refresh the view offset.

Full lighting also includes a faint champagne overhead source and two broad, feathered shafts falling toward the bronze crowns. They are evaluated in the existing room shader, with no added textures, geometry, animation, or render pass. A reference camera anchors the source above the headline on desktop and mobile; pointer rotation does not drag it around. The light blends into the lower studio glow and never overlays the sculpture or copy. Overhead rays has its own 0–100% control (default 55%) and also follows the main intensity. Setting it to zero removes the source and rays; Backdrop only and No lighting retain their earlier appearances without them.

A mirrored camera captures the sculpture into a render target capped at 960 pixels per side and 65% of CSS resolution. Trilinear mip levels soften reflections with distance using five floor samples, with no post-processing blur or shadow map. The receiving room is excluded from its own capture. Baked panel colors are converted to linear only for that pass. Rendering remains demand-driven and pauses when settled or hidden; the mirror capture is skipped at zero reflection. All environment geometry, materials, and targets are disposed with the scene.

The floor combines the tight footprint contact with a broad forward cast shadow from the rear light. It begins at the pedestal's calibrated front contact (`z ≈ 2.15`), spans its full width, and widens/softens toward the viewer. Reflection fill is occluded most strongly at that contact and progressively less farther out, so it cannot repaint a bright seam at the base; the distant gold reflection remains. Both shadows are analytic in the same floor shader, without additional geometry, shadow maps, or render passes.

Studio controls offer three lighting presets: No lighting (original bronze against black, no room or floor reflection), Backdrop only (original bronze with the retained room), and Full lighting (relit bronze and room, the default). Switching presets preserves the lighting adjustments. Light intensity (0–200%) controls the room and, in Full lighting, the bronze's added light together. Light spread (70–150%) and Floor reflection (0–85%) remain separate. Restore defaults returns to Full lighting with 85% intensity, 75% spread, and 40% reflection. No lighting disables the adjustment sliders and skips the mirror capture; Original and Geometry comparison modes also hide the environment. Original always shows the untouched source image.

## Figures

Each bronze face carries one engraved diagram and one inscription — no lists, no totals, and nothing numeric to read. `figures.tsx` draws all three and `panel-figure.css` holds the material. Personal fans one account out to the currencies it holds; Business converges a team of five onto the same account; Payments rises across thirty days. Three different shapes so the faces read apart at a glance, one drawing language so they read as a set. The inscriptions are *One account*, *Everyone in one place*, and *Money arriving*.

Everything is cut into the bronze rather than sitting on it, under one light coming from the top right. That single rule fixes every gradient: the top-right interior is in shadow, the bottom-left interior is the lit wall. Two things follow. Radial fills are wrong here — a radial reads as a dome, the opposite of a recess — so every gradient is linear and runs top-right to bottom-left. And the lit wall is always drawn *inside* the cut; a bright arc outside the shape domes it again, which is exactly how the first attempt failed. The bronze face samples about `#201D19`, so a recess floor has to sit clearly below that to register as a hole at all; the first pass at the bar chart sampled `#25211E` against a `#24201D` gap and was invisible. Inlay floors are sampled off Figma: the currency token (`Card · Currency`, `3041:1823`) for Personal, and the avatar set (`313:18`) for the five team discs, which carry initials in that palette. Marks on the inlays read as stamped — an off-white face over a hairline shadow falling to the bottom left, never pure white.

**The earlier live-HTML panel used a projective `matrix3d` that changed every frame.** That implementation drove two constraints retained in the source artwork. No SVG filters: the blurred inner shadow is faked with concentric rings of falling opacity. And thin, high-contrast edges crawl, because a non-affine transform cannot be a cheap texture map and the art is re-sampled continuously — the defences are few edges, wide dark bodies, low contrast on anything hairline, and no stroke thin enough to land under a pixel once the 720px panel is drawn at roughly 470px — grooves are 8.6px with 2px walls for that reason, and `translateZ(0)` plus `will-change: transform` on the SVG so it rasterises once and the ancestor transform resamples that texture. Payments is one soft wash under a monotone-cubic line rather than thirty milled bars for the same reason: that swap removed roughly 120 thin edges from the face. Its wash fades to the bottom, but the ramp is a **baked 2 x 160 PNG** (`WASH`, inlined as a data URI and clipped to the area path), not an SVG gradient. Chrome dithers gradients; under a per-frame projective re-raster the dither pattern shifts, and that noise crawling across the fill is what read as the graph flickering. Narrowing the ramp to two stops was not enough — only removing the gradient was. A bitmap resamples bilinearly, so the fade stays smooth and completely still. Do not swap this back to a `linearGradient`. Three scale marks (€0 / €5k / €10k) and two faint gridlines say *sales* without turning the face into a readout.

**Each viewBox must match its art box.** The figures share the face with an inscription, so the SVG box is shorter than the panel; if the aspect does not match, `xMidYMid meet` scales the whole diagram down and letterboxes it, which reads as a small drawing marooned on a large slab. Measure `.figure-art` `clientWidth`/`clientHeight` after any change to caption size or stack padding and set the viewBox to those numbers — currently 720 × 278, 322, and 370. Business additionally scales its group to 0.9 about the centre and drops it 18px, so its fan sits lower than the others.

Earlier directions are kept in `personalVariants.ts` for comparison; Business and Payments no longer have counterparts. Dense cards on each face read as crowded at hero scale, where a third tier of grey supporting text degrades to illegible texture. The correction over-shot into one number plus a thin strip of windows, which emptied the faces. A single filled glass sheet of hairline rows fixed both and survives as the Balance sheet direction — but rows on a marketing hero are the app's grammar, not the hero's.

## Personal panel

The left block uses a baked image of `PersonalPanel` in `panels.tsx`, defaulting to the engraved figure above. The engraved titles run 50px Oxanium at 9px tracking. `personalVariants.ts` retains Split, Currency inlays, Activity, Engraved, and Balance sheet as comparison directions in the studio panel; every one except Currency inlays uses the 720 × 350 DOM surface, while the inlays take a wider patch of the physical face and a 720 × 275 surface to keep their windows proportioned. The Balance sheet direction draws its label, total, rows, chevrons, and coin medallions from `panel-sheet.css`; Currency inlays draws its type and recessed windows from `panel-kit.css` and `PanelWindow.tsx`. Alternative CSS lives in `personal-variants.css`; the bezel, glass, grain, reflection, and coin faces are in `personal-box.css`. All values in every direction are static illustrative content.

## Business and Payments

`CommercePanel` in `panels.tsx` gives both taller blocks the same treatment as Personal — no bezel, the figure straight in the bronze. Only the face heights (400 and 466) and the stack padding that positions each figure live in `commerce-boxes.css`.

## Interaction

- Default travel is ±6° horizontally and ±2.16° vertically, with frame-rate-independent damping. Controls allow 2–9° horizontal travel and adjustable reflection response.
- The hero opens on the full scene with all three populated blocks. The configuration panel's Framing selector smoothly focuses Personal, Business, or Payments; Full scene returns to the whole structure. Focus and zoom interpolate together while keeping all image surfaces registered. Personal layout alternatives are folded into a disclosure in the same panel.
- See how it works brings the sculpture into view and plays a gentle 6.5-second turn. Pointer movement, keyboard rotation, reset, and unmount cancel the demonstration; reduced-motion preferences and the Follow pointer toggle also suppress it.
- On opening, the complete construction starts 18% farther from the camera, 16° farther around its side, and 3.5° higher. It eases into its final framing over 1.45 seconds with a quick quartic ease-out. All three blocks and their image surfaces move as one composition. Studio controls can replay this intro; replay closes the panel so the movement remains visible. Reduced-motion preferences immediately show the settled composition.
- Configuration retains comparison modes, framing, rotation travel, reflection response, a motion toggle, reset, and restore defaults. Escape closes the panel and returns focus to its trigger.
- Sculpture, Original, and Geometry modes share the same framing. Original shows the untouched source at the reference pose; Geometry reveals the solid reconstruction.
- Mouse movement rotates the camera. Touch dragging, arrow keys, Home/reset, and a manual pause are supported.
- Reduced-motion preferences disable movement. Rendering stops after settling and while the document is hidden. Device pixel ratio is capped at 2.
- Normal loading keeps the source photograph hidden so its different crop cannot flash before the reconstruction. Initialization/context failures still show the photograph. Server rendering emits one high-priority texture preload, the renderer reuses that decoded image directly, and the scene ships with the route to avoid a post-mount module waterfall. The transparent WebGL canvas lets the page background continue behind the construction without a rectangular seam. Resize observers, listeners, geometry, textures, and the WebGL renderer are released on unmount.

## Validation

Run `node --experimental-strip-types scripts/verify-photo-contacts.mjs`, `node_modules/.bin/tsc --noEmit`, and `npm run build`. The contact regression independently raycasts the foundation beneath the block bottoms and compares their projected positions throughout the full camera envelope. All 8,286 vertices retain their source UV alignment within 0.001 pixels. This measures the projection calculation, not pixel-perfect visual reconstruction of the whole photograph.

`node --experimental-strip-types scripts/verify-personal-html.mjs` verifies panel-to-mesh registration for seven surface profiles across all three blocks and 45 camera/viewport combinations. It also raycasts triangle interiors and edges across 17 poses to catch images intersecting the bronze.

Browser checks covered the source comparison, solid geometry view, both pointer directions, keyboard rotation, range adjustment, pause/reset, and a 390 × 844 mobile viewport with no horizontal overflow. No shader errors were reported.

The illuminated variant was checked in the full scene and Personal close-up, during keyboard rotation, at 0% and 200% intensity, and across all three lighting presets on desktop and mobile. The preset updates the existing scene without recreating its canvas; No lighting keeps the slider values but hides the room and selects the original photograph. Production build/static-page verification and the feature-scoped strict TypeScript check pass. The project-wide TypeScript check still reports the pre-existing `resolve.tsconfigPaths` option mismatch in `vite.config.ts` under Vite 7.

The Forge documentation tool was unavailable in this session. The route's `.stories.json` follows the existing repository convention.
