# Magnetic closing section

Used before the footer on `/` and `/version-5`. Tiles follow native document scrolling,
with the card sticky at viewport center. Rear/front SVG halves share positioning, scale and
surface brightness. Light the base image equally on both halves; a front-only highlight
exposes the diagonal clipping boundary as a seam.
The small tile scale pulse uses a damped spring; the card pose tracks scroll directly.
Chapter lighting and the contact glow run timed animations triggered by crossing a tile.

The traveling card uses a 5-degree vertical shear to match the slot edges while keeping
its side edges vertical. After the last tile clears, the shear resets as the cards rotate into landscape and fan out, then lift 100 SVG
units to add space above the closing text.

Card artwork is exported directly from the selected physical variants in the
[UTEX Figma card set](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=1132-67765):

- Gold: `1132:67764` → `public/magneticclosing/card-gold.png`
- Obsidian: `1132:67762` → `public/magneticclosing/card-obsidian.png`
- Platinum: `1132:67760` → `public/magneticclosing/card-platinum.png`

Artwork bytes and original card colors are preserved. The platforms use a small hue shift
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
