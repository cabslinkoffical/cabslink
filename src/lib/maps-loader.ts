/**
 * Single, shared Maps JavaScript API loader.
 *
 * One script tag per document, one promise shared by every consumer, so the
 * admin panel never ends up with duplicate map implementations or duplicate
 * script loads. Uses `loading=async` + a global callback (required: with
 * `loading=async`, `google.maps.Map` is NOT ready at script onload).
 *
 * Browser key: VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY — referrer
 * restricted, safe to embed. Server-side APIs (Routes, Places details) go
 * through the connector gateway instead; never use the browser key for those.
 */

declare global {
  interface Window {
    google?: any;
    __cabslinkMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

/**
 * Google rejects the key for the current page (referrer restriction, key
 * disabled, billing off). Google paints its own grey "Something went wrong"
 * panel over the map, so consumers subscribe here to show a useful message.
 */
let authFailed = false;
const authListeners = new Set<() => void>();

export function mapsAuthFailed() {
  return authFailed;
}

export function onMapsAuthFailure(cb: () => void): () => void {
  authListeners.add(cb);
  if (authFailed) cb();
  return () => authListeners.delete(cb);
}

export const MAPS_AUTH_HELP =
  "Google rejected the Maps browser key for this address. In Google Cloud Console → Credentials, add these HTTP referrers to the key: https://*.lovable.app/*, https://*.lovableproject.com/*, https://cabslink.com/*, https://www.cabslink.com/* — and make sure Maps JavaScript API is enabled with billing active.";


let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps can only load in the browser"));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  if (!key) return Promise.reject(new Error("Google Maps browser key is not configured."));
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;

  loadPromise = new Promise<void>((resolve, reject) => {
    window.__cabslinkMapsReady = () => resolve();
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      callback: "__cabslinkMapsReady",
      libraries: "geometry",
      language: "en-GB",
      region: "GB",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Google Maps failed to load. Check the browser key's allowed referrers."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
