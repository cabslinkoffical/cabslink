import { createFileRoute } from "@tanstack/react-router";
import { landingHead } from "@/components/site/LandingPage.head";
import { LandingPageView, landingToursQuery } from "@/components/site/LandingPage";

export const Route = createFileRoute("/highlands-private-tours")({
  head: () => landingHead("/highlands-private-tours"),
  loader: ({ context }) => context.queryClient.ensureQueryData(landingToursQuery),
  component: () => <LandingPageView path="/highlands-private-tours" />,
});
