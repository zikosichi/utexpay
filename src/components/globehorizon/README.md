# International payments — dotted globe

UTEX Pay section appended after personal banking on the main landing page, at `/#international-payments`. The standalone preview remains at `/globe-horizon`. Import `GlobeHorizonSection` to reuse it elsewhere. The headline is HTML; the globe is a live Three.js WebGL scene. The send-money box and its demo interaction have been removed.

## Visual and interaction

- A sparse gold point cloud with recognizable continents, dim ocean points, and four fine great-circle payment routes. Soft additive tube halos illuminate the routes; procedural point halos and bright centers make the traveling markers shine. No bitmap, image texture, bloom pass, or postprocessing.
- Slow automatic rotation and traveling route markers. Drag with a mouse or swipe horizontally on touch to rotate. Vertical touch scrolling remains native.
- Dots rest at 55% size. A soft circular field around the mouse or hovering pen enlarges nearby dots up to 1.95 times their resting size. Previously hovered areas linger for 1.3 seconds, holding briefly and then fading smoothly to create a gentle trail. Overlapping samples use their strongest influence so the dots never grow beyond the same maximum. Leaving the canvas fades the trail away. Touch does not activate hover; reduced motion responds immediately to pointer input without a trail, easing, or continuous frames.
- Focus the globe and use arrow keys to rotate (Shift for a larger step), or Home to restore the initial view. The drag hint and visible reset/pause buttons are removed.
- “Globe controls” at the lower left opens live dot-size (50–180%), density (25–200%), and hover-radius (25–200%) sliders. Size defaults to 55%, density to 100%, and radius to 130%. Radius scales the widened responsive field (195–450 CSS pixels at 100%). The panel supports keyboard controls, Escape, and outside-click dismissal; preferences are validated and saved in local storage. Previous settings migrate once to the 130% radius while preserving dot size and density. It leaves the main landing page's Studio controls accessible at the lower right.
- Reduced motion disables automatic movement, including when the system preference changes. Direct manipulation and appearance adjustments still work. Animation stops offscreen, in hidden tabs, and while dragging.
- Responsive framing from 320px upward. Plus Jakarta Sans headings, Manrope body text, JetBrains Mono eyebrow; colors remain in the UTEX dark/gold direction.
- The sphere extends beyond the page width, with its horizon anchored at the same height. Section height and the fade beginning at 60% of the globe stage stay fixed. A transparent CSS mask reveals the body's shared background; sections do not paint separate base colors.
- Desktop dot diameter grows gradually with viewport width (at the 55% setting, about 2.4 CSS pixels at 1920px, 2.9 at 2560px, and 3.9 at 3840px). Device pixel ratio is applied separately for crisp rendering. Mobile rests at about 1.18px. The hover radius uses CSS pixels so the interaction stays circular on wide and high-DPI screens.

## Implementation

`scene.ts` is dynamically imported when the section approaches the viewport. It renders one point cloud, a depth-only sphere that occludes the rear hemisphere, four lines with small tube halos, and geometric route markers with shader glows. Pixel ratio is capped at 2 on desktop and 1.5 on mobile; automatic animation renders at most 30 frames per second. A fixed pool of 40 pointer samples feeds the dot shader; expiry uses elapsed wall time, with a 150ms hold and a smooth fade over the remaining 1.15 seconds. A stationary pointer refreshes only the newest sample. No polygon processing or React updates run inside the animation loop. Appearance sliders update shader uniforms without recreating the renderer or resetting the view.

At 100% density, the original 28,943 points (17,916 land points) are preserved exactly. The density control can reveal a second interleaved distribution for a maximum of 57,852 points. Normalized Int16 positions, land flags, and stable density ranks occupy 578,520 bytes in `public/globehorizon/earth-points-v2.bin`. Rank filtering changes the actual dot count without moving dots or thinning by latitude. Fibonacci distributions keep density even across the globe. The source is the project's existing public-domain Natural Earth 110m land dataset, retained at `scripts/data/globe-land.geojson`. Regenerate with:

```sh
node scripts/bake-globe-points.mjs
```

The scene handles WebGL context loss/restoration, releases GPU resources and observers on unmount, and aborts pending geography fetches. Semantic heading and description remain available without JavaScript or WebGL; the interactive globe requires WebGL2. The former image-based study is archived in the ignored `output/globe-horizon/artwork-study/` directory and is not shipped.

## Validation

```sh
pnpm build
node scripts/verify-globe-browser.mjs http://127.0.0.1:3042/globe-horizon/
```

Serve `.output/public` at that port for the second command. Browser checks cover the 55% default and migration, gradual hover response, pixel changes confined to the pointer's neighborhood, reduced-motion and touch hover behavior, live size/density rendering, keyboard slider interaction, persistence after reload, panel dismissal, preservation of the default point count, and removal of the old controls. They also cover reduced motion, context recovery, absence of mutation requests, real WebGL geometry, mouse/touch/keyboard rotation, responsive layouts and controls at 1920/1440/768/390/320px, offscreen suspension, and semantic content without JavaScript. Screenshots and verification results go to the ignored `output/globe-horizon/` directory.

Full repository TypeScript checking has unrelated existing errors in `output/card-refinement/*.before.ts` and `vite.config.ts` (`resolve.tsconfigPaths`); the globe files have no reported TypeScript errors. Forge documentation tools were unavailable, so the route and story follow existing repository conventions. Nothing was deployed.
