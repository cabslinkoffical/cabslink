/**
 * Shared helpers for the one local-page pattern (routes, airports, stations,
 * towns, areas, service+location pages). Keeps the hero booking form identical
 * everywhere while the prefilled fields and imagery change per page.
 */
import airportImg from "@/assets/home/services/airport-700.webp";
import stationImg from "@/assets/home/services/station-700.webp";
import toursImg from "@/assets/home/services/tours-700.webp";
import cruiseImg from "@/assets/home/services/cruise-700.webp";
import corporateImg from "@/assets/home/services/corporate-700.webp";
import groupImg from "@/assets/home/services/group-700.webp";
import hospitalImg from "@/assets/services/hospital.jpg";
import universityImg from "@/assets/services/university.jpg";
import executiveImg from "@/assets/fleet/executive-saloon.jpg";

export type LocalPrefill = { pickup?: string; dropoff?: string };

/** Page coordinates keep the location map available even if address lookup fails. */
export function localMapMode(
  pickupPlaceId: string | undefined,
  dropoffPlaceId: string | undefined,
  focus: { lat: number; lng: number } | null,
): "route" | "location" | null {
  if (pickupPlaceId && dropoffPlaceId && pickupPlaceId !== dropoffPlaceId) return "route";
  if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) return "location";
  return null;
}

/**
 * Destination pages carry one known point — the place the page is about.
 * Transport hubs (airports, stations) are filled as the PICKUP: the visitor
 * is most often landing/arriving and needs collecting there. Every other
 * destination (town, city, distillery, attraction, cruise port, hospital,
 * university, hotel...) is filled as the DROP-OFF: the visitor travels to it.
 * The other field is left for the customer to complete.
 */
const PICKUP_TYPES = new Set(["airport", "station"]);

export function destinationPrefill(
  type: string | null | undefined,
  name: string,
): LocalPrefill {
  return PICKUP_TYPES.has(type ?? "") ? { pickup: name } : { dropoff: name };
}

/** Journey (route) pages know both ends, so both fields are filled. */
export function journeyPrefill(from: string, to: string): LocalPrefill {
  return { pickup: from, dropoff: to };
}

/** Service + location pages run "from" the location, so it is the pickup. */
export function serviceLocationPrefill(locationName: string): LocalPrefill {
  return { pickup: locationName };
}

/** Area/location directory pages are about travelling to the area. */
export function areaPrefill(locationName: string): LocalPrefill {
  return { dropoff: locationName };
}

/**
 * Default hero image per destination type, used only when the page has no
 * image of its own, so every local page carries a relevant picture and no
 * page looks odd next to the others.
 */
export function defaultLocalImage(type: string | null | undefined): string {
  switch (type) {
    case "airport":
      return airportImg;
    case "station":
      return stationImg;
    case "attraction":
    case "distillery":
      return toursImg;
    case "cruise-port":
      return cruiseImg;
    case "corporate":
      return corporateImg;
    case "hospital":
      return hospitalImg;
    case "university":
      return universityImg;
    case "hotel":
    case "town":
    case "city":
      return groupImg;
    default:
      return executiveImg;
  }
}

/** Default hero image per service, keyed by the service's canonical URL. */
export function serviceLocalImage(serviceUrl: string | null | undefined): string {
  const url = serviceUrl ?? "";
  if (url.includes("airport")) return airportImg;
  if (url.includes("station")) return stationImg;
  if (url.includes("corporate")) return corporateImg;
  if (url.includes("tour")) return toursImg;
  if (url.includes("cruise")) return cruiseImg;
  if (url.includes("group")) return groupImg;
  return executiveImg;
}
