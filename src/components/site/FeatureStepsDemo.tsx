import { FeatureSteps } from "@/components/ui/feature-section";

const features = [
  {
    step: "Step 1",
    title: "Choose your route",
    content:
      "Enter your pickup, drop-off and any stops. We’ll show fixed prices for every vehicle class instantly.",
    image:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop",
  },
  {
    step: "Step 2",
    title: "Pick a vehicle class",
    content:
      "From executive saloons to luxury MPVs and coaches — select the class that fits your party and luggage.",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2070&auto=format&fit=crop",
  },
  {
    step: "Step 3",
    title: "Add extras & pay",
    content:
      "Add meet & greet, child seats, stops or flight tracking. Review your booking and pay securely online.",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=2070&auto=format&fit=crop",
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
