# Second-section directions

Open `/section-options` after the approved photographic hero. The review bar switches between three live, responsive round-two directions without reloading the page:

1. **Convergence** — Payments and Banking are two dimensional wings physically joined by the UTEX account. This is the clearest new visual metaphor and the recommended direction for the next client review.
2. **Account OS** — a bright editorial scene built around one large operating surface. The visual demonstrates payments, balances, cards and transfers living in the same interface rather than explaining the relationship with a diagram.
3. **Card dock** — the card visibly enters the account while payment and transfer modules sit on either side. The card performs a job inside the system instead of floating as decoration.

The rejected circular Sculptural card, the earlier Living ledger and Follow the money components remain in the source as reference studies, but they are no longer shown in the round-two review tabs.

The production root route `/` now uses the approved `/hero-projection` hero and its current money-flow section. `/hero-projection` remains available as an unchanged comparison route.

All content is live HTML and CSS except the existing transparent `/utex-card.png` asset. Motion is decorative, pauses entirely under `prefers-reduced-motion`, and never carries essential meaning. The option switcher is horizontally scrollable on small screens with its browser scrollbar hidden.

## Verification

- `npm run build` passes and prerenders all 11 routes, including `/section-options`.
- Chrome review at 1440 × 900px, 722px and 390 × 844px shows no horizontal overflow in any option. Convergence and Card dock switch to vertical narratives at 760px to avoid compressing or cropping their dimensional compositions.
- Browser diagnostics report no console warnings or errors on `/section-options`.
- `npx tsc --noEmit` reports only the existing `vite.config.ts` `tsconfigPaths` type mismatch.
