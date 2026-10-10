/**
 * Leaf-level search metadata overrides for individual blog articles.
 * The on-page H1 and the stored article title are never touched — these
 * values only replace the <title> tag and meta description for slugs whose
 * stored metadata is too long for search results.
 */
export const BLOG_SEO_OVERRIDES: Record<string, { title: string; description: string }> = {
  "loch-ness-day-trip-from-edinburgh": {
    title: "Loch Ness Day Trip from Edinburgh | Cabslink",
    description:
      "Plan a Loch Ness day trip from Edinburgh with a private driver. See what the journey involves, where tours stop along the way, and how to book your day out.",
  },
  "edinburgh-airport-transfer-guide-tram-bus-taxi-or-private-hire-2026": {
    title: "Edinburgh Airport Transfers: Tram, Bus, Taxi or Car",
    description:
      "Compare Edinburgh Airport transfer options: tram, bus, taxi and private hire. See travel times, what each option costs, and which suits your journey best.",
  },
};
