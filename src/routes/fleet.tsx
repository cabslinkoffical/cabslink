import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Users, Briefcase, ArrowRight, ShieldCheck, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import vClassImg from "@/assets/v-class.jpg";
import vClassInteriorImg from "@/assets/v-class-interior.jpg";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Cabslink Mercedes-Benz V-Class Chauffeur Service" },
      { name: "description", content: "Travel in the Mercedes-Benz V-Class — our signature luxury people carrier. A modern, fully insured chauffeur fleet maintained to the highest standards." },
      { property: "og:title", content: "Our Fleet — Mercedes-Benz V-Class | Cabslink" },
      { property: "og:url", content: "/fleet" },
      { property: "og:image", content: vClassImg },
    ],
    links: [{ rel: "canonical", href: "/fleet" }],
  }),
  component: FleetPage,
});

const vClassFeatures = [
  "Up to 7 passengers in executive comfort",
  "Generous luggage capacity for airport runs",
  "Premium leather captain seats",
  "Privacy glass & ambient cabin lighting",
  "Climate control & on-board USB charging",
  "Fully insured & immaculately maintained",
];

const fleet = [
  { name: "V-Class Executive", note: "Signature class", pax: 6, lug: 6, desc: "Our flagship Mercedes-Benz V-Class — captain seats, privacy glass and the smoothest ride for executives and families.", featured: true },
  { name: "V-Class Group", note: "Group travel", pax: 7, lug: 7, desc: "The same Mercedes-Benz V-Class configured for larger parties — perfect for airport runs and corporate groups." },
  { name: "Saloon", note: "Everyday comfort", pax: 4, lug: 2, desc: "Premium saloon vehicles for individuals and small groups — efficient, comfortable and reliable." },
  { name: "Executive Saloon", note: "Business class", pax: 4, lug: 3, desc: "Executive sedans with extra legroom, leather interiors and a professional chauffeur." },
  { name: "SUV", note: "Space & style", pax: 6, lug: 4, desc: "Spacious luxury SUVs ideal for families, small groups and clients with more luggage." },
  { name: "Minibus", note: "Larger groups & tours", pax: 16, lug: 16, desc: "Modern minibuses for corporate groups, weddings, sports teams and private tours." },
];

function FleetPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Fleet"
        title="The Mercedes-Benz V-Class — our signature chauffeur car."
        subtitle="Cabslink runs a modern, immaculate Mercedes-Benz V-Class fleet — the gold standard in luxury people-carrier travel across the UK."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Fleet" }]}
      />

      {/* V-CLASS HERO */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="relative">
            <img src={vClassImg} alt="Mercedes-Benz V-Class luxury chauffeur van" width={1600} height={1000} className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-elegant)]" />
            <img src={vClassInteriorImg} alt="Mercedes-Benz V-Class executive leather interior" loading="lazy" width={1600} height={1000} className="hidden md:block absolute -bottom-8 -right-6 w-1/2 rounded-2xl object-cover aspect-[4/3] border-4 border-background shadow-[var(--shadow-elegant)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Mercedes-Benz V-Class</p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">The standard for premium UK chauffeur travel.</h2>
            <p className="mt-5 text-muted-foreground">
              Every Cabslink journey is delivered in a Mercedes-Benz V-Class — the most refined people carrier on the road.
              Whisper-quiet cabin, executive leather seating, generous luggage space and a chauffeur trained to the highest
              standards. Ideal for airport transfers, corporate travel, weddings and private tours.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {vClassFeatures.map(f => (
                <li key={f} className="flex items-start gap-2"><ShieldCheck className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{f}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-full"><Link to="/book">Book the V-Class <ArrowRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link to="/contact">Talk to our team</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* FLEET GRID */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="The full fleet" title="A vehicle for every kind of journey" subtitle="From a single executive transfer to airport runs for a group of sixteen — every Cabslink vehicle is modern, immaculate and fully insured." center />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fleet.map(f => (
              <div key={f.name} className={`rounded-3xl border bg-card overflow-hidden hover:shadow-[var(--shadow-elegant)] transition ${f.featured ? "border-[var(--gold)]" : "border-border"}`}>
                <div className="relative h-48 overflow-hidden">
                  <img src={vClassImg} alt={`${f.name} vehicle`} loading="lazy" width={1600} height={1000} className="size-full object-cover" />
                  {f.featured && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-3 py-1 text-xs font-semibold">
                      <Star className="size-3 fill-current" /> Most popular
                    </span>
                  )}
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
        </div>
      </section>
    </SiteLayout>
  );
}
