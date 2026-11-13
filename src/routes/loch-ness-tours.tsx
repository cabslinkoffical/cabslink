import { createFileRoute } from "@tanstack/react-router";
import { landingHead } from "@/components/site/LandingPage.head";
import { LandingPageView, landingToursQuery } from "@/components/site/LandingPage";

export const Route = createFileRoute("/loch-ness-tours")({
  head: () => landingHead("/loch-ness-tours"),
  loader: ({ context }) => context.queryClient.ensureQueryData(landingToursQuery),
  component: () => <LandingPageView path="/loch-ness-tours" />,
});
