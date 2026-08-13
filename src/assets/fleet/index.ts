// Fleet class hero images. Keys must match vehicle_classes.slug.
import economySaloon from "./economy-saloon.jpg";
import standardSaloon from "./standard-saloon.jpg";
import executiveSaloon from "./executive-saloon.jpg";
import luxuryChauffeurSaloon from "./luxury-chauffeur-saloon.jpg";
import estateCar from "./estate-car.jpg";
import standardMpv from "./standard-mpv.jpg";
import sevenSeaterMpv from "./seven-seater-mpv.jpg";
import premiumMpv from "./premium-mpv.jpg";
import eightSeaterVan from "./eight-seater-van.jpg";
import executiveMinibus from "./executive-minibus.jpg";
import coach from "./coach.jpg";
import wheelchairAccessible from "./wheelchair-accessible.jpg";
import electricSaloon from "./electric-saloon.jpg";
import electricMpv from "./electric-mpv.jpg";

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
  // Admin-managed image always wins so what you set in admin is what the site shows.
  // Curated local artwork is only the fallback when a class has no uploaded image.
  const custom = fallback?.trim();
  return custom || FLEET_IMAGES[slug] || undefined;
}
