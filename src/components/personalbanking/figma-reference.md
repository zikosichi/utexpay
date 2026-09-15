# Dashboard reference and assets

Source: [UTEX personal banking dashboard, node 4793:10738](https://www.figma.com/design/HCaWhMISKtMkyK6o9Euw5d/UTEX?node-id=4793-10738).

Read through Figma `get_design_context` and `get_screenshot` on 11 September 2026. The user requested a new landing illustration based on this dashboard, with compact proportions and depth rather than obvious phone hardware. This is a condensed marketing composition, not a full application screen implementation.

Preserved from the reference: dark bronze/charcoal surfaces, gold borders, currency balances, quick-action glyphs, card styling, chart proportions and recent transactions. Total balance uses the reference's explicit all-account total (€28,142.55) and is shared with the hero. Action-needed notices are omitted from this promotional composition.

Exact downloaded Figma assets in `public/personalbanking/dashboard/`:

| Local file | Figma context asset |
| --- | --- |
| `send.svg` | `imgIcon24ArrowUp` |
| `request.svg` | `imgIcon24ArrowDown` |
| `deposit.svg` | `imgIcon24Plus` |
| `eye.svg` | `imgIcon16Eye` |
| `chip.svg` | `imgFrame43` |
| `mastercard.png` | `imgImage135` |
| `acme.png` | `imgImage136` |
| `spotify.png` | `imgImage139` |
| `currency-eur.png` | `imgImage143` |
| `currency-usd.png` | `imgImage141` |
| `currency-gbp.png` | `imgImage144` |

All files retain their downloaded bytes. Currency artwork is blurred within the coin treatment, following the Figma design. The UTEX Pay wordmark reuses the existing `/brand/utex-pay-white.svg` asset. The geometric chart is rendered in CSS from the reference bar proportions.
