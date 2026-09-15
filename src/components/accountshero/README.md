# Taller home-page hero

Main route: `/`. The approved interactive hero is now the home-page hero; the existing Money Flow section stays below it. The former home-page hero is preserved at `/hero-accounts`.

This version uses the actual home-page bronze photograph, illuminated photograph, photographic material, lighting environment and calibrated meshes. It adds .825 world units (half the original height extension) to the three block heights. Width, depth, foundation, original texture coordinates and the rounded crowns stay unchanged; only the straight lower walls extend. The stage is 2.25:1 instead of 2.5:1 to accommodate the added height. The complete composition is shown at 92% scale through camera framing, keeping the geometry, UI and lighting proportions together.

The three account UIs are live HTML/CSS/SVG components, projected onto the bronze faces with a CSS matrix derived from the same Three.js camera. Their layout and typography are sized at native viewport resolution on resize; only three wrapper transforms change during camera movement. They share a 4-unit width and .28-unit bottom-center inset, preserve their aspect ratios, and follow each box’s front-edge rotation. The backgrounds and bezels remain translucent, while text and icons remain opaque. The original engraved title textures are reused.

The home hero also reuses Hero Studio's solid metal UTEX card, including its modeled chip and brushed surface. The foil uses the original `/brand/utex-pay-white.svg` paths and fill rules, shared with the header. The home card's Mastercard mark has a separate glossy ink coating and tighter moving highlight. Its default is −11.5° around the shelf's vertical axis, with a 4.6° backward lean, seated slightly left of the Business / Payments corner at x=2.28. Its lower edge follows the actual shelf slope, its rear clears the blocks, and its footprint is supported by the pedestal. A tight contact shadow and soft forward cast shadow are applied to this scene's bronze material instances. Business and Payments panels are centered on their blocks, allowing the card to overlap naturally. A projected silhouette clips the live HTML only where the card passes in front, including pointer hit testing, so UI never paints over the metal.

`cardPerspective.ts` gives this orthographic scene a card-only perspective cue: the approved top taper is 1%. The temporary adjustment sliders are now hidden; their saved browser settings still apply, with the approved values in `config.ts` as defaults. The card face is subdivided once, then each adjustment starts from its original vertices so the artwork follows smoothly without accumulating distortion. The chip, core, edge, occlusion silhouette, shadow, and reflection share the taper; the bottom edge stays fixed and supported by the shelf. Hero Studio keeps its original card geometry.

The card uses the original champagne-gold surface, edge, back, and roughness. The account scene increases the lit contribution by about 26% over the original treatment. The selected defaults are a −27° front-light angle and 120% strength. The existing foil, chip, brushed grain, and separate glossy network mark remain physical material details; Hero Studio's material stays unchanged.

`shelfReflection.ts` captures the card with a camera mirrored across the actual bronze crown, separately from the existing room-floor reflection. The foundation shader blends this capture only into the flat crown, retaining the original photographic texture, rim lighting, and reflection of the blocks. Reflection softens and fades away from contact, and the shadow is applied afterward. This extra pass renders only the card, uses a target capped at 960 pixels per side, and runs on the same demand-driven frame schedule. It is skipped in Artwork and Geometry views, resized with the hero, and disposed with the scene.

## Card realism and the idle cue (Sep 15 review round)

The Sep 11 review called the card flat and too shiny next to the boxes, and asked for a hint that the panels are interactive. Both are addressed without touching Hero Studio's card or the photographic materials.

