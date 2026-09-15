# Version 5 — Feature grid

Added September 15, 2026 from the selected `Landing/concept-designs/post-meeting-middle-2026-09-11/02-feature-grid.png` and September 11 meeting feedback.

## Review

- `/version-5#banking` opens the full landing with Version 5 selected on its first render.
- `/?personal=features#banking` selects it on the main route.
- **05 — Feature grid** is the home default. Versions 01–04 remain available in the numbered selector and through the existing query parameter.
- `/section-options?direction=feature-grid` includes the same component as option 05.

The existing hero and globe components remain in place. Version 5's content width was increased from 1280px to 1400px during the personal-banking refinement round, with the existing desktop/tablet/mobile gutters retained. It shares the landing's fonts and warm charcoal/champagne palette.

## The personal money tile

Rebuilt September 15, 2026 from Figma `Article` 4855:9675, with the panel fill from `Frame` 4855:10478 — the parent frame does not carry that fill. It replaces the earlier trio of two-part account cards with one frosted panel: the total, then a compact row per currency.

The tile renders at exactly the design's 860px width in the default grid, so the offsets in `feature-grid.css` are the design's own pixel values. Three things had to be translated rather than copied:

- **The tile's 1px border.** Figma measures children from the frame's outer edge, so every offset is 1px smaller in CSS: the panel sits at `48.44px`, not `49.44px`.
- **Inside strokes.** Figma draws a frame's stroke inside, adding nothing to its box, and measures padding from the outer edge. A CSS border would grow the panel and each row by 2px, so each stroke is a masked ring on a pseudo-element, which keeps the Figma padding and stays out of the layout.
- **Auto line height.** Figma's auto leading for Manrope is tighter than the browser's `normal` — 22px at 16px and 49px at 36px, both measured off the render and set explicitly. Left to `normal` each row came out 70px instead of 68px.

**Stroke gradients** come from `Frame` 4855:10692, and the flattened `get_design_context` output cannot express them — it reports every stroke as a plain white border. The real paints came from exporting that node as SVG (`download_assets`, `defaultFormat: svg`) and reading its gradient defs. Each has explicit endpoints that do not simply span the box, so both the CSS angle and the stop positions are converted from them:

| Stroke | Figma | CSS |
| --- | --- | --- |
| Panel | white → `#999999` at 60%, stroke 20%, `(299,3.5) → (-17,327)` | `linear-gradient(224.33deg, #ffffff33 1%, #9999991f 100%)` |
| Account row | same colours, `(152,0) → (135,68)` in row space | `linear-gradient(194.04deg, #ffffff33 21.8%, #9999991f 75.1%)` |
| Currency coin | white → `#999999`, stroke 50%, vertical | `linear-gradient(#ffffff80, #99999980)` |

The row's stops are not 0 and 100 because Figma's ramp is shorter than the diagonal CSS lays across a 270×68 box, and sits slightly off its centre.

The amount uses proportional figures, as the design does; forcing tabular figures visibly changed its width. The panel's radial wash sits at 20% over a flat white 5%. It is a rotated ellipse in Figma, which CSS gradients cannot express, so it is the closest axis-aligned fit, within about one level out of 255 across the panel.

Verified against the Figma renders: panel and row geometry match to within half a pixel, every stroke edge is within a few levels out of 255, and the remaining pixel difference is glyph rasterisation.

The tile's own border is still the grid's gold `#cbb0784d`. The exported SVG shows the design uses a vertical `white → #999999` at 20% there, but that border is shared by every tile in the feature grid, so it has been left for a deliberate decision rather than changed under one tile.

## The checkout tile

