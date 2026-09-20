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

## Motion

Added September 18, 2026 after the September 11 review asked for animation. Nothing is a control; everything is ambient and in the register the spending tile set (slow, ease-in-out, no overshoot), and all of it is pure CSS keyed off two classes that `FeatureGridSection` puts on each chapter from one `IntersectionObserver`: `has-entered` (set once at 20% visibility, starts everything) and `is-in` (follows visibility; while it is absent the loops are `animation-play-state: paused`, so they cost nothing off-screen and resume in phase — restarting them snapped every row to its rest state). The grid also gets `data-motion` from the client; the hidden pre-entry state is applied only under that attribute and only for `prefers-reduced-motion: no-preference`, so prerendered HTML, no-JS readers and reduced-motion readers always see every tile in its design state.

- **Entrance.** Chapter heading, then each tile 140ms apart, fade up 7px over 0.8s; the Members card follows its tile by 0.5s.
- **A member arrives** (left business tile). 1.6s after entry a sixth row — Nina Kovač, invited just now — grows in above Marc: a wrapper animates `grid-template-rows: 0fr → 1fr`, so the rows below ease down and the last visible one slides into the blur band, while the row itself fades up. Both list copies (crisp and blurred) run it in step because they share the chapter's class. The list starts exactly as Figma draws it. Under 480px the Pending badge is dropped (it clipped beside the name); the detail line carries the meaning.
- **Emblem.** The angular ring turns once every 24s; the disc breathes (brightness 1 → 1.3) every 6s.
- **Feature rows take turns, and answer the pointer** (right business tile). Four rows — Issue team cards, Set spending limits, Approve payments, Pay suppliers — each icon in a 48px frosted squircle (radius 15, white 7% + 14px backdrop blur, the money panel's white → `#999999` ring; 42px on phones). `BusinessTiles` keeps which row is current in state and puts `is-current` on it: a timer hands the turn to the next row every 4s while the list is on screen (its own IntersectionObserver, so nothing ticks off-screen); hovering a row makes it current at once and holds the timer for as long as the pointer is over the list; on leave the timer restarts from that row, so the loop continues from wherever the reader left it. Reduced motion stops the timer (hover still switches, instantly). Everything visual is a CSS transition off the class: the other rows rest in muted colour (label `#8f8a82`, icon `#8a7a5c`), the current tile carries a faint inner gold glow, a turn crossfades over .64s, and each icon's gesture plays as its row brightens and undoes as it dims — the card's two lines draw in (`pathLength="1"` + dash offset, the second .36s later), the slider knobs move 6px/−5px with the track holes in an SVG mask so they travel with the knobs, the check draws, and the arrow nudges 3px forward once. The rows dim by **colour, never opacity**: an ancestor with opacity below 1 becomes the backdrop root, and the tile's blur would then see only its own row instead of the photo.

## Interactions

- The personal money tile is a still panel, not a control (see below).
- The spending tile is a still frame (Figma 4855:10510): the coffee-and-card scene at the design's 594 × 743 crop, one frosted receipt (black 40% over a 27px backdrop blur, white → #999999 stroke at 30%) with the coffee-cup avatar on a blue 50% gradient. The previous “See a card payment” rotation is gone because the design has no control.
- The business tiles are still frames too (see above).
- Checkout is an interactive, local-only demo over the clean generated Northstar photograph. Card number, expiry and CVC fields format input and validate completion; Visa, Mastercard (including 2-series) and Amex are detected. Completed fields advance focus, Backspace on an empty field returns to the previous field, and mid-field selection/pasting preserves the caret. Pay simulates an 850ms confirmation; replay resets the fields. No values leave component memory.

All values are illustrative. No banking or payment requests are made. Input values are never stored, logged or transmitted. The form is explicitly marked “Demo · no charge” and has Visa/Mastercard test shortcuts; test numbers come from [Stripe’s testing documentation](https://docs.stripe.com/testing#cards).

## Artwork and responsive behavior

App panel surfaces (`fg-glass`) use the supplied 87.59% radial gradient from `#352F29` to `#1D1D1D` at 21.75% / 1.08%, over a 7% white fill, with 8px corners. Their 1px inside strokes match the inspected Figma panels: a vertical white-to-`#999999` gradient at 20% opacity. A masked CSS border keeps the gradient on the edge without covering content or pointer targets. The more specific [currency-card reference 1096:65592](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=1096-65592) has the same stroke but a 5% white fill, a disabled radial fill and 70% node opacity. Currency cards use that translucent surface; selected, hovered and keyboard-focused cards become fully visible. Selected currency cards use a gold gradient stroke. Outer marketing tiles retain their existing borders.

Member initials in the business tile are the library `Avatar/Initials` (313:18): 44px, 16px Manrope Medium, the design's per-person vertical gradients at 50%. Merchant marks keep their own styling.

The first personal-banking tile now reuses V1's `public/personalbanking/phone-scene-*.webp` image, including its illustrated phone interface. It retains the currency controls and shows the complete phone beside them on desktop and below them on mobile. Personal tiles stack on tablet to keep the phone and controls clear.

The currency UI follows [Figma Account Tabs, node 4852:4127](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=4852-4127): 216.75 × 135px cards, 40px blurred currency badges, 8px corners, Manrope labels/balances and JetBrains Mono masked account numbers. `CurrencyAccountCards.tsx` stacks these cards to fit beside the phone. Existing EUR/USD/GBP order and balances are retained, so USD remains funded rather than adopting the reference's Pending example. Exported currency images, divider and chevron are saved unchanged in `public/featuregrid/currencies/`. Figma's documented gold active border is used for selection. The reference screenshot is saved in `output/feature-grid/figma-currency-cards.png`.

The checkout scene uses the generated Northstar still life (1974 × 797), exported as `public/featuregrid/northstar-scene-1974.webp` (90 KB) and `-1100.webp` (38 KB). `CheckoutScene.tsx` and `checkout-scene.css` place three HTML cards over the photo with warm surfaces, slight perspective and grounded shadows. The product thumbnail reuses the photo with a CSS crop. Desktop retains the 1400 × 630 tile; tablet enlarges the foreground cards; phones show the bottle photograph followed by the three cards in a readable vertical sequence. The earlier generated card/espresso/bottle scenes (`card-scene`, `coffee-scene`, `checkout-scene`) and the `SceneImage` helper are removed; their PNG originals remain in `Landing/concept-designs/version-05-assets-2026-09-15/`. The existing transparent `public/utex-card.png` supplies the second team card.

All copy and functional UI are HTML. Scene images have explicit dimensions, responsive sources, lazy loading and async decoding. Pointer depth is event-driven, limited to visible tiles, and disabled for touch, hidden pages and reduced motion. No additional WebGL canvas or continuous scene animation is introduced.

Desktop uses alternating wide/narrow cell pairs and a full-width checkout. Tablet prioritizes controls. Mobile stacks the cells and places checkout below its product scene. Controls use semantic buttons and a native range input.

## Validation

- `scripts/verify-feature-grid.mjs` checks that every scene image the tiles reference is a genuine WebP under 150 KB, and that both sizes of the checkout scene ship.
- Source-only TypeScript passes. The full repository command has existing errors in `output/card-refinement/*.before.ts` and Vite's `resolve.tsconfigPaths` option.
- Production build and the existing static-render checks pass, including `/version-5`.
- Generated assets were visually inspected. Browser interaction/visual QA was not run in this turn; a local preview was queued for review.

The project's `get_forge_docs` tool was not callable in this session. The new route and `.stories.json` follow existing conventions. No hosting project or deployment was created.

### Northstar HTML checkout — September 18, 2026

Replaced the baked-in payment interfaces with HTML/CSS over the generated bottle photograph. Checked the composition in Chrome at 1600px, 768px, 390px and 320px; no horizontal overflow in the processing section. Review screenshots are in `output/northstar-checkout-*.png`. The image budget checks and production/static-render build pass. Forge documentation tools remain unavailable in this session; implementation follows the existing component structure.


### Interactive checkout refinement — September 18, 2026

The product notification is raised, level and translucent with an 18px backdrop blur. The checkout moves up/right; checkout and confirmation share the same perspective and tilt, top-edge thickness and narrow contact shadows. Mobile retains the readable stacked arrangement.

`checkout-fields.ts` owns brand detection, number grouping, Luhn checks, expiry validation and caret indexing. Native inputs provide numeric keyboards, labels, field errors and completion ticks. The receipt announces state changes; duplicate submission is disabled during processing; the timer cleans up on unmount; replay restores input focus. Reduced motion disables the processing pulse and success tick animation.

Validation: `node --test scripts/verify-checkout-fields.mjs scripts/verify-feature-grid.mjs`, source-only TypeScript, the production/static build and `node scripts/verify-checkout-browser.mjs` pass. The browser test exercises typing, paste, caret replacement, separator deletion, invalid expiry, backwards focus, both card brands, success/replay, absence of payment requests and 768/390/320px layouts. Desktop and responsive screenshots are in `output/northstar-interactive-*.png`. The full repository TypeScript command still reports the pre-existing backup-file imports and Vite configuration type errors; the application source check passes.

### Payment scene controls

The **Adjust cards** button opens a floating panel with independent Notification, Checkout and Confirmation settings. Position and XYZ rotation are offsets from each card’s existing responsive layout; soft-shadow X/Y, blur, spread and opacity are editable, along with the solid 3D edge’s X/Y offsets. Position and soft-shadow distances use pixels in the 1400px reference composition and scale with the tile. Sliders and signed numeric fields update immediately. Settings persist in `utex-checkout-controls-v1` in localStorage (layout values only), with per-card reset, reset all and Copy settings. Escape closes the panel and restores focus. A dashed outline identifies the selected card.

`verify-checkout-browser.mjs` additionally checks all three cards’ controls, independent reset, signed numeric entry, persistence across reload, global reset and the mobile panel. Application TypeScript, production build and browser interaction checks pass.

The copied tuning values from September 18 are now the reset/default composition: notification (−158, −67, Y rotation +37°), checkout (+38, −19, Y rotation −7°) and confirmation (+27, −7, Y rotation −7°), with the supplied shadows and edge offsets. Phone layouts remain centered, with further tuning applied relative to this approved composition.

**Rotation anchor** offers a 3×3 pivot picker and precise X/Y percentages plus Z depth in reference pixels. The notification begins at center; checkout and confirmation begin at bottom-center, preserving their previous pivots. A gold dot marks the selected card’s anchor on its surface. `originX`, `originY` and `originZ` persist and export with all other settings; older saved settings receive the default anchors automatically. Browser verification covers each card’s anchors, preset selection, persistence and reset to the approved composition.

### Tabletop reflections

Applied the next approved configuration: checkout pivot (0%, 50%); confirmation position (+56, +4), Y rotation −10°, pivot (0%, 28%), shadow (−4, −12, blur 31, spread 1, opacity 27%) and edge (+2, 0). All other supplied values are preserved.

The checkout and confirmation reflect below their own surfaces with a 1px contact gap and a mask fading through the nearest 30% of the reflected card. The reflection includes live text and follows each surface’s transform and pivot automatically. **Reflection → Strength** is available on those two items (28% checkout / 38% confirmation), persists, and exports as `reflection`. The notification has no reflection. Phone layouts omit reflections because the cards are stacked outside the tabletop scene.

The effect uses [`-webkit-box-reflect`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/-webkit-box-reflect) as a progressive enhancement for Chromium/Safari, including the in-app preview; browsers without it keep the normal cards and contact shadows. Browser checks verify both reflections, their strength control and the absence of a notification reflection.

### Checkout surface refinement

The two standing cards render at 92% scale on desktop/tablet, retaining the selected pivots, rotations and reflections. Phone fields remain full-size. Inputs now have white surfaces, neutral resting borders and one clean darker focus border on the wrapper; a checkout-specific rule suppresses the section-wide native input outline that previously produced the second rectangular ring. Invalid fields use a muted red border, without a halo or shadow.

Pay now reuses the shared `Button` primary component used by the landing CTAs, including the gold fill, gradient rim, typography, hover, focus and disabled states. Checkout CSS only adjusts its width, spacing and responsive sizing. Browser checks cover white inputs, absence of the duplicate outline, shared CTA usage and the existing demo interactions.

### Raised Pay button and floating notification

Notification defaults now use x −129, y −155, Y rotation +36° and a top-left (0%, 0%) pivot, with the supplied shadow values. Its seven-second ease-in-out levitation adds up to 0.65cqw of vertical travel using individual `translate`, preserving the existing transform and pivot. Motion pauses off-screen and while that item is selected for tuning, and is omitted for reduced motion.

The primary Pay button retains the shared CTA component and gains a three-layer gold extrusion using the form’s edge X/Y direction, plus a soft surface shadow. Its face stays parallel to the parent panel, lifts slightly farther on hover, presses down when active, and settles flat when disabled. Browser checks cover the demo, motion preference, off-screen pause and elevation; application TypeScript and production/static builds pass.


### Stable validation layout

Validation copy is now screen-reader-only: `aria-invalid`, field descriptions and error announcements remain available without adding visible content or changing the card’s height. Resting and focused inputs use neutral 1px borders. Invalid inputs use a stronger 2px inset red outline at 85% opacity and a subtle 6% red tint over white; the outline leaves field dimensions unchanged. Input shadows and glow rings are removed. Browser verification asserts unchanged checkout height after invalid expiry, out-of-flow accessible error text and no invalid-field shadow.

### Payment receipt and lighting

After a successful demo payment, the floating product preview becomes a new “Payment received” notification with the merchant, “Just now” and +€48.00. The contents slide/fade in within the existing footprint, respect reduced motion and reset for each replay. Replay retains keyboard focus with a brighter underline instead of the rectangular outline. The checkout surface has a near-white upper-left highlight fading to warm champagne, matching the scene’s light direction. Browser checks cover notification delivery/reset and the outline-free replay state.

The completed demo holds its result until Try again is selected; replay clears the form and returns focus to the card number for manual use. The payment panel horizontal offset is +76 reference pixels. Notification defaults are (−111, −133), with Y rotation +14° and the supplied top-left anchor/shadow. It renders at 85% scale on desktop/tablet with softer squircle corners (`corner-shape`, rounded fallback), and compact padding on phones. Saved scene settings now use `utex-checkout-controls-v5` so the previous draft does not override the newly approved composition. The Pay button has crisp, zero-blur extrusion: a narrow 1.5px top edge and the panel-controlled right edge. A tight warm shadow sits below the enabled button and contracts when pressed; disabled states stay flat. Its gradient rim is white at the left edge, fading to a subtler highlight across the face.

### Pay button controls

`Adjust cards → Pay button` adjusts signed edge X/Y depth independently from the panels (negative Y exposes the top edge), hover lift and rim opacity. Color pickers and editable six-digit hex values control the face, hover face, text, three solid edge tones and left/right highlights. All changes update the live button, persist alongside the existing scene settings and appear under `button` in Copy settings. Reset Pay button leaves panel tuning intact; Reset all restores everything. Older saved settings receive the current button defaults automatically, and stored values are validated before use. The button retains zero-blur edges with a subtle bottom contact shadow.

Disabled Pay states use a pale champagne fill derived from the chosen face color, readable bronze text and a subtle rim. Processing shows a small spinner (static with reduced motion); completion shows a checkmark. The button stays flat, without soft shadows or hover lift, retains native disabled semantics and resets with the demo.

Approved button defaults: edge X 3px, edge Y −1.5px, hover lift 1.2× and rim opacity 38%, with the supplied gold/white colors. The bottom shadow uses a 4px vertical offset, 5px blur and −3px spread, scaling with lift. The remaining three panels retain their approved values.


### One-time viewport checkout demonstration

When at least 45% of the form enters the viewport, a single demonstration types a local Visa test number, expiry and CVC, visibly presses Pay, reveals the confirmation, then reveals the merchant notification 650ms later. Both result cards start invisible and inert, retaining their layout footprint. Typing pauses off-screen or in a background tab, and never moves browser focus. Clicking or focusing the form before completion cancels the introduction and hands over immediately. Try again leaves the sequence in manual mode, so later scrolling never replays it; a new page visit can demonstrate it again.

Reduced motion fills the example without character-by-character typing or a press animation. All timers/animation frames and the observer clean up on unmount. The confirmation uses a translucent warm-dark surface over an 18px background blur; native backdrop-filter support determines that enhancement. Selecting a hidden card in the scene controls temporarily previews it for tuning. The prior timed automatic reset has been replaced by the explicit Try again action.


The notification enters as a complete glass card with a 112px desktop rise (72px minimum on smaller screens) and fade from 86% to full size over 1.2 seconds, without bounce. The entrance decelerates to zero velocity at the exact starting position of the gentle 7-second float; a shared duration/delay keeps the handoff continuous. Its receipt keeps the bottle thumbnail rather than switching to a checkmark. During autoplay only, an aria-hidden visual layer introduces each digit with a 3px rise and 180ms fade, without blur; real input values remain accessible. Manual inputs retain native editing and selection. Typing is paced at 90ms/card digit and 130ms/expiry or CVC digit; a 700ms hold after the final digit precedes the 180ms Pay press, followed by a 1.8-second processing state. Reduced motion omits these effects. Try again uses a rounded translucent button with a replay icon, hover/focus treatment and a reserved footer height.
