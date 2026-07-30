// Fleet class hero images. Keys must match vehicle_classes.slug.
import economySaloon from "./economy-saloon.png";
import standardSaloon from "./standard-saloon.png";
import executiveSaloon from "./executive-saloon.png";
import luxuryChauffeurSaloon from "./luxury-chauffeur-saloon.png";
import estateCar from "./estate-car.png";
import standardMpv from "./standard-mpv.png";
import sevenSeaterMpv from "./seven-seater-mpv.png";
import premiumMpv from "./premium-mpv.png";
import eightSeaterVan from "./eight-seater-van.png";
import executiveMinibus from "./executive-minibus.png";
import coach from "./coach.png";
import wheelchairAccessible from "./wheelchair-accessible.png";
import electricSaloon from "./electric-saloon.png";
import electricMpv from "./electric-mpv.png";

export const FLEET_IMAGES: Record<string, string> = {
  "economy-saloon": economySaloon,
  "standard-saloon": standardSaloon,
  "executive-saloon": executiveSaloon,
  "luxury-chauffeur-saloon": luxuryChauffeurSaloon,
  "estate-car": estateCar,
  "standard-mpv": standardMpv,
  "seven-seater-mpv": sevenSeaterMpv,
  "premium-mpv": premiumMpv,
  "eight-seater-van": eightSeaterVan,
  "executive-minibus": executiveMinibus,
  "coach": coach,
  "wheelchair-accessible": wheelchairAccessible,
  "electric-saloon": electricSaloon,
  "electric-mpv": electricMpv,
};

export function fleetImageFor(slug: string, fallback?: string | null): string | undefined {
  // Curated class artwork always wins so the fleet looks consistent site-wide.
  // Uploaded/legacy vehicle photos are only used for classes we have no artwork for.
  const custom = fallback?.trim();
  return FLEET_IMAGES[slug] || custom || undefined;
}