- **Why it was flat.** The composition camera is orthographic, and Three's shader uses a constant view direction for orthographic cameras, so every point of the flat face reflected the same environment sample. `card.ts` now overrides that line with a virtual eye `CARD_EYE_DISTANCE` units in front of the card centre (`uCardCenter`, updated on every reseat), so reflections and the brushed anisotropy sweep across the face like they would for a real viewer; the moving studio strip uses the same eye.
- **Lit from above like the bronze.** The studio environment's floor bounce is dimmer and its key panel brighter, and the face carries a top-to-shelf falloff (`cardShade`) with a little occlusion in the bottom 14%, so the card's tonal range matches the block fronts instead of sitting as one bright fill. The crown is kept just below the brightest bronze highlight.
- **A shadow you can see.** The cast-shadow light on the bronze materials is now the studio key, high, left and in front (`CARD_SHADOW_LIGHT`), so the leaning card throws a wedge that widens toward its foot onto the wall and shelf. The live HTML panels draw the same shadow from the same light: `castOutline` in `occlusion.ts` throws the card silhouette onto each panel's face plane, `panelShadow` clips it into panel space, and `.ah-card-shade` / `.ah-card-shadow` (a blurred layer inside the glass, below the content) paint it. It is updated in `livePanels.update` every frame together with the occlusion cut, so it moves with the camera.
- **Idle cue.** See *Interactivity hints* below.

## Interactivity hints

Kiril asked on Sep 11 for something that tells a visitor the panels are live controls, and the reference was games: subtle, appearing at random, nothing that mimes a cursor. Zviad then asked for it to read as a glowing reflection rather than a stripe. `nudge.ts` plays light over one control at a time in two layers, which run together by default.

- **Shimmer** sweeps a reflection across the control: a warm halo about 40% of its width, carrying a narrow near-white core with a dimmer streak trailing it, tilted 18° and travelling left to right behind the scene's key light. The halo has to stay narrow relative to the control or it reads as a wash rather than a moving highlight.
- **Glow** lifts a warm rim and a pool of light inside the control. Paired, it runs on the sweep's own clock at 70% of its strength, so the control appears to catch the light instead of wearing a stripe. On its own it keeps a slower, independent breath.

Nothing is on a metronome. The control, the gap to the next one, the length of each pass and its peak are drawn from ranges, and one hint may still be finishing as the next begins. The same control never lights twice running while another is free, so attention travels across all three panels.

The cue waits for the intro to land and the panels to be handed over, starts nothing while the tab is hidden, and stops for good the first time the visitor hovers, presses or focuses a control. A pass already under way always finishes, so nothing snaps back to dark under the cursor. Reduced motion never starts it. A chosen currency tile is already lit inside its recess, so it is skipped.

Both layers ride pseudo-elements, deliberately clear of the twelve-layer `box-shadow` on `.ah-key`, which has to keep an identical layer count in every state to interpolate. The glow is `::before`, under the content, so text stays crisp through it; the shimmer is `::after`, over the content, because a reflection crosses everything. The streak is one diagonal gradient on a background three times the control's width, swept by animating `background-position` from 100% to 0%; the extra width is what keeps the halo narrow against a long travel. That property repaints rather than composites, which is why only one control shimmers at a time and the pass is short. Everything is CSS on the live HTML layer, so it costs no WebGL frames, and `data-hint` sits outside the reflection painter's attribute filter, so it never repaints the floor reflection.

Studio controls carries a **Hints** group: `Reflection` (the default, both layers), `Sweep` or `Glow` for either half alone, `Off`, an `Also lift the control` toggle that adds the full 3D hover rise, and strength and average spacing. Values persist per browser under `utex-accounts-hints-v2`.

## Card controls

