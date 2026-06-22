import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Users, Briefcase, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Cabslink Saloon, Executive, SUV, MPV & Minibus" },
      { name: "description", content: "A modern, fully insured fleet of saloon, executive, SUV, MPV and minibus vehicles — maintained to the highest standards." },
      { property: "og:title", content: "Our Fleet — Cabslink" },
      { property: "og:url", content: "/fleet" },
    ],
    links: [{ rel: "canonical", href: "/fleet" }],
  }),
  component: FleetPage,
});

const fleet = [
  { name: "Saloon", note: "Everyday comfort", pax: 4, lug: 2, desc: "Premium saloon vehicles for individuals and small groups — efficient, comfortable and reliable." },
  { name: "Executive", note: "Business class", pax: 4, lug: 3, desc: "Executive sedans with extra legroom, leather interiors and a professional chauffeur." },
  { name: "SUV", note: "Space & style", pax: 6, lug: 4, desc: "Spacious luxury SUVs ideal for families, small groups and clients with more luggage." },
  { name: "MPV", note: "Family travel", pax: 7, lug: 6, desc: "Multi-purpose vehicles built for families and extended groups travelling together." },
  { name: "Minibus", note: "Groups & tours", pax: 16, lug: 16, desc: "Modern minibuses for corporate groups, weddings, sports teams and private tours." },
];

function FleetPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Fleet"
        title="A vehicle for every kind of journey."
        subtitle="From a quiet executive ride to airport runs for a group of sixteen, our fleet is modern, immaculate and fully insured."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Fleet" }]}
      />
      <section className="section-y">
        <div className="container-x grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fleet.map(f => (
            <div key={f.name} className="rounded-3xl border border-border bg-card overflow-hidden hover:shadow-[var(--shadow-elegant)] transition">
              <div className="hero-gradient h-44 grid place-items-center text-[var(--gold)]">
                <Car className="size-20 stroke-1" />
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-wider text-[var(--gold)]">{f.note}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{f.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{f.desc}</p>
                <div className="mt-5 flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5"><Users className="size-4 text-[var(--gold)]" />{f.pax}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="size-4 text-[var(--gold)]" />{f.lug}</span>
                </div>
                <Button asChild variant="outline" className="mt-5 w-full rounded-full"><Link to="/book">Book this class <ArrowRight className="size-4" /></Link></Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
