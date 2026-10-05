/**
 * Serialises structured data for a <script type="application/ld+json"> tag.
 * Escaping "<" stops any value containing "</script>" from closing the tag.
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
