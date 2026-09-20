# Trust + FAQ

Combines the approved bronze doorway cover with [Paper direction C — Answers build trust](https://app.paper.design/file/01M0WEVJEX8YP46VRJ3VW3Z330/1-0/503-0). The combined reference and source artwork are in `Landing/concept-designs/trust-faq-cover-explorations-2026-09-18/` in the parent workspace.

The cover uses a decorative, text-free image with live HTML copy. Three lazy-loaded WebP sizes (960, 1600, 2126px) keep the artwork between 16–74 KB. On mobile, the doorway sits below the headline within the same cover; on desktop, it sits beside the copy. No animation or canvas is needed for the artwork.

Placed immediately after `MoneyInsightSection` on `/` and `/version-5`. Uses the shared landing heading styles (Plus Jakarta Sans), Manrope body, JetBrains Mono labels, the analytics section’s content width and responsive gutters, and the existing warm dark palette.

The right-edge numbered switch follows the banking section's version controls. **01 Cover** retains the wide doorway cover and settings panel. **02 Side by side** implements the second “One home” drawing: heading and bronze doorway sculpture on the left, one continuous FAQ accordion on the right, stacked on tablet/mobile. It has no outbound links and preserves the expanded answer when switching layouts. The left column is wider, with enlarged artwork. Both versions show six core questions in one list without category tabs. Direct previews: `/?faq=cover#questions` and `/?faq=split#questions` (also supported on `/version-5`). Switching updates the URL so reloading retains the version.

Version 02's decorative artwork uses 640px and 1200px WebP assets under `public/trustfaq/one-home-*.webp`. Its source and built-in imagegen prompt are `09-one-home-artwork.png` and `09-one-home-prompt.md` alongside the concept references.

One keyboard-accessible accordion with six questions and one expanded answer at a time. Version 01 retains the illustrative security panel, which follows the questions on mobile. All answers are included in the server-rendered HTML. Answer height, question typography, answer opacity/position and the plus/minus icon transition together over 420ms in both versions. CSS grid interpolates the intrinsic answer height, including its bottom spacing, without fixed-height limits; rapid toggles reverse smoothly. Collapsed regions are inert and aria-hidden immediately, then visually hidden after the transition. Reduced-motion preferences disable all transitions.

The cover and illustrative panel share the existing Figma-derived tile stroke: a 30% white-to-grey linear gradient, masked to a 1px border. The round-two cover alternatives and their prompts are saved alongside the original concept artwork; the approved doorway remains the live cover.

## Copy status

This is a design implementation, not approved launch copy. Security controls are illustrative and based on project designs; confirm availability and behaviour before publication. The Paper review notes flag regulatory wording, eligibility, required documents, settlement schedules, pricing and limits as pending UTEX confirmation. Answers refer visitors to the team for those specifics and make no licence, safeguarding, insurance or timing guarantees. The FAQ and its cover contain no outbound links.
