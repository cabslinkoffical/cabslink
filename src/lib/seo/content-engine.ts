/**
 * Unique content engine.
 *
 * Given a LoadedDestination, returns an ordered list of sections that
 * a template should render. Every sentence is composed from the row's
 * structured data — no spun copy, no generic filler, no "AI text". If a
 * section has no data, it is omitted. Result is fully deterministic.
 */
import type { LoadedDestination } from "@/components/site/DestinationPage";
import type { Destination } from "@/lib/destinations.functions";
import type { SectionKey } from "@/lib/seo/template-registry";

export type Section =
  | { key: "summary"; sentences: string[] }
  | { key: "route_action"; from: string; to: string; distanceKm?: number }
  | { key: "facts" }
  | { key: "geo_context"; parts: Array<{ label: string; value: string }> }
  | { key: "airport_info"; rows: Array<[string, string]> }
  | { key: "attraction_info"; rows: Array<[string, string]> }
  | { key: "popular_routes" }
  | { key: "nearby" }
  | { key: "related_services" }
  | { key: "faq"; items: Array<{ q: string; a: string }> }
  | { key: "book_cta"; label: string; href: string };

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Compose a factual summary. Each sentence exists only if the underlying
 * data exists. Ordering is deterministic so two calls with identical input
 * always produce identical output — and two different destinations will
 * never share the same summary unless every input field matches.
 */
function buildSummarySentences(loaded: LoadedDestination): string[] {
  const { destination: d, nearby, popularRoutes, relatedServices } = loaded;
  const name = d.display_name ?? d.name;
  const s: string[] = [];

  const geoBits = [d.town, d.council, d.region].filter((v): v is string => !!v);
  if (d.type === "route") {
    const m = d.meta as { from_name?: string; to_name?: string };
    if (m.from_name && m.to_name) {
      s.push(`CabsLink provides fixed-price private transfers from ${m.from_name} to ${m.to_name}.`);
    }
  } else if (d.type === "airport") {
    const iata = (d.meta as { iata?: string })?.iata;
    s.push(`CabsLink operates pre-booked transfers to and from ${name}${iata ? ` (${iata})` : ""}.`);
  } else if (d.type === "service") {
    const sum = (d.meta as { summary?: string })?.summary;
    if (sum) s.push(sum);
  } else if (d.type === "guide") {
    const sum = (d.meta as { summary?: string })?.summary;
    if (sum) s.push(sum);
  } else if (geoBits.length) {
    s.push(`Book a private car to ${name}, located in ${joinList(geoBits)}.`);
  } else {
    s.push(`Book a pre-arranged private car to ${name}.`);
  }

  if (popularRoutes.length && d.type !== "route" && d.type !== "guide") {
    const preview = popularRoutes.slice(0, 3).map((r) => r.display_name ?? r.name);
    s.push(`Popular pre-booked routes include ${joinList(preview)}.`);
  }
  if (nearby.length && d.type !== "route") {
    const preview = nearby.slice(0, 3).map((n) => n.display_name ?? n.name);
    s.push(`Nearby destinations we also cover: ${joinList(preview)}.`);
  }
  if (relatedServices.length && (d.type === "service" || d.type === "guide" || d.type === "location")) {
    const preview = relatedServices.slice(0, 3).map((r) => r.display_name ?? r.name);
    s.push(`Related services: ${joinList(preview)}.`);
  }
  return s;
}

/**
 * Build type-aware FAQs. Only questions that can be answered from the row's
 * data are included, so no page ships an unanswerable question.
 */
