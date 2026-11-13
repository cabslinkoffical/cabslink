import { createFileRoute } from "@tanstack/react-router";
import { landingHead } from "@/components/site/LandingPage.head";
import { LandingPageView, landingToursQuery } from "@/components/site/LandingPage";

export const Route = createFileRoute("/st-andrews-golf-transfers")({
  head: () => landingHead("/st-andrews-golf-transfers"),
  loader: ({ context }) => context.queryClient.ensureQueryData(landingToursQuery),
  component: () => <LandingPageView path="/st-andrews-golf-transfers" />,
});
