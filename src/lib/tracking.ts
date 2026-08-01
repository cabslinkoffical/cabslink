/**
 * Phase G — conversion tracking.
 *
 * A single, dependency-free event layer. Events are pushed to
 * `window.dataLayer` (GTM-compatible) and forwarded to `gtag` when a tag is
 * present, so the site works identically with or without an analytics tag
 * installed. Every call is SSR-safe and never throws.
 */

export type ConversionEvent =
  | "quote_start"          // transfer quote submitted from a booking widget
  | "hourly_quote_start"   // hourly-hire quote submitted
  | "tours_interest"       // day-tours entry point clicked
  | "booking_step"         // progressed a step inside the booking flow
  | "booking_submitted"    // booking request sent to the server
  | "booking_confirmed"    // confirmation page viewed for a live booking
  | "quote_request"        // enquiry / quote-on-request form sent
  | "phone_click"
  | "whatsapp_click"
  | "cta_click";

type Payload = Record<string, string | number | boolean | undefined>;

type TrackingWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

/** Record a conversion event. No-op during SSR. */
export function track(event: ConversionEvent, payload: Payload = {}): void {
  if (typeof window === "undefined") return;
  const w = window as TrackingWindow;
  const data = { event, ...clean(payload) };
  try {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push(data);
    w.gtag?.("event", event, clean(payload));
  } catch {
    // Analytics must never break a booking.
  }
}

/** Convenience wrapper for link/button handlers. */
export function trackClick(event: ConversionEvent, payload: Payload = {}) {
  return () => track(event, payload);
}

function clean(payload: Payload): Payload {
  const out: Payload = {};
  for (const [k, v] of Object.entries(payload)) if (v !== undefined) out[k] = v;
  return out;
}
