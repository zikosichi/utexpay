# Supplied mobile UI and card composite

Created September 25, 2026 using built-in ImageGen in compositing mode. User supplied the phone UI and card artwork; the user's Gemini output is the base scene. Inputs and master are retained in `public/featuregrid/approved-ui-v1/`, with the base scene at `public/featuregrid/gemini-v1/personal-phone-card.png`. WebP derivatives use quality 90 (1254px) and 88 (640px). Display layout is shared with the existing personal alternatives.

## Prompt

Use case: compositing
Asset: square UTEX Pay personal-banking landing-page photograph.
Input image 1 is the approved SCENE / EDIT TARGET: the user's Gemini image of two realistic hands, cream knit cuff, one holding a phone and the other holding a physical gold bank card.
Input image 2 is the EXACT NEW PHONE SCREEN artwork supplied by the user. This is authoritative.
Input image 3 is the EXACT PHYSICAL CARD design artwork supplied by the user. This is authoritative.

Edit ONLY the phone's display contents and the physical card's face/material. Preserve image 1's composition, phone pose, size, camera perspective, hands, skin, nails, fingers, grip, sleeves, background and warm lighting. Keep the improved photographic hands unaltered. Do not redraw them into CGI hands. Output a single full square image at 1254x1254 or greater.

PHONE SCREEN: Composite input image 2 as the actual screen artwork, perspective-warped onto the screen glass of the phone. Preserve the screenshot's entire hierarchy, typography, relative sizes, layout, colors, icon shapes and exact text. Fit it naturally below the phone's native status-bar/Dynamic Island area, with the screenshot bottom navigation visible above the rounded bottom bezel. The screen MUST show UTEX PAY top left, circular S avatar top right, main balance €28,142.55 and eye icon, smaller euro balance, Send / Request / Deposit buttons, Accounts heading and Add Account, horizontally cropped Total and Euro account tiles, Cash Flow chart with Daily / Monthly controls, and bottom navigation Home / Cards / Accounts / Transactions / More. The existing old greeting, on-screen credit card and recent-activity list in image 1 MUST be completely replaced by image 2. Do not invent a new dashboard, reword labels, duplicate elements, or add another on-screen card. Use image 2 as supplied, not a rough visual interpretation. Subtle glass reflection only, screen remains readable.

PHYSICAL CARD: Replace its face using image 3's EXACT layout, naturally perspective transformed and illuminated to sit in the existing hand. Chip in the UPPER LEFT (not the old card's middle-left), correct UTEX PAY logo in the UPPER RIGHT, masked number '**** **** **** 4532' across the left-middle, small 'EXP' below it, '07 / 30' below EXP, 'SAM GOLD' below the date, and overlapping red/orange circles LOWER RIGHT. Keep every element's proportions and positions relative to image 3. Use its muted olive-champagne/gold color, not bright yellow gold. Turn the flat artwork into a real thin bank card with a fine satin/brushed finish, restrained reflections, a subtle beveled edge and physically plausible contact shadows under the fingers. Artwork is printed/finely embossed, not glowing. No extra text, no rearranged logo, no oversized chip, no shiny CGI plastic. Preserve image 1's card position, angle, size, corners and finger occlusion.

Invariants: unchanged photographic human skin and anatomy; same dark warm scene and framing; no added props; no caption or watermark; maintain credible photographic detail.
