import { createFileRoute } from "@tanstack/react-router";
import { landingHead } from "@/components/site/LandingPage.head";
import { LandingPageView, landingToursQuery } from "@/components/site/LandingPage";

export const Route = createFileRoute("/outlander-tours")({
  head: () => landingHead("/outlander-tours"),
  loader: ({ context }) => context.queryClient.ensureQueryData(landingToursQuery),
  component: () => <LandingPageView path="/outlander-tours" />,
});
