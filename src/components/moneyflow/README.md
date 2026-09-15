# Money-flow section

The second section on `/hero-projection`, immediately after the approved photographic hero. Jump to it with `/hero-projection#why-utex`.

Source: [Paper — Sculpted connections](https://app.paper.design/file/01M0WEVJEX8YP46VRJ3VW3Z330/1-0/2SV-0).

`MoneyFlowSection.tsx` contains the copy, illustrative transactions, account and three benefits. `money-flow.css` contains the scoped palette, typography and bronze surface. All lettering is live HTML; the hairline connections and icons are SVG. The account depth uses CSS gradients and shadows and can be refined without rebuilding the hero's 3D scene.

At a 1440px viewport, the section matches the 1248 × 488px Paper scene inside 96px side gutters. Container units keep its cards and connections aligned as the desktop composition narrows. At 1100px and below, the same content follows a vertical receiving → account → spending order, with a two-column transaction list and readable account details. Small-screen benefits become a single column.

The first web refinement removes the “Why UTEX” eyebrow, expands the spacing around the heading, diagram and benefits, and blends from pure black at the hero boundary into the warm section background over 560px.

Transaction borders brighten at the top and fade toward transparency at the bottom. Desktop card pairs share the account's centerline, and all four connector curves are mirrored. Warm light pulses travel from the receiving cards into the account, then from the account toward the spending cards; the mobile connectors carry the same sequence.

Connectors are 1.7px strokes without arrowheads. Each side has a mirrored warm gradient that fades near the transaction cards and brightens toward the account, with the same treatment on the vertical mobile connectors.

Material refinements retain the original warm bronze/gold palette. The center account has a single 1px metal rim and a smooth satin face with cleaner reflections. Inner bevel highlights and the hard base edge are removed to keep the perimeter subtle. Its dimensions and connection points stay aligned with the surrounding flow.

A broad, blurred reflection passes beneath the account text between the incoming and outgoing pulses. All three stages share a six-second cycle: light arrives around 1.5 seconds, crosses the face and leaves around 3 seconds. The reflection travels downward in the mobile layout, follows the same offscreen pause behavior, and is disabled for reduced motion.

The beams use CSS stroke animation on SVG paths. An intersection observer and visibility listener pause them while the diagram is offscreen or the tab is hidden; both are cleaned up on unmount. Reduced-motion mode shows only the static connections. The section renders in the static build. The route owns the main landmark; the hero and money flow are sibling sections, so the hero's canvas and pointer area remain limited to the hero.

## Verification

- `npm run build` passes, including all 10 static-page checks; the new content is present in the production HTML.
- Browser review at 1440, 1200, 768, 390 and 320px: no horizontal overflow or clipped cards, expected fonts loaded, and the existing hero canvas initialized at every size.
- `tsc --noEmit` currently reports the pre-existing `resolve.tsconfigPaths` type error in `vite.config.ts`; the new component has no reported diagnostics.
- The development page has an existing `/favicon.ico` 404; no JavaScript exceptions were recorded during the review.

Forge's documentation tool was unavailable during implementation. The existing route story format was retained.
