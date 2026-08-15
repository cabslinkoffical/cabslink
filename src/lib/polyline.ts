/**
 * Google encoded-polyline decoder (algorithm format 1).
 * Pure + dependency-free so it can be unit tested and used in the browser.
 */
export type LatLngLiteral = { lat: number; lng: number };

export function decodePolyline(encoded: string): LatLngLiteral[] {
  if (!encoded) return [];
  const points: LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/** Internal unit for every geo rule is STATUTE MILES. */
export const MILES_TO_METRES = 1609.344;

export function milesToMetres(miles: number): number {
  return miles * MILES_TO_METRES;
}

export function milesToKm(miles: number): number {
  return Math.round(miles * 1.609344 * 100) / 100;
}
