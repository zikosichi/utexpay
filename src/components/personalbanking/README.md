# Personal banking — second landing section

Implemented 11 September 2026 from the approved [Paper Page 2 design](https://app.paper.design/file/01M0WEVJEX8YP46VRJ3VW3Z330/2-0/490-0), the generated everyday-to-business concept, and the [personal dashboard in Figma](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=4793-10738).

## Visual directions

- **01 Phone** preserves the original generated phone artwork and coffee notification.
- **02 Dashboard** preserves the original pad scene. A complete generated product scene combines the compact portrait pad, glass display, champagne metal body, dashboard UI, amber studio lighting and physical floor reflections in one camera perspective. It suggests a small tablet without a camera, status bar, home indicator, hardware buttons or browser chrome. There is no floating notification in this direction.
- **03 Concept** is the third alternative. The latest 1920 × 2068 Figma dashboard appears on a nearly square, edge-to-edge glass plane with a hairline champagne edge. The futuristic shell has no thick sidewall or inset bezel. Warm amber backlight follows the original phone reference, with a black upper background and no blue ambient cast. All four image edges fade into the page and closer-look preview.
- **04 Dashboard stack** is the default; see [its documentation](../dashboardstack/README.md).
- **05 Feature grid** adds personal account/spending demonstrations, business account switching/team controls, and customer checkout. Open `/version-5#banking` or `/?personal=features#banking`; see [its documentation](../featuregrid/README.md).
- Five small numbered controls on the section’s right edge change the visual in place. Native button semantics, keyboard activation and `aria-pressed` expose the selected option. Versions 01–03 share their copy and layout; all five share the same container width and responsive gutters.
- Direct review links: `/?personal=concept#banking`, `/?personal=dashboard#banking` and `/?personal=phone#banking`. The query chooses the initial direction; the in-page switch is local state. Dashboard stack is the default when no direction is requested.
- The closer-look dialog follows the selected direction.

## Composition

- The Concept image is displayed at 110% inside its existing masked scene, using the source's black margins to make the panel larger while keeping a soft perimeter. The scene clips layout overflow from the enlarged image.
- An additional `clamp(32px, 3vw, 48px)` separates this section from the hero. The version switch moves down with this spacing.
- The shared `.studio` hero has stacking level 1 and this section level 0. The fixed navigation remains above the following content even though both sections create isolated stacking contexts. Native dialogs still use the browser's top layer.
- Replaces the money-flow section on `/` and `/hero-projection`.
- All four versions use the shared `banking-container.css`: 1280px maximum width, with 48px gutters on desktop, 28px at 900px and below, and 20px at 620px and below. Device wrappers stay within this container and keep their natural aspect ratios. Plus Jakarta Sans headings, Manrope body, JetBrains Mono eyebrow.
- Phone scene includes champagne metal, amber studio lighting, natural floor texture and shadow. Its outer edges blend into the hero's black background with a CSS mask.
- Headline, description, feature icons and the phone notification are HTML/SVG. All device scenes, including their illustrative screens, are generated bitmaps. The flat dashboard reference was composed from the Figma design and local assets before generation.
- Dashboard condenses the source into identity, total balance, quick actions, three currency accounts, cash flow, cards and recent activity. The source reference used the hero’s sample currency data from `account-preview-data.ts` and the Figma cash-flow/transaction content. The rendered illustration does not execute banking actions; screen changes require regenerating the scene.
- Pointer movement anywhere in the section, including over the copy and empty space, adds a small offset to the complete scene and an opposing offset to the phone notification. Coordinates use the full section bounds, and leaving the section resets the offset. The pad’s perspective, reflections and lighting stay baked into the same image. Movement stops offscreen, in hidden tabs, on touch devices, and for reduced-motion users. No continuously running animation or additional WebGL scene.
- Below 1050px the copy and scene stack. The device artwork is capped at the available container width, including on mobile.
- The Banking navigation target is `#banking`; the old `#why-utex` bookmark still resolves here.
- “Take a closer look” opens a native dialog with the visual at a larger size. Escape, close button, backdrop dismissal, focus restoration and scroll restoration are supported. This is a visual preview, not an account-opening flow.

## Image assets

Generated with the built-in ImageGen tool in reference-edit mode. Exact prompt and reference are in [image-prompt.md](./image-prompt.md).

- `public/personalbanking/phone-scene.png`: original 1254 × 1254 output.
- `phone-scene-640.webp`: 31 KB; `phone-scene-960.webp`: 59 KB; `phone-scene-1254.webp`: 87 KB.
- Responsive `srcset`, explicit dimensions, lazy loading and asynchronous decoding. No external image host.
- Phone is an illustrative presentation of mobile banking; no native-app availability claim is made. Names, balances and transactions are examples.

The complete pad scene was generated with built-in ImageGen using the attached phone image for photographic finish and a flat capture of the dashboard for screen content. Its exact final prompt is in [pad-scene-prompt.md](./pad-scene-prompt.md).

- `public/personalbanking/pad-scene-v1.png`: original 1122 × 1402 output, including pad, screen, studio and reflections.
- `pad-scene-v1-640.webp`: 57 KB; `pad-scene-v1-960.webp`: 104 KB; `pad-scene-v1-1122.webp`: 131 KB.
- Responsive image sources, explicit dimensions, lazy loading and asynchronous decoding. CSS masks blend the scene edges into the black section. The enlarged preview uses the same complete render.
- The earlier `dashboard-studio-v1` background-only experiment is preserved as an unused asset. Its prompt is in [studio-background-prompt.md](./studio-background-prompt.md).
- The previous editable dashboard, its styles and the flat screen reference are archived in `Landing/concept-designs/personal-banking-pad-render-2026-09-11/` in the parent vault.

The first Concept render is preserved as an unused asset. Its exact prompt is in [pad-concept-prompt.md](./pad-concept-prompt.md).

- `public/personalbanking/pad-scene-v2.png`: original 1122 × 1402 output.
- `pad-scene-v2-640.webp`: 60 KB; `pad-scene-v2-960.webp`: 112 KB; `pad-scene-v2-1122.webp`: 138 KB.
- Preserved source for the earlier concept and lighting studies.

The previous tall Concept scene uses the approved graphite study and the user's full 1920 × 2880 Figma export. Built-in ImageGen changes the camera to show the right edge while preserving the normal reading direction of the UI. Exact prompt: [pad-figma-right-prompt.md](./pad-figma-right-prompt.md).

- `public/personalbanking/pad-scene-v3.png` is the complete scene; responsive WebP files are saved alongside it.
- The generated screen includes the balance, both action-needed rows, four account tiles, cash-flow chart, gold card and all four transactions. Fine details are generated and are not a pixel-exact overlay of the PNG.
- The original Figma source and approved opposite-angle render remain in `Landing/concept-designs/personal-banking-figma-composite-2026-09-11/` in the parent vault.

The first compact Concept uses `Frame 122.png` (1920 × 2422), a viewport about 16% shorter at the same width. The shell is re-rendered at the new proportions, with the original UI grid and card proportions. Its prompt is in [pad-compact-prompt.md](./pad-compact-prompt.md).

- `public/personalbanking/pad-scene-v4.png`: 1254 × 1254 complete scene, generated using built-in ImageGen compositing edit mode.
- Responsive WebP: 640px (31 KB), 960px (58 KB), 1254px (86 KB).
- Square scene layout reduces the image area from about 937px to 750px high at a 1440px viewport. The section contracts from 1081px to 960px; the image width stays the same.
- Source, exact prompt and asset metadata are preserved in `Landing/concept-designs/personal-banking-compact-2026-09-11/` in the parent vault. The previous tall images remain available as local assets.

The thin-shell revision uses `Frame 1333.png` (1920 × 2068), a further 15% reduction in viewport height. It ends at the complete Cash Flow and Cards panels, with no activity list. The shell returns to the earlier futuristic glass plane with a hairline edge; this earlier lighting follows v4. Exact prompt: [pad-thin-compact-prompt.md](./pad-thin-compact-prompt.md).

- `public/personalbanking/pad-scene-v5.png`: 1254 × 1254 complete scene, generated with built-in ImageGen compositing edit mode.
- Responsive WebP derivatives: 640px (29 KB), 960px (54 KB), 1254px (79 KB).
- Retains the square responsive scene container and edge masks; screen proportions change inside the render. Earlier assets remain available locally.
- Source, prompt and asset metadata: `Landing/concept-designs/personal-banking-thin-compact-2026-09-11/` in the parent vault. The screen is a generative composite, not a pixel-exact overlay.

The active v6 render removes the blue upper ambience and matches the user's original phone lighting reference: localized amber backlight fading into deep black. It preserves the v5 panel silhouette, screen layout and normal blue currency icons. Exact prompt: [pad-warm-only-prompt.md](./pad-warm-only-prompt.md).

- `public/personalbanking/pad-scene-v6.png`: 1254 × 1254, generated with built-in ImageGen lighting-weather edit mode.
- WebP derivatives: 640px (29 KB), 960px (53 KB), 1254px (79 KB). The existing square layout and masks are unchanged.
- Lighting reference, prompt and metadata: `Landing/concept-designs/personal-banking-warm-only-2026-09-11/` in the parent vault.

Dashboard source provenance is in [figma-reference.md](./figma-reference.md). All assets are saved locally; the implementation does not depend on expiring Figma URLs.

## Validation

- Scale/spacing/navigation revision: build and all 13 static pages pass. Reproduced the original overlap at 1440px: a point in the nav hit the second section while scrolled. After the fix, nav hit-testing succeeds across the bar, the image is 824.6px versus a 749.7px scene (110%), and the section has 72px added spacing. At 390px the gap is 48px, image scale is 110%, the page has no horizontal overflow, and the open mobile menu receives pointer hits above the section. The closer-look dialog remains above the navigation.
- Warm-only revision: production build and all 13 static pages pass. Verified v6 loads at 1440px, the upper blue cast is absent, the warm glow blends into black and the full reflection fits inside the section with no overflow. Image dimensions and responsive layout are unchanged.
- Thin-shell revision: production build and all 13 static pages pass. Verified the v5 asset, short glass silhouette, complete edge fade and matching closer-look preview at 1440px. No section overflow; the full reflection fits inside the existing scene bounds. Responsive dimensions and CSS are unchanged from the compact revision.
- Compact revision: production build and all 13 static pages pass. Visually checked the new render at 1440px and 390px; the image loads at its square aspect, the complete floor fade fits inside the section, and mobile has no section overflow. The mobile closer-look dialog uses the same compact image and soft perimeter mask.
- Concept revision: build and all 13 static pages pass. Checked 1440, 390 and 320px: all three switch buttons fit, exactly one is selected, image loads, no section overflow or floating notification, and reduced motion stays still. Native Enter switches across all three original/new assets. Desktop/mobile preview uses the selected Concept render; Escape and focus restoration pass. Screenshots and report: `Landing/concept-designs/personal-banking-concept-pad-2026-09-11/` in the parent vault.
- Complete pad revision: production build and all 13 static pages pass. Checked the built preview at 1440, 1050, 768, 390 and 320px for image loading, overflow, notification removal and reduced motion. Desktop/mobile dialogs show the same render, fit horizontally, close with Escape and restore focus. Phone preservation and native Enter switching pass. Screenshots and report are in `Landing/concept-designs/personal-banking-pad-render-2026-09-11/` in the parent vault.
- Production build and static prerender verification passed for all 13 pages.
- Both directions checked at 1920, 1440, 1200, 1050, 900, 768, 390 and 320px: no horizontal overflow; text, features, CTA, switch and notification stay inside the viewport; the dashboard panel fits at each width.
- Checked mouse and Enter activation of the switch, one selected button, matching preview content, pointer response, dynamic reduced-motion preference, dialog open/close, Escape, focus restoration, scroll restoration and mobile dialog fit.
- No browser runtime errors. Existing `/favicon.ico` request returns 404.
- Repository-wide `tsc --noEmit` reports existing errors in archived `output/card-refinement/*.before.ts` files and `vite.config.ts` (`resolve.tsconfigPaths`); no errors reference this component.
- Current comparison screenshots and interaction report: `Landing/concept-designs/personal-banking-two-directions-2026-09-11/` in the parent UTEX Pay vault. Original implementation screenshots remain in `implemented-personal-banking-2026-09-11/`.
- Studio lighting revision checked at 1440, 1050, 768, 390 and 320px: generated background loads, panel stays within the viewport, no horizontal overflow or dashboard notification. Phone preservation, keyboard switching, pointer depth and reduced-motion reset passed. Updated section screenshots, interaction report and successful build log: `Landing/concept-designs/personal-banking-studio-lighting-2026-09-11/`.

Forge's documentation tool was unavailable during this session; implementation follows the existing component, route and story metadata conventions.
