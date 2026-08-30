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