Rebuilt September 15, 2026 from Figma `CheckoutDemo` 4855:22966. The design is the bottle scene with a caption and nothing else, so `CheckoutScene.tsx` replaces the interactive `CheckoutDemo`. The tile is the grid's full 1400px, so the design's offsets are literal at that width (minus the tile's 1px border, as with the other tiles):

- `image 154` is 1653 × 664 with its right edge on the tile's right edge and its top at −0.37, so the bottom 34px are cropped. Rather than fixed pixels, the scene is `calc(118.0714% + 2px)` wide and the tile keeps `aspect-ratio: 1400 / 630`, so below 1400px the whole composition scales together instead of drifting. Below 900px the tile takes a fixed 470px and the scene covers it centred on the checkout; on phones the caption moves above a 300px band of the scene so neither covers the other.
- `Frame 147` is the shade: black 70% → 0 across the top 201px, 1401 wide from the tile's outer edge.
- `Frame 145` sits at y 56 and is centred: Plus Jakarta Sans SemiBold 42 with Figma's auto leading, which renders 53px, then a 12px gap, then Manrope 16/23.25 in `#c6c2bb`.

The scene is the composed render Zviad supplied (bottle, order slip, hosted checkout form and receipt card baked into one 1977 × 795 image); Figma's own fill at the time of reading was the bare bottle scene.

## The business tiles

Rebuilt September 15, 2026 from Figma `BusinessTiles` 4855:22868 (section 4855:22860). The row is 521.51 + 18 + 860.49 = 1400px, both tiles 600.28px tall, and neither has a control in the design, so the earlier account switcher, spending-limit slider and supplier-payment demo are gone. `BusinessTiles.tsx` is static; `GlassAvatar.tsx` and the supplier/limit helpers in `demo-state.ts` went with them.

**Left tile** (`Article` 4855:22869): `#141414` under a warm radial glow anchored at the bottom-left corner (centre 52.15, 600.28; radii 701.6 × 807.6; gone by 70%), and a white → `#999999` stroke at 30% — not the grid's gold. The stroke is drawn by letting the tile's gradient show through a transparent border, because a masked pseudo-element ring is clipped by the tile's `overflow: hidden` (it clips to the padding box).

The **Members card** (`Card · Members` 4855:22870, 442 × 506 at 40, 227.47) runs past the tile's bottom edge; a 117px fade (`Rectangle 5`, transparent → `#0b0b0b` at 70%) finishes it. Its fill is Figma's rotated radial `#352f29 → #1d1d1d` (matrix 187.3 443.2 −387.1 167.9, centred 96.1, 5.5), fitted to the nearest axis-aligned ellipse — `radial-gradient(445px 480px at 96.126px 5.461px, …)`, within one level of 255 across the visible part — over white 7%, behind a 10px backdrop blur, with the shared white → `#999999` stroke at 20%. The header is `#0d0d0f` at 60% with a `#f6e69f` 20% bottom rule, and carries the eclipse texture (`image 145`: 878 × 439 at −386.45, −137.57, 40%, masked by a white → transparent ramp 987px wide from the header's left edge); the texture is `public/featuregrid/members-eclipse-878/1756.webp`, Figma's raw fill cropped to the 878 × 439 cover. The emblem (`Group 10`) is an 80px angular-gradient ring 1.54px wide — Figma's own stops, copied from its export — around a 67.69px disc (`#d4941c` 50% → `#22201e`) and the 30px feather users icon (`public/featuregrid/users.svg`).

Rows follow the same inside-stroke rule as the money tile: Figma's 12px padding is measured from the outer edge over its 1px stroke, so the CSS row has a 1px top border and 11px top padding, giving the design's 68px. The invited row is 70px because its `Badge` (8px dot + 12/16 label, background = text colour at 10%) is 24px tall. Line heights are Figma's auto values set explicitly — 22px for 16px Manrope, 19px for 14px, 20px for 15px, 15px for 11px, 45px for 36px Plus Jakarta Sans.

**Progressive blur.** The design's card is sharp at the top and soft at the bottom: in the Figma render the first two rows are crisp, the third measurably blurred (a 1.5px gaussian on our render matches it best), the fourth softer still. Figma's SVG export flattens this to a single `feGaussianBlur`, and `get_design_context` reports it as a plain `blur-[10px]`, which would blur the whole card. CSS has no progressive blur, so the members list is rendered twice: the crisp copy masked out and a 2px-blurred copy masked in across list y 165–225 (between the second and third rows).

**Right tile** (`Article` 4855:22955): the cards-on-a-notebook photo (`image 153`, 926 × 617 at 0.49, −8.53, so it runs 66px past the tile's right edge; `public/featuregrid/business-cards-scene-926/1536.webp` from the raw fill) under a 508px black → transparent ramp (`Frame 146`) against the right edge, which carries the copy 60px in from its right at y 63. The copy itself follows Zviad's Sep 15 mock rather than the Figma frame: “Keep your business moving.”, a 297px subline, then three feature rows — 32px gold Feather-style line icons (team card, spending sliders, arrow) 28px from 20px Plus Jakarta Sans labels, 30px apart. Its stroke matches the left tile (white → `#999999` at 30%) instead of the grid's gold, also at Zviad's request.

Verified against the Figma render with the same crop-and-diff method as the money tile: mean difference 1.8 levels out of 255 across the section, every measured text box within 1px, all row edges on the same pixel. The tile borders read brighter than the render because Figma draws them 0.556px wide and CSS draws 1px at the same 30% — the same trade the personal tiles already make.

Below the 1400px grid the row goes 1fr 1fr at 1100px (the card shrinks with its tile and the copy stays right-anchored), single column at 900px, and on phones the card moves to 24px insets, the access column loses its fixed width, the photo tile becomes a 520px cover crop with the copy at the top, and under 480px the chevron column is dropped and the row type steps down a size.

## Interactions

- The personal money tile is a still panel, not a control (see below).
- The spending tile is a still frame (Figma 4855:10510): the coffee-and-card scene at the design's 594 × 743 crop, one frosted receipt (black 40% over a 27px backdrop blur, white → #999999 stroke at 30%) with the coffee-cup avatar on a blue 50% gradient. The previous “See a card payment” rotation is gone because the design has no control.
- The business tiles are still frames too (see above).
- Checkout starts at Pay. Choose shows order details. Submitting runs a short processing state and displays confirmation. Duplicate submission is disabled; replay returns to Pay. Fixed example card details do not collect input, and the receipt appears only after confirmation.

All actions are local demonstrations with illustrative values. No banking or payment requests are made. Checkout timers are cleaned up on unmount. Keyboard focus moves to review/confirmation, with restoration on cancellation/replay.

## Artwork and responsive behavior

App panel surfaces (`fg-glass`) use the supplied 87.59% radial gradient from `#352F29` to `#1D1D1D` at 21.75% / 1.08%, over a 7% white fill, with 8px corners. Their 1px inside strokes match the inspected Figma panels: a vertical white-to-`#999999` gradient at 20% opacity. A masked CSS border keeps the gradient on the edge without covering content or pointer targets. The more specific [currency-card reference 1096:65592](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=1096-65592) has the same stroke but a 5% white fill, a disabled radial fill and 70% node opacity. Currency cards use that translucent surface; selected, hovered and keyboard-focused cards become fully visible. Selected currency cards use a gold gradient stroke. Outer marketing tiles retain their existing borders.

Member initials in the business tile are the library `Avatar/Initials` (313:18): 44px, 16px Manrope Medium, the design's per-person vertical gradients at 50%. Merchant marks keep their own styling.

The first personal-banking tile now reuses V1's `public/personalbanking/phone-scene-*.webp` image, including its illustrated phone interface. It retains the currency controls and shows the complete phone beside them on desktop and below them on mobile. Personal tiles stack on tablet to keep the phone and controls clear.

The currency UI follows [Figma Account Tabs, node 4852:4127](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=4852-4127): 216.75 × 135px cards, 40px blurred currency badges, 8px corners, Manrope labels/balances and JetBrains Mono masked account numbers. `CurrencyAccountCards.tsx` stacks these cards to fit beside the phone. Existing EUR/USD/GBP order and balances are retained, so USD remains funded rather than adopting the reference's Pending example. Exported currency images, divider and chevron are saved unchanged in `public/featuregrid/currencies/`. Figma's documented gold active border is used for selection. The reference screenshot is saved in `output/feature-grid/figma-currency-cards.png`.

The checkout scene is Figma's own raster (`image 154`, 1978 × 795), saved as `public/featuregrid/pay-scene-1978.webp` and `-1100.webp`. The earlier generated card/espresso/bottle scenes (`card-scene`, `coffee-scene`, `checkout-scene`) and the `SceneImage` helper are removed; their PNG originals remain in `Landing/concept-designs/version-05-assets-2026-09-15/`. The existing transparent `public/utex-card.png` supplies the second team card.

All copy and functional UI are HTML. Scene images have explicit dimensions, responsive sources, lazy loading and async decoding. Pointer depth is event-driven, limited to visible tiles, and disabled for touch, hidden pages and reduced motion. No additional WebGL canvas or continuous scene animation is introduced. Reduced motion also skips the checkout delay.

Desktop uses alternating wide/narrow cell pairs and a full-width checkout. Tablet prioritizes controls. Mobile stacks the cells and places checkout below its product scene. Controls use semantic buttons and a native range input.

## Validation

- `scripts/verify-feature-grid.mjs` checks that every scene image the tiles reference is a genuine WebP under 150 KB, and that both sizes of the checkout scene ship.
- Source-only TypeScript passes. The full repository command has existing errors in `output/card-refinement/*.before.ts` and Vite's `resolve.tsconfigPaths` option.
- Production build and the existing static-render checks pass, including `/version-5`.
- Generated assets were visually inspected. Browser interaction/visual QA was not run in this turn; a local preview was queued for review.

The project's `get_forge_docs` tool was not callable in this session. The new route and `.stories.json` follow existing conventions. No hosting project or deployment was created.
