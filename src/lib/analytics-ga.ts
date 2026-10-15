/**
 * Google Analytics 4 (gtag.js) loader.
 *
 * Consent-first: Consent Mode defaults are set to DENIED before the tag loads,
 * and the tag itself is only injected once `analyticsAllowed()` resolves true
 * (explicit acceptance, or a visitor outside a consent-required region).
 * Admin and auth paths are never measured. All calls are SSR-safe.
 */
import { analyticsAllowed, onConsentChange, readConsent } from "./consent";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __gaLoaded?: boolean;
  __gaConsentBound?: boolean;
};

export const GA_MEASUREMENT_ID: string | undefined =
  (import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as string | undefined) || undefined;

function w(): GtagWindow | null {
  return typeof window === "undefined" ? null : (window as GtagWindow);
}

function ensureGtag(win: GtagWindow) {
  win.dataLayer = win.dataLayer ?? [];
  if (!win.gtag) {
    win.gtag = function gtag(...args: unknown[]) {
      win.dataLayer!.push(args);
    };
  }
  return win.gtag!;
}

/** Excluded from measurement: staff console, auth, API. */
export function isMeasurablePath(path: string): boolean {
  return !(
    path.startsWith("/cabs-booking-pannel") ||
    path.startsWith("/auth") ||
    path.startsWith("/api/")
  );
}

function loadTag(win: GtagWindow, id: string, path: string) {
  if (win.__gaLoaded) return;
  win.__gaLoaded = true;
  const gtag = ensureGtag(win);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  gtag("js", new Date());
  // SPA: we send page_view ourselves on every route change, including the first.
  gtag("config", id, { send_page_view: false, anonymize_ip: true });
  gtag("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
}

/**
 * Initialise analytics for the current path. Safe to call on every route
 * change — the tag is injected at most once.
 */
export function initAnalytics(path: string): void {
  const win = w();
  if (!win || !GA_MEASUREMENT_ID || !isMeasurablePath(path)) return;

  const gtag = ensureGtag(win);
  // Consent Mode defaults: denied until we know otherwise.
  if (!win.__gaConsentBound) {
    win.__gaConsentBound = true;
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 2000,
    });
    onConsentChange((choice) => {
      if (choice === "granted") {
        gtag("consent", "update", { analytics_storage: "granted" });
        loadTag(win, GA_MEASUREMENT_ID!, window.location.pathname);
      }
    });
  }

  void analyticsAllowed().then((allowed) => {
    if (!allowed) return;
    // Outside consent regions there is no banner, so grant storage directly.
    if (readConsent() !== "denied") gtag("consent", "update", { analytics_storage: "granted" });
    loadTag(win, GA_MEASUREMENT_ID!, path);
  });
}

/** Send a page view for a client-side route change. */
export function trackPageView(path: string): void {
  const win = w();
  if (!win || !GA_MEASUREMENT_ID || !win.__gaLoaded || !isMeasurablePath(path)) return;
  win.gtag?.("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export type GaEventParams = Record<string, string | number | boolean | undefined>;

/** Keys that could carry personal data — never forwarded to GA. */
const PII_KEYS = /^(name|first_name|last_name|customer_name|email|customer_email|phone|customer_phone|tel|address|pickup_address|dropoff_address|notes|flight|flight_number)$/i;

/**
 * Send a GA4 event. Only sends once the consent-gated tag has loaded, on a
 * measurable path, and strips any personal-data keys. Never throws.
 */
export function trackEvent(name: string, params: GaEventParams = {}): void {
  const win = w();
  if (!win || !GA_MEASUREMENT_ID || !win.__gaLoaded || !win.gtag) return;
  if (!isMeasurablePath(window.location.pathname)) return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || PII_KEYS.test(k)) continue;
    clean[k] = v;
  }
  try {
    win.gtag("event", name, clean);
  } catch {
    /* analytics must never break the site */
  }
}

/** Where a contact link sits on the page, for click_* events. */
function linkLocation(el: Element): string {
  const tagged = el.closest("[data-analytics-location]")?.getAttribute("data-analytics-location");
  if (tagged) return tagged;
  if (el.closest("header")) return "header";
  if (el.closest("footer")) return "footer";
  return `page:${window.location.pathname}`;
}

/** One delegated listener for every tel:, mailto: and WhatsApp link. */
export function installContactClickTracking(): () => void {
  const win = w();
  if (!win) return () => {};
  const handler = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    const location = linkLocation(a);
    if (/^tel:/i.test(href)) trackEvent("click_phone", { location });
    else if (/^mailto:/i.test(href)) trackEvent("click_email", { location });
    else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//i.test(href)) trackEvent("click_whatsapp", { location });
  };
  document.addEventListener("click", handler, true);
  return () => document.removeEventListener("click", handler, true);
}

const CHECKOUT_CTX_KEY = "cabslink_ga_checkout";

/** Remember non-personal checkout context so the confirmation page can report it. */
export function rememberCheckout(ctx: { service_type: string; vehicle_class?: string }): void {
  try { window.sessionStorage.setItem(CHECKOUT_CTX_KEY, JSON.stringify(ctx)); } catch { /* ignore */ }
}

export function readCheckout(): { service_type?: string; vehicle_class?: string } {
  try { return JSON.parse(window.sessionStorage.getItem(CHECKOUT_CTX_KEY) ?? "{}") ?? {}; } catch { return {}; }
}

/**
 * Fire `purchase` at most once per booking reference, surviving refreshes.
 * Returns true when it was sent now. If the tag is not loaded yet nothing is
 * recorded, so a later visit can still report it.
 */
export function trackPurchaseOnce(ref: string, params: GaEventParams): boolean {
  const win = w();
  if (!win || !win.__gaLoaded) return false;
  const key = `cabslink_ga_purchase_${ref}`;
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, "1");
  } catch { /* storage blocked: still send once for this page */ }
  trackEvent("purchase", { transaction_id: ref, currency: "GBP", ...params });
  return true;
}
