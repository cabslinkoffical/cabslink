import serviceAirport360 from "@/assets/home/services/airport-360.webp";
import serviceAirport700 from "@/assets/home/services/airport-700.webp";
import serviceCruise360 from "@/assets/home/services/cruise-360.webp";
import serviceCruise700 from "@/assets/home/services/cruise-700.webp";
import serviceStation360 from "@/assets/home/services/station-360.webp";
import serviceStation700 from "@/assets/home/services/station-700.webp";
import serviceCorporate360 from "@/assets/home/services/corporate-360.webp";
import serviceCorporate700 from "@/assets/home/services/corporate-700.webp";
import serviceGroup360 from "@/assets/home/services/group-360.webp";
import serviceGroup700 from "@/assets/home/services/group-700.webp";
import serviceTours360 from "@/assets/home/services/tours-360.webp";
import serviceTours700 from "@/assets/home/services/tours-700.webp";

import fleetSaloon260 from "@/assets/home/fleet/saloon-260.webp";
import fleetSaloon520 from "@/assets/home/fleet/saloon-520.webp";
import fleetExecutiveSaloon260 from "@/assets/home/fleet/executive-saloon-260.webp";
import fleetExecutiveSaloon520 from "@/assets/home/fleet/executive-saloon-520.webp";
import fleetLuxurySaloon260 from "@/assets/home/fleet/luxury-saloon-260.webp";
import fleetLuxurySaloon520 from "@/assets/home/fleet/luxury-saloon-520.webp";
import fleetEstateCar260 from "@/assets/home/fleet/estate-car-260.webp";
import fleetEstateCar520 from "@/assets/home/fleet/estate-car-520.webp";
import fleetStandardMpv260 from "@/assets/home/fleet/standard-mpv-260.webp";
import fleetStandardMpv520 from "@/assets/home/fleet/standard-mpv-520.webp";
import fleetSevenSeaterMpv260 from "@/assets/home/fleet/seven-seater-mpv-260.webp";
import fleetSevenSeaterMpv520 from "@/assets/home/fleet/seven-seater-mpv-520.webp";
import fleetPremiumMpv260 from "@/assets/home/fleet/premium-mpv-260.webp";
import fleetPremiumMpv520 from "@/assets/home/fleet/premium-mpv-520.webp";
import fleetEightSeaterVan260 from "@/assets/home/fleet/eight-seater-van-260.webp";
import fleetEightSeaterVan520 from "@/assets/home/fleet/eight-seater-van-520.webp";
import fleetExecutiveMinibus260 from "@/assets/home/fleet/executive-minibus-260.webp";
import fleetExecutiveMinibus520 from "@/assets/home/fleet/executive-minibus-520.webp";
import fleetWheelchair260 from "@/assets/home/fleet/wheelchair-accessible-vehicle-260.webp";
import fleetWheelchair520 from "@/assets/home/fleet/wheelchair-accessible-vehicle-520.webp";
import fleetElectricSaloon260 from "@/assets/home/fleet/electric-saloon-260.webp";
import fleetElectricSaloon520 from "@/assets/home/fleet/electric-saloon-520.webp";
import fleetElectricMpv260 from "@/assets/home/fleet/electric-mpv-260.webp";
import fleetElectricMpv520 from "@/assets/home/fleet/electric-mpv-520.webp";

export type ResponsiveImage = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
};

const responsive = (small: string, large: string, width: number, height: number): ResponsiveImage => ({
  src: large,
  srcSet: `${small} 360w, ${large} 700w`,
  width,
  height,
});

export const HOME_SERVICE_IMAGES = {
  airport: responsive(serviceAirport360, serviceAirport700, 700, 467),
  cruise: responsive(serviceCruise360, serviceCruise700, 700, 466),
  station: responsive(serviceStation360, serviceStation700, 700, 467),
  corporate: responsive(serviceCorporate360, serviceCorporate700, 700, 467),
  group: responsive(serviceGroup360, serviceGroup700, 700, 466),
  tours: responsive(serviceTours360, serviceTours700, 700, 467),
} as const;

const fleet = (small: string, large: string): ResponsiveImage => ({
  src: large,
  srcSet: `${small} 260w, ${large} 520w`,
  width: 520,
  height: 312,
});

export const HOME_FLEET_IMAGES: Record<string, ResponsiveImage> = {
  saloon: fleet(fleetSaloon260, fleetSaloon520),
  "executive-saloon": fleet(fleetExecutiveSaloon260, fleetExecutiveSaloon520),
  "luxury-chauffeur-saloon": fleet(fleetLuxurySaloon260, fleetLuxurySaloon520),
  "estate-car": fleet(fleetEstateCar260, fleetEstateCar520),
  "standard-mpv": fleet(fleetStandardMpv260, fleetStandardMpv520),
  "seven-seater-mpv": fleet(fleetSevenSeaterMpv260, fleetSevenSeaterMpv520),
  "premium-mpv": fleet(fleetPremiumMpv260, fleetPremiumMpv520),
  "eight-seater-van": fleet(fleetEightSeaterVan260, fleetEightSeaterVan520),
  "executive-minibus": fleet(fleetExecutiveMinibus260, fleetExecutiveMinibus520),
  "wheelchair-accessible": fleet(fleetWheelchair260, fleetWheelchair520),
  "electric-saloon": fleet(fleetElectricSaloon260, fleetElectricSaloon520),
  "electric-mpv": fleet(fleetElectricMpv260, fleetElectricMpv520),
};
