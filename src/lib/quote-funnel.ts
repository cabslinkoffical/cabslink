export type FunnelEvent = { created_at: string; name: string; session_id: string | null };
const STARTS = new Set(["quote_start", "hourly_quote_start", "tours_interest"]);
/** Consent-bearing sessions only; not vehicle-price calculations or all bookings. */
export function measuredQuoteFunnel(starts: FunnelEvent[], outcomes: FunnelEvent[]) {
  const sessions = new Map<string, FunnelEvent>();
  for (const event of starts) {
    if (!event.session_id || !STARTS.has(event.name)) continue;
    const previous = sessions.get(event.session_id);
    if (!previous || event.created_at < previous.created_at) sessions.set(event.session_id, event);
  }
  const submitted = new Set(outcomes.filter(e => e.name === "booking_submitted" && e.session_id).map(e => e.session_id));
  const quotes = Array.from(sessions.values());
  const converted = quotes.filter(e => submitted.has(e.session_id)).length;
  return { quotes, conversion: quotes.length ? converted / quotes.length * 100 : null };
}