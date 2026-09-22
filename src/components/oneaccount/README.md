# One account

The text section. Placed after the three tiles and before the globe on `/` (Sep 22, from the Sep 18 review's "more text, fewer visuals" ask). It says in words what the hero and tiles show: pillar 1 of `Landing/03-messaging-pillars` ("One platform, not a stack"), in the page-safe voice — no named competitors, no "worldwide" in the headline.

Layout: an editorial header (headline left with the last line in gold, two-paragraph lead right, baseline-aligned) over a four-row verb ledger — Bank, Spend, Send, Get paid — each with a mono index, a two-sentence description and a mono status. The first three read "Day one"; the fourth carries a small switch that flips on once the section enters view, for "add, don't switch". A mono strip closes it: One signup · One login · One ledger · Nothing to migrate.

No artwork on purpose. Shares the analytics and FAQ sections' 1400px container, 48 / 28 / 20px gutters, Plus Jakarta Sans headings, Manrope text, JetBrains Mono labels and the gold / text / muted trio. Rows collapse to index + verb + status, then text, on tablet, and to a single column on phones.

Entrance: header, then rows in turn, then the strip, driven by one IntersectionObserver class (`is-in`). Reduced motion shows everything at once.

Copy status: draft, not reviewed by Sandro. "30+ currencies" repeats the globe section's number and is pending the same confirmation.
