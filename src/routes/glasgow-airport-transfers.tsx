import { createFileRoute } from "@tanstack/react-router";
import { landingHead } from "@/components/site/LandingPage.head";
import { LandingPageView, landingToursQuery } from "@/components/site/LandingPage";

export const Route = createFileRoute("/glasgow-airport-transfers")({
  head: () => landingHead("/glasgow-airport-transfers"),
  loader: ({ context }) => context.queryClient.ensureQueryData(landingToursQuery),
  component: () => <LandingPageView path="/glasgow-airport-transfers" />,
});
