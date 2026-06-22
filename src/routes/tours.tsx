import { createFileRoute, Link } from "@tanstack/react-router";
import { Map, Mountain, Castle, Palmtree, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import edinburghImg from "@/assets/edinburgh.jpg";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "Tours & Trips — Cabslink Private UK Chauffeur Tours" },
      { name: "description", content: "Bespoke private tours of Scotland and the UK with a professional chauffeur. Edinburgh, Highlands, Lake District, Cotswolds and beyond." },
      { property: "og:title", content: "Private UK Tours — Cabslink" },
      { property: "og:url", content: "/tours" },
    ],
    links: [{ rel: "canonical", href: "/tours" }],
  }),
  component: ToursPage,
});

const tours = [
  { icon: Castle, name: "Edinburgh City Tour", desc: "Castle, Royal Mile, Holyrood and Princes Street with a knowledgeable local chauffeur." },
  { icon: Mountain, name: "Scottish Highlands", desc: "Loch Ness, Glencoe and the Highlands — single-day or multi-day tours." },
  { icon: Map, name: "Lake District Escape", desc: "Curated lakeside drives, viewpoints and stops at your pace." },
  { icon: Palmtree, name: "Cotswolds & Bath", desc: "Honey-stone villages, English countryside and a stop in historic Bath." },
];

function ToursPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Tours & Trips"
        title="Private UK tours, designed around you."
        subtitle="A private chauffeur, a curated route and the freedom to travel on your schedule — explore Scotland and the UK in comfort."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={edinburghImg} alt="Edinburgh" width={1600} height={1024} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/3]" />
          <div>
            <SectionHeader eyebrow="Why book a private tour" title="See more, drive less, enjoy everything." subtitle="No coaches, no rigid timetables — just your group, your route and a chauffeur who knows the country." />
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/contact">Plan your tour <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="Popular itineraries" title="Tours we run year-round" />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {tours.map(t => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-7 hover:shadow-[var(--shadow-elegant)] transition">
                <t.icon className="size-8 text-[var(--gold)]" />
                <h3 className="mt-4 font-display text-2xl font-semibold">{t.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