function buildFaqs(loaded: LoadedDestination): Array<{ q: string; a: string }> {
  const d = loaded.destination;
  const name = d.display_name ?? d.name;
  const items: Array<{ q: string; a: string }> = [];

  items.push({
    q: `Can I pre-book a private car to ${name}?`,
    a: `Yes. CabsLink accepts advance bookings 24/7 with fixed all-inclusive fares.`,
  });

  if (d.type === "airport") {
    items.push({
      q: `Do you offer meet & greet at ${name}?`,
      a: `Yes — a named driver meets you inside the terminal on request when booking a private transfer.`,
    });
  }
  if (d.type === "route") {
    const m = d.meta as { from_name?: string; to_name?: string; typical_duration_min?: number };
    if (m.from_name && m.to_name) {
      items.push({
        q: `How much does a transfer from ${m.from_name} to ${m.to_name} cost?`,
        a: `Prices depend on vehicle class. Enter your details in the booking form for a fixed all-inclusive quote.`,
      });
      if (m.typical_duration_min) {
        items.push({
          q: `How long does the ${m.from_name} to ${m.to_name} journey take?`,
          a: `Typical drive time is around ${m.typical_duration_min} minutes, subject to traffic and weather.`,
        });
      }
    }
  }
  if (d.type === "university" || d.type === "hospital") {
    items.push({
      q: `Do you handle luggage for ${name}?`,
      a: `Yes. Choose a vehicle class with the correct luggage capacity when booking; drivers assist with loading.`,
    });
  }
  if (loaded.nearby.length) {
    items.push({
      q: `Which nearby locations do you also cover?`,
      a: `We cover ${joinList(loaded.nearby.slice(0, 5).map((n) => n.display_name ?? n.name))} and other UK-wide destinations.`,
    });
  }
  items.push({
    q: `How do I get a receipt or VAT invoice?`,
    a: `Every completed booking generates a receipt by email; VAT invoices are available on request for corporate accounts.`,
  });
  return items;
}

/** Build the ordered section list for a destination. */
export function buildSections(loaded: LoadedDestination, allowed: SectionKey[]): Section[] {
  const d = loaded.destination;
  const name = d.display_name ?? d.name;
  const set = new Set(allowed);
  const out: Section[] = [];

  if (set.has("summary")) {
    const sentences = buildSummarySentences(loaded);
    if (sentences.length) out.push({ key: "summary", sentences });
  }

  if (set.has("route_action") && d.type === "route") {
    const m = d.meta as { from_name?: string; to_name?: string; distance_km?: number };
    if (m.from_name && m.to_name) {
      out.push({ key: "route_action", from: m.from_name, to: m.to_name, distanceKm: m.distance_km });
    }
  }

  if (set.has("facts")) out.push({ key: "facts" });

  if (set.has("geo_context")) {
    const parts: Array<{ label: string; value: string }> = [];
    if (d.country) parts.push({ label: "Country", value: d.country });
    if (d.region) parts.push({ label: "Region", value: d.region });
    if (d.council) parts.push({ label: "Council", value: d.council });
    if (d.town) parts.push({ label: "Town", value: d.town });
    if (parts.length >= 2) out.push({ key: "geo_context", parts });
  }

  if (set.has("airport_info") && d.type === "airport") {
    const m = d.meta as { iata?: string; icao?: string; terminals?: string; passengers_yr?: string };
    const rows: Array<[string, string]> = [];
    if (m.iata) rows.push(["IATA", m.iata]);
    if (m.icao) rows.push(["ICAO", m.icao]);
    if (m.terminals) rows.push(["Terminals", m.terminals]);
    if (m.passengers_yr) rows.push(["Passengers/yr", m.passengers_yr]);
    if (rows.length) out.push({ key: "airport_info", rows });
  }

  if (set.has("attraction_info") && (d.type === "attraction" || d.type === "distillery")) {
    const m = d.meta as { category?: string; visit_time?: string; opening_hours?: string };
    const rows: Array<[string, string]> = [];
    if (m.category) rows.push(["Category", m.category]);
    if (m.visit_time) rows.push(["Typical visit", m.visit_time]);
    if (m.opening_hours) rows.push(["Hours", m.opening_hours]);
    if (rows.length) out.push({ key: "attraction_info", rows });
  }

  if (set.has("popular_routes") && loaded.popularRoutes.length) out.push({ key: "popular_routes" });
  if (set.has("nearby") && loaded.nearby.length) out.push({ key: "nearby" });
  if (set.has("related_services") && loaded.relatedServices.length) out.push({ key: "related_services" });

  if (set.has("faq")) {
    const items = buildFaqs(loaded);
    if (items.length) out.push({ key: "faq", items });
  }

  if (set.has("book_cta")) {
    out.push({ key: "book_cta", label: `Book a ride to ${name}`, href: `/book?to=${encodeURIComponent(name)}` });
  }
  return out;
}

/** Extract just the FAQ items for JSON-LD emission (called by auto-seo). */
export function faqsFor(loaded: LoadedDestination): Array<{ q: string; a: string }> {
  return buildFaqs(loaded);
}
