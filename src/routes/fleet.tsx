import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, Briefcase, ArrowRight, ShieldCheck, Star, Luggage } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  id?: string;
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

function FleetPage() {
  const [dbFleet, setDbFleet] = useState<Vehicle[]>([]);
  const [fleetStatus, setFleetStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      supabase
        .from("vehicles")
        .select("id, name, category, image_url, passengers, luggage, hand_luggage, description, featured")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            setFleetStatus("error");
            setDbFleet([]);
            return;
          }
          const mapped: Vehicle[] = data
            .filter((v: any) => v.image_url)
            .map((v: any) => ({
              id: v.id,
              name: (v.name ?? "").trim(),
              note: (v.category ?? "Vehicle").trim(),
              image: v.image_url,
              pax: v.passengers ?? 0,
              lug: v.luggage ?? 0,
              hand: v.hand_luggage ?? 0,
              desc: (v.description ?? "").trim(),
              featured: !!v.featured,
            }));
          setDbFleet(mapped);
          setFleetStatus("ready");
        });
    };
    load();
    const channel = supabase
      .channel("vehicles-fleet")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);


  const activeFleet = useMemo(() => dbFleet, [dbFleet]);
  const hero = activeFleet.find(v => v.featured) ?? activeFleet.find(v => /v-class/i.test(v.name)) ?? activeFleet[0];
  const isLoading = fleetStatus === "loading";


  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Fleet"
        title="A luxury vehicle for every kind of journey."
        subtitle="Every vehicle shown here is live from the admin fleet, active for bookings and kept to the same Cabslink standard."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Fleet" }]}
      />

      {/* V-CLASS HERO */}
      {hero && (
        <section className="section-y">
          <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <img src={hero.image} alt={`${hero.name} luxury chauffeur vehicle`} width={1600} height={1000} className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-elegant)] bg-[var(--surface)]" />
            </Reveal>
            <Reveal delay={120}>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">{hero.featured ? "Featured vehicle" : "Available vehicle"}</p>
              <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">{hero.name}</h2>
              <p className="mt-5 text-muted-foreground">{hero.desc || "Available for chauffeur bookings with Cabslink’s professional standards, immaculate presentation and fully insured service."}</p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                <li className="flex items-start gap-2"><Users className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.pax} passengers</li>
                <li className="flex items-start gap-2"><Briefcase className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.lug} large luggage</li>
                <li className="flex items-start gap-2"><Luggage className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.hand} hand luggage</li>
                <li className="flex items-start gap-2"><ShieldCheck className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.note}</li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gold" className="rounded-full"><a href="/#booking">Book this vehicle <ArrowRight className="size-4" /></a></Button>
                <Button asChild variant="outline" className="rounded-full"><Link to="/contact">Talk to our team</Link></Button>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* FLEET GRID */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="The full fleet" title="One uncompromising standard across every vehicle." subtitle="Each capacity figure is shown as passengers · large luggage · hand luggage." center />
          {isLoading ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading fleet vehicles">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-3xl border border-border bg-card overflow-hidden h-[30rem] animate-pulse">
                  <div className="h-52 bg-muted" />
                  <div className="p-6 space-y-4">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-8 w-2/3 bg-muted rounded" />
                    <div className="h-20 bg-muted rounded" />
                    <div className="h-10 bg-muted rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeFleet.length > 0 ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeFleet.map((f, i) => (
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
          ) : (
            <div className="mt-12 rounded-3xl border border-border bg-card p-8 text-center">
              <h3 className="font-display text-2xl font-semibold">No active vehicles are available right now.</h3>
              <p className="mt-2 text-sm text-muted-foreground">Once a vehicle is marked active in admin, it will appear here automatically.</p>
              {fleetStatus === "error" && <p className="mt-2 text-sm text-muted-foreground">Fleet data could not be loaded. Please refresh the page.</p>}
            </div>
          )}
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
