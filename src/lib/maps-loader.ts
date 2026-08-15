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
  }
}

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
