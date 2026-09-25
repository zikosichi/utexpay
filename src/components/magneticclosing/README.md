# Magnetic closing section

Used before the footer on `/` and `/version-5`. Tiles follow native document scrolling,
with the card sticky at viewport center. Rear/front SVG halves share positioning, scale and
surface brightness. Light the base image equally on both halves; a front-only highlight
exposes the diagonal clipping boundary as a seam.
The small tile scale pulse uses a damped spring; the card pose tracks scroll directly.
Chapter lighting and the contact glow run timed animations triggered by crossing a tile.

Portrait tablets through 1100px reuse the mobile composition: no side annotations,
tiles fill the container with 28px gutters, and the card scene scales to 1.25 with
the narrower 245-unit fan spread. The closing headline scales from 44px to 64px.
Keep `COMPACT_LAYOUT_QUERY` aligned with the CSS: both place the sticky card at 60svh,
so tile lighting and the final fan follow the same position after rotation or resizing.

The card fan uses three HTML image layers with fixed pivots, separate from the SVG tile
halves. Only transforms and opacity change during unfolding; the original artwork and
coordinate mapping are preserved. The frame is sized for the final 1.24 scale and shrinks
for passage, avoiding enlargement of a small cached layer. Do not clip the sticky card
container: rotating corners extend above and below it. The outer section handles horizontal
overflow. `--mc-fan-spread` is a percentage of the card frame, converted from the original
310/245-unit offsets. Keep clipping definitions in the stationary zero-size SVG.

Run `node scripts/verify-closing-browser.mjs [url]` to check intermediate poses, reverse
scrolling, full card visibility at tablet/phone/landscape widths, and reduced motion.

The traveling card uses a 5-degree vertical shear to match the slot edges while keeping
its side edges vertical. After the last tile clears, the shear resets as the cards rotate into landscape and fan out, then lift 100 SVG
units to add space above the closing text.

The final spread scales to 1.24 (about 15% larger than the previous 1.08), while passage
scale remains 1. The two rear variants stay invisible until the fan begins, then fade in
over its first 12%; this prevents their different transparent margins from forming a
second edge behind the gold card. `--mc-fan-spread` keeps the larger cards inside mobile
screens by reducing the side offsets from 310 to 245 SVG units at 600px and below.

Original card artwork was exported from the selected physical variants in the
[UTEX Figma card set](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=1132-67765):

- Gold: `1132:67764` → `public/magneticclosing/card-gold.png`
- Obsidian: `1132:67762` → `public/magneticclosing/card-obsidian.png`
- Platinum: `1132:67760` → `public/magneticclosing/card-platinum.png`

The original PNG cards are the only active artwork. The larger final spread is retained.
The platforms use a small hue shift
from yellow to amber, retaining neutral dark metal and bright highlights. Avoid sepia or
blanket brown grading. Both platform halves share the same treatment; passage brightness
animates on a parent group so it never overrides the color treatment.
Apply the passage shear and final rotation to the complete image; never rebuild its contents.
Engravings use warm ivory with a restrained amber glow. Four subtle amber lights are painted on a single oversized background surface, with radial
falloff, Gaussian blur and subtle grain. There are no individually clipped column boxes.
The entrance gap is compact, panels have a .26 × scene-width pitch, and the shorter exit brings the
final fan closer to the last panel while preserving space above the copy.
Spacing and passage distance are controlled by the `--mc-*` properties in the stylesheet.
`--mc-exit-clearance` releases the sticky card sooner, keeping it close below the final panel;
mobile uses a larger clearance to account for its smaller card and taller viewport.
Reduced motion displays the final card arrangement and copy without the tile passage or pulses.

## Chapters

The scene is framed by outlined 01/02/03 markers on the left and corresponding headlines
on the right, within a 1400px container matching the feature grid. Chapter rows move with
their tile, with the desktop text and connectors lifted 30px. Scroll progress only triggers
a boolean light state: on at .36, off below .28, slightly before the card reaches the slot center.
The small hysteresis band prevents flickering around the contact point. Light-on runs for
650ms and light-off for 450ms, completing even when scrolling stops; a separate 850ms
contact glow fires on entry. Reversing direction interrupts from the current light level.
Both SVG halves share the same motion values, keeping their lighting and scale identical.
Chapter rows sit on their own z-index 0 layer behind both tile halves and the card. Both
connector lines follow their side's text center, and their fills travel outward from the stack.
Desktop right copy is offset 64px right and 5px up, with its connector extended to match;
the left marker and connector are offset 5px down. Tablet reduces the horizontal offset
to 28px, and mobile clears these offsets to preserve the space around the traveling card.

At 760px and below, chapter copy stays clear of the artwork beneath each tile with 140px of extra space before the next
tile. Reduced motion shows all three chapters as a static, fully legible list beneath the
final card spread. The decorative numbers and connectors are hidden from screen readers.

## Sep 25: card height and phones

The sticky card rides at `--mc-card-y`: 55svh on desktop (45% from the bottom), 60svh on phones ≤760px (40% from the bottom). `useCardY` in the TSX mirrors those values, because the tile lighting and the card fan-out are scroll offsets measured against the card's position; change both together. On phones the chapter markers and copy beside the tiles are hidden, and the tile gap drops to the tile height + 40px (it was + 140px to make room for that copy).