Studio controls carries a **Card** group, directly under Framing, with twelve live sliders. The defaults below are Zviad's Sep 15 tuning: the light swings to the card's left, the face keeps more of its lower half, the eye sits back at 12u for a calmer sweep, and the shadow is thrown from the right, so it falls across the Business panel. None of them touch geometry, so nothing is reseated and the panel stays responsive while dragging. Every value persists per browser and `Restore defaults` (or the group's own `Reset card only`) returns the approved set.

| Control | Default | What it moves |
| --- | --- | --- |
| Light angle | −27° | The card's own softbox and the moving highlight together |
| Light strength | 120% | That softbox's intensity, not the scene's |
| Reflections | 105% | Scales every card material's authored `envMapIntensity` at once |
| Crown brightness | 98% | Top of the face falloff |
| Shelf brightness | 66% | Bottom of the face falloff |
| Viewing distance | 12u | The virtual eye. Near sweeps reflections across the face; far collapses them to one sample, the flat look from before |
| Shadow angle | 38° | Where the shadow-casting key sits, orbiting at a 9.9u radius |
| Shadow height | 11.5u | How high that key sits, so how far the shadow drops |
| Shadow strength | 70% | The cast wedge and the contact line together, on bronze and on the HTML panels |
| Shadow softness | 23% | How fast the penumbra widens with distance |
| Card angle | −11.5° | Yaw on the shelf; reseats and re-cuts the HTML occlusion |
| Perspective | 1% | The top taper |

The four appearance uniforms are `uCardEye`, `uCardShade`, `uCardShadowLight` and `uCardShadow`; `card.setAppearance` clamps each to `CARD_APPEARANCE_LIMITS` and is called on every scene update. The two shadow controls also drive `--ah-shadow-alpha` and `--ah-shadow-blur` on the live layer, so the DOM shadow on the glass tracks the WebGL one.

## Editing and interacting with the screens

Card rotation and perspective reseat the card on the shelf and update its HTML occlusion, shadow, and reflection together. Light angle moves the card's front softbox and reflected highlight together; light strength adjusts both without changing the broader scene lighting. Card rotation reseats the card on the shelf and updates its HTML occlusion, shadow, and reflection together. Light angle moves the card's front softbox and reflected highlight together; light strength adjusts both without changing the broader scene lighting. Restore defaults in Studio controls resets these saved values. The former Overview / Personal / Business / Payments tabs are removed; close-up framing remains in Studio controls.

Edit `panels.tsx` and `panels.css`; changes appear immediately without an image bake.

- Personal has three horizontal currency columns, with each amount below its label. Selecting one shows its balance; All accounts restores the total.
- Business transfer rows open details, including status and reference.
- Payments switches between Today and Yesterday; each payment opens a receipt.
- Back / Escape return from details and restore keyboard focus. Pointer movement continues across the live panels, including their buttons and focused controls. On narrow screens, the first tap opens the corresponding close-up; subsequent taps operate its controls.

These are local demo interactions with sample data. There are no financial API calls. If WebGL is unavailable or its context is lost, the same live components remain usable as flat cards.

The front panels are never rendered as images. `livePanels.ts` produces small Canvas2D representations only for the blurred floor reflection, refreshed on content changes and resize rather than each animation frame. The face decals using those canvases are hidden during the main render. Engraved titles stay in WebGL, and the original sculpture materials and lighting are retained. Animation stops when settled or when the page is hidden and respects reduced motion.

`/accounts-panel-bake` remains available for flat visual inspection or optional exports. The legacy bake script and assets in `public/accountshero/panels/` are not used for the live face UIs. Earlier generated full-scene artwork is also retained but unused by this route.

Navigation, headline, controls, pointer/keyboard movement, reduced motion and the lighting environment reuse the home-page implementation. The Framing selector in Studio controls provides closer views, including on mobile. Artwork mode displays the original source photograph; geometry mode shows the taller mesh. Hidden surfaces remain reconstructed from the original photo within the existing limited rotation envelope.

## Checks

- `node --experimental-strip-types scripts/verify-account-card.mjs` checks actual card-to-shelf contact, lower-edge support, wall clearance, and shelf slope.

- `node --experimental-strip-types scripts/verify-accounts-contacts.mjs` checks that width, depth, texture UVs and foundation are unchanged, crowns translate rigidly, all six screen/title grids stay on their faces with uniform scaling and perpendicular axes, and 75 bottom-edge samples meet the actual shelf across 15 viewing angles.
- `node scripts/verify-accounts-browser.mjs` checks live DOM (and no panel-image requests), horizontal currencies, selected balances, transfer/receipt details and focus restoration, payment periods, rotation over panel controls, scene initialization, overflow, geometry mode, pointer/keyboard rotation, reduced motion, mobile interactions/navigation, and the interactive WebGL-loss fallback. Screenshots are written to `output/accountshero/`.
- Source TypeScript passes. The full-project check has an existing `resolve.tsconfigPaths` typing error in `vite.config.ts` with Vite 7.
- `npm run build` runs the production build and static-page verification.

The Forge documentation tool was unavailable. Route metadata follows the repository's existing story contract.
