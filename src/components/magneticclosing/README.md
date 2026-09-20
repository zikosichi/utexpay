# Magnetic closing section

Used before the footer on `/` and `/version-5`. Tiles follow native document scrolling,
with the card sticky at viewport center. Rear/front SVG halves share positioning, scale and
surface brightness. Light the base image equally on both halves; a front-only highlight
exposes the diagonal clipping boundary as a seam.
Only the contact glow and small tile pulse use damped springs; the card pose tracks scroll directly, there is no
scroll compensation or delayed scene travel.

The traveling card uses a 5-degree vertical shear to match the slot edges while keeping
its side edges vertical. After the last tile clears, the shear resets as the cards rotate into landscape and fan out, then lift 100 SVG
units to add space above the closing text.

Card artwork is exported directly from the selected physical variants in the
[UTEX Figma card set](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=1132-67765):

- Gold: `1132:67764` → `public/magneticclosing/card-gold.png`
- Obsidian: `1132:67762` → `public/magneticclosing/card-obsidian.png`
- Platinum: `1132:67760` → `public/magneticclosing/card-platinum.png`

Artwork bytes are preserved. Apply the passage shear and final rotation to the complete
image; never rebuild its contents.
Four vertical gold lights are painted on a single oversized background surface, with radial
falloff, Gaussian blur and subtle grain. There are no individually clipped column boxes.
The entrance gap is compact, panels sit closer together, and the shorter exit brings the
final fan closer to the last panel while preserving space above the copy.
Spacing and passage distance are controlled by the `--mc-*` properties in the stylesheet.
`--mc-exit-clearance` releases the sticky card sooner, keeping it close below the final panel;
mobile uses a larger clearance to account for its smaller card and taller viewport.
Reduced motion displays the final card arrangement and copy without the tile passage or pulses.
