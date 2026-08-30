/**
 * Visitor consent for analytics tracking.
 *
 * Default is DENIED. Visitors located in a region that requires consent see a
 * banner and are only measured once they accept. Visitors elsewhere are
 * measured without a banner. Every function is SSR-safe and never throws.
 */

export type ConsentChoice = "granted" | "denied" | "unset";

const KEY = "cabslink_consent_v1";
export const CONSENT_EVENT = "cabslink:consent";

/** ISO 3166-1 alpha-2 codes where consent is required before analytics. */
const CONSENT_REGIONS = new Set([
  // UK + EEA
  "GB", "IE", "FR", "DE", "ES", "IT", "PT", "NL", "BE", "LU", "AT", "DK", "SE",
  "FI", "NO", "IS", "LI", "PL", "CZ", "SK", "SI", "HR", "HU", "RO", "BG", "GR",
  "CY", "MT", "EE", "LV", "LT",
  // Comparable consent regimes
  "CH", "BR",
]);

type Stored = { choice: "granted" | "denied"; ts: string };

/** The visitor's stored choice, or "unset" when they have not decided. */
export function readConsent(): ConsentChoice {
  if (typeof window === "undefined") return "unset";
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return "unset";
    const parsed = JSON.parse(raw) as Stored;
    return parsed.choice === "granted" || parsed.choice === "denied" ? parsed.choice : "unset";
  } catch {
    return "unset";
  }
}

/** Record a choice and notify listeners (analytics loader, banner). */
export function setConsent(choice: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Stored = { choice, ts: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Private mode: the choice simply won't persist across visits.
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
  } catch {
    /* ignore */
  }
}

/** Clear the choice so the banner is shown again. */
export function resetConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "unset" }));
  } catch {
    /* ignore */
  }
}

export function onConsentChange(cb: (choice: ConsentChoice) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(readConsent());
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

let regionPromise: Promise<boolean> | null = null;

/**
 * True when the visitor is in a region that requires consent.
 * Reads the country from Cloudflare's same-origin trace endpoint and fails
 * OPEN (requires consent) on any doubt: network error, non-OK response,
 * unknown country (XX) or Tor exit (T1).
 */
export function regionRequiresConsent(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (regionPromise) return regionPromise;
  regionPromise = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch("/cdn-cgi/trace", { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      if (!res.ok) return true;
      const text = await res.text();
      const loc = /(?:^|\n)loc=([A-Z0-9]{2})/.exec(text)?.[1];
      if (!loc || loc === "XX" || loc === "T1") return true;
      return CONSENT_REGIONS.has(loc);
    } catch {
      return true;
    }
  })();
  return regionPromise;
}

/**
 * Whether analytics may run right now.
 * - explicit choice always wins
 * - no choice yet: allowed only outside consent-required regions
 */
export async function analyticsAllowed(): Promise<boolean> {
  const choice = readConsent();
  if (choice === "granted") return true;
  if (choice === "denied") return false;
  return !(await regionRequiresConsent());
}
