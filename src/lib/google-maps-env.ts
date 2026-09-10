/**
 * Returns the active Google Maps server API key.
 *
 * Workspace connections after the managed Lovable key may expose the key as
 * GOOGLE_MAPS_API_KEY_1 while the original managed key used GOOGLE_MAPS_API_KEY.
 * We prefer the currently-linked custom key and fall back to the legacy name so
 * old code keeps working if only the managed connection is present.
 */
export function getGoogleMapsApiKey(): string {
  const key =
    (typeof process !== "undefined" && process.env?.["GOOGLE_MAPS_API_KEY_1"]) ||
    (typeof process !== "undefined" && process.env?.["GOOGLE_MAPS_API_KEY"]);
  if (!key) {
    throw new Error("Google Maps API key is not configured. Connect Google Maps Platform in project settings.");
  }
  return key;
}
