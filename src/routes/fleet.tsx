import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Briefcase, ArrowRight, ShieldCheck, Star, Luggage } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";

import rollsAsset from "@/assets/fleet/rolls.png.asset.json";
import sclassAsset from "@/assets/fleet/sclass.png.asset.json";
import eclassAsset from "@/assets/fleet/eclass.png.asset.json";
import vclassAsset from "@/assets/fleet/vclass.png.asset.json";
import minibusAsset from "@/assets/fleet/minibus.png.asset.json";
import rangeRoverAsset from "@/assets/fleet/rangerover.png.asset.json";
import coasterAsset from "@/assets/fleet/coaster.png.asset.json";
import coachAsset from "@/assets/fleet/coach.png.asset.json";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Cabslink Luxury Chauffeur Vehicles UK" },
      { name: "description", content: "From the Mercedes-Benz S-Class and Rolls-Royce Bentley to V-Class people carriers, 16-seat minibuses and 55-seat coaches — Cabslink runs a modern, fully insured chauffeur fleet across the UK." },
      { property: "og:title", content: "Our Fleet — Cabslink Luxury Chauffeur Vehicles" },
      { property: "og:url", content: "/fleet" },
      { property: "og:image", content: vclassAsset.url },
    ],
    links: [{ rel: "canonical", href: "/fleet" }],
  }),
  component: FleetPage,
});

type Vehicle = {
  name: string;
  note: string;
  image: string;
  pax: number;
  lug: number;
  hand: number;
  desc: string;
  featured?: boolean;
};

const fleet: Vehicle[] = [
  {
    name: "Rolls-Royce Bentley",
    note: "Ultra-luxury",
    image: rollsAsset.url,
    pax: 3, lug: 2, hand: 2,
    desc: "The ultimate VIP statement. Handcrafted interiors, whisper-quiet ride and a uniformed chauffeur for weddings, premieres and special occasions.",
    featured: true,
  },
  {
    name: "Mercedes-Benz S-Class",
    note: "Executive flagship",
    image: sclassAsset.url,
    pax: 4, lug: 2, hand: 1,
    desc: "The benchmark in business travel — Nappa leather, climate-controlled rear cabin and effortless airport-to-meeting comfort.",
  },
  {
    name: "Mercedes-Benz E-Class",
    note: "Business class",
    image: eclassAsset.url,
    pax: 3, lug: 2, hand: 2,
    desc: "Refined executive saloon for individuals and small groups — quiet, comfortable and impeccably presented.",
  },
  {
    name: "Mercedes-Benz V-Class",
    note: "Signature people carrier",
    image: vclassAsset.url,
    pax: 8, lug: 6, hand: 2,
    desc: "Our signature 8-seater — captain seats, privacy glass and generous luggage space for families and corporate groups.",
  },
  {
    name: "Range Rover",
    note: "Luxury SUV",
    image: rangeRoverAsset.url,
    pax: 4, lug: 3, hand: 2,
    desc: "Commanding presence and supreme comfort — the discreet luxury SUV for VIPs, security details and country journeys.",
  },
  {
    name: "Mini Bus (16-seater)",
    note: "Group travel",
    image: minibusAsset.url,
    pax: 16, lug: 16, hand: 16,
    desc: "Modern 16-seat minibus for corporate groups, weddings, sports teams and airport runs with full luggage capacity.",
  },
  {
    name: "Coaster Bus (24-seater)",
    note: "Mid-size group",
    image: coasterAsset.url,
    pax: 24, lug: 24, hand: 20,
    desc: "Comfortable 24-seat coaster for tours, conferences and event shuttles — air-conditioned with ample storage.",
  },
  {
    name: "Coach Bus (55-seater)",
    note: "Large groups & tours",
    image: coachAsset.url,
    pax: 55, lug: 55, hand: 30,
    desc: "Full-size 55-seat coach for tours, weddings and corporate events — premium seating, climate control and on-board luggage hold.",
  },
];

