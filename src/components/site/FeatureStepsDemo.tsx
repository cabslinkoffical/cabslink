import { FeatureSteps } from "@/components/ui/feature-section";
import routeImg from "@/assets/services/long-distance.jpg";
import vehicleImg from "@/assets/fleet/premium-mpv.jpg";
import airportAsset from "@/assets/services/airport.jpg.asset.json";

const features = [
  {
    step: "Step 1",
    title: "Choose your route",
    content:
      "Enter your pickup, drop-off and any stops. We’ll show fixed prices for every vehicle class instantly.",
    image: routeImg,
  },
  {
    step: "Step 2",
    title: "Pick a vehicle class",
    content:
      "From executive saloons to luxury MPVs and coaches — select the class that fits your party and luggage.",
    image: vehicleImg,
  },
  {
    step: "Step 3",
    title: "Add extras & pay",
    content:
      "Add meet & greet, child seats, stops or flight tracking. Review your booking and pay securely online.",
    image: airportAsset.url,
  },
];

export function FeatureStepsDemo() {
  return (
    <FeatureSteps
      features={features}
      title="Your Journey Starts Here"
      autoPlayInterval={4000}
      imageHeight="h-[500px]"
    />
  );
}
