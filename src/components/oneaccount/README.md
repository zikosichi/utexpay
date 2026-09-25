# One account

The text section. Placed after the three tiles and before the globe on `/` (Sep 22, from the Sep 18 review's "more text, fewer visuals" ask). It says in words what the hero and tiles show: pillar 1 of `Landing/03-messaging-pillars` ("One platform, not a stack"), in the page-safe voice — no named competitors, no "worldwide" in the headline.

Layout: an editorial header (headline left with the last line in gold, two-paragraph lead right, baseline-aligned) over a four-row verb ledger — Bank, Spend, Send, Get paid — each with a mono index, a two-sentence description and a mono status. The first three read "Day one"; the fourth carries a real switch (off by default; clicking it reads "Live" and lights the row gold), acting out "switch it on the day you're ready". In the studio-only accordion it stays a static "on" picture, since it sits inside the row button. Under the Get paid text, space is reserved for a payment feed (empty while off, so switching never shifts the page); switched on, a new payment chip (amount, method, "→ EUR account") drops in every 2.6s as a 3D stack: the newest in front, the previous two receding behind and below it over 1.2s with their content faded, so only their edges show; a fourth fades out. Fixed mono columns keep every chip the same width. On phones the method drops and "Payment received" shortens to "Received". A mono strip closes it: One signup · One login · One ledger · Nothing to migrate.

No artwork on purpose. Shares the analytics and FAQ sections' 1400px container, 48 / 28 / 20px gutters, Plus Jakarta Sans headings, Manrope text, JetBrains Mono labels and the gold / text / muted trio. Rows collapse to index + verb + status, then text, on tablet, and to a single column on phones.

Entrance: header, then rows in turn, then the strip, driven by one IntersectionObserver class (`is-in`). Reduced motion shows everything at once.

Copy status: draft, not reviewed by Sandro. "30+ currencies" repeats the globe section's number and is pending the same confirmation.
