import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { DistanceCalculator } from "@/components/site/DistanceCalculator";

export const Route = createFileRoute("/distance")({
  head: () => ({
    meta: [
      { title: "Driving Distance Calculator — Cabslink" },
      { name: "description", content: "Instantly estimate the driving distance in miles between any two UK locations using Google Maps Routes." },
      { property: "og:title", content: "UK Driving Distance Calculator" },
      { property: "og:description", content: "Enter a pickup and destination to see the real driving-route distance in miles." },
      { property: "og:url", content: "/distance" },
    ],
    links: [{ rel: "canonical", href: "/distance" }],
  }),
  component: DistancePage,
});

function DistancePage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Distance calculator"
        title="Estimate your driving distance"
        subtitle="Enter a pickup and destination in the UK — we calculate the real driving-route distance in miles using Google Maps."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Distance calculator" }]}
      />
      <section className="section-y">
        <div className="container-x max-w-2xl">
          <DistanceCalculator />
        </div>
      </section>
    </SiteLayout>
  );
}