const vClassFeatures = [
  "Up to 8 passengers in executive comfort",
  "Generous luggage capacity for airport runs",
  "Premium leather captain seats",
  "Privacy glass & ambient cabin lighting",
  "Climate control & on-board USB charging",
  "Fully insured & immaculately maintained",
];

function FleetPage() {
  const hero = fleet[3]; // V-Class

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Fleet"
        title="A luxury vehicle for every kind of journey."
        subtitle="From Rolls-Royce Bentley and Mercedes-Benz S-Class to 55-seat coaches — every Cabslink vehicle is modern, immaculate and fully insured."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Fleet" }]}
      />

      {/* V-CLASS HERO */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <Reveal>
            <img src={hero.image} alt="Mercedes-Benz V-Class luxury chauffeur van" width={1600} height={1000} className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-elegant)] bg-[var(--surface)]" />
          </Reveal>
          <Reveal delay={120}>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Most requested</p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">The Mercedes-Benz V-Class — our signature ride.</h2>
            <p className="mt-5 text-muted-foreground">
              The most refined people carrier on the road — whisper-quiet cabin, executive leather seating,
              generous luggage space and a chauffeur trained to the highest standards. Ideal for airport
              transfers, corporate travel, weddings and private tours.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {vClassFeatures.map(f => (
                <li key={f} className="flex items-start gap-2"><ShieldCheck className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{f}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-full"><a href="/#booking">Book the V-Class <ArrowRight className="size-4" /></a></Button>
              <Button asChild variant="outline" className="rounded-full"><Link to="/contact">Talk to our team</Link></Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FLEET GRID */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="The full fleet" title="Eight vehicles. One uncompromising standard." subtitle="Each capacity figure is shown as passengers · large luggage · hand luggage." center />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fleet.map((f, i) => (
              <Reveal key={f.name} delay={i * 80}>
                <div className={`rounded-3xl border bg-card overflow-hidden hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] transition h-full flex flex-col ${f.featured ? "border-[var(--gold)]" : "border-border"}`}>
                  <div className="relative h-52 overflow-hidden bg-[var(--surface)] flex items-center justify-center p-4">
                    <img src={f.image} alt={`${f.name} chauffeur vehicle`} loading="lazy" width={1200} height={800} className="size-full object-contain" />
                    {f.featured && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-3 py-1 text-xs font-semibold">
                        <Star className="size-3 fill-current" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <p className="text-xs uppercase tracking-wider text-[var(--gold)]">{f.note}</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold">{f.name}</h3>
                    <p className="mt-3 text-sm text-muted-foreground flex-1">{f.desc}</p>
                    <div className="mt-5 flex gap-4 text-sm">
                      <span className="flex items-center gap-1.5" title="Passengers"><Users className="size-4 text-[var(--gold)]" />{f.pax}</span>
                      <span className="flex items-center gap-1.5" title="Large luggage"><Briefcase className="size-4 text-[var(--gold)]" />{f.lug}</span>
                      <span className="flex items-center gap-1.5" title="Hand luggage"><Luggage className="size-4 text-[var(--gold)]" />{f.hand}</span>
                    </div>
                    <Button asChild variant="outline" className="mt-5 w-full rounded-full"><a href="/#booking">Book this vehicle <ArrowRight className="size-4" /></a></Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-y">
        <div className="container-x">
          <div className="rounded-3xl bg-[var(--navy)] text-[var(--navy-foreground)] p-10 md:p-14 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Give us a call</h2>
            <p className="mt-4 text-white/80 max-w-2xl mx-auto">
              Need a hassle-free UK airport transfer? Cabslink offers personalised solutions tailored to your needs —
              expert advice, immediate assistance and flexible scheduling, with reliable comfort and top-notch service.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Button asChild variant="gold" className="rounded-full"><a href="/#booking">Book online</a></Button>
              <Button asChild variant="outline" className="rounded-full bg-transparent text-white border-white/40 hover:bg-white/10"><Link to="/contact">Contact us</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
