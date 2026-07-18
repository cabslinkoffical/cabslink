import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Briefcase, ArrowRight, ShieldCheck, Star, Luggage } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listPublicVehicles, type PublicVehicle } from "@/lib/fleet.functions";

const fleetQuery = queryOptions({
  queryKey: ["public-vehicles"],
  queryFn: () => listPublicVehicles(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Cabslink Luxury Chauffeur Vehicles UK" },
      { name: "description", content: "Explore Cabslink's active chauffeur fleet — current vehicle details, images, capacity and availability." },
      { property: "og:title", content: "Our Fleet — Cabslink Luxury Chauffeur Vehicles" },
      { property: "og:url", content: "https://cabslink.lovable.app/fleet" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/fleet" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  errorComponent: () => (
    <SiteLayout>
      <div className="container-x section-y text-center">
        <h1 className="font-display text-3xl font-semibold">Fleet is temporarily unavailable</h1>
        <p className="mt-3 text-muted-foreground">Please refresh the page in a moment.</p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => null,
  component: FleetPage,
});

function FleetPage() {
  const { data: activeFleet, refetch } = useSuspenseQuery(fleetQuery);

  useEffect(() => {
    const channel = supabase
      .channel("vehicles-fleet")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => { void refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const hero: PublicVehicle | undefined =
    activeFleet.find((v) => v.featured) ??
    activeFleet.find((v) => /v-class/i.test(v.name)) ??
    activeFleet[0];



  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Fleet"
        title="A luxury vehicle for every kind of journey."
        subtitle="Every vehicle shown here is live from the admin fleet, active for bookings and kept to the same Cabslink standard."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Fleet" }]}
      />

      {/* FEATURED HERO */}
      {hero && (
        <section className="section-y">
          <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <img src={hero.image_url} alt={`${hero.name} — chauffeured ${hero.passengers}-seat vehicle`} width={1600} height={1000} decoding="async" fetchPriority="high" className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-elegant)] bg-[var(--surface)]" />
            </Reveal>
            <Reveal delay={120}>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">{hero.featured ? "Featured vehicle" : "Available vehicle"}</p>
              <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">{hero.name}</h2>
              <p className="mt-5 text-muted-foreground">{hero.description || "Available for chauffeur bookings with Cabslink's professional standards, immaculate presentation and fully insured service."}</p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                <li className="flex items-start gap-2"><Users className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.passengers} passengers</li>
                <li className="flex items-start gap-2"><Briefcase className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.luggage} large luggage</li>
                <li className="flex items-start gap-2"><Luggage className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.hand_luggage} hand luggage</li>
                <li className="flex items-start gap-2"><ShieldCheck className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{hero.category}</li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gold" className="rounded-full"><Link to="/book">Get a quote <ArrowRight className="size-4" /></Link></Button>
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
          {activeFleet.length > 0 ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeFleet.map((f, i) => (
              <Reveal key={f.id} delay={i * 80}>
                <div className={`rounded-3xl border bg-card overflow-hidden hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] transition h-full flex flex-col ${f.featured ? "border-[var(--gold)]" : "border-border"}`}>
                  <div className="relative h-52 overflow-hidden bg-[var(--surface)] flex items-center justify-center p-4">
                    <img src={f.image_url} alt={`${f.name} — chauffeured ${f.passengers}-seat vehicle`} loading="lazy" decoding="async" width={1200} height={800} className="size-full object-contain" />
                    {f.featured && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-3 py-1 text-xs font-semibold">
                        <Star className="size-3 fill-current" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <p className="text-xs uppercase tracking-wider text-[var(--gold)]">{f.category}</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold">{f.name}</h3>
                    <p className="mt-3 text-sm text-muted-foreground flex-1">{f.description}</p>
                    <div className="mt-5 flex gap-4 text-sm">
                      <span className="flex items-center gap-1.5" title="Passengers"><Users className="size-4 text-[var(--gold)]" />{f.passengers}</span>
                      <span className="flex items-center gap-1.5" title="Large luggage"><Briefcase className="size-4 text-[var(--gold)]" />{f.luggage}</span>
                      <span className="flex items-center gap-1.5" title="Hand luggage"><Luggage className="size-4 text-[var(--gold)]" />{f.hand_luggage}</span>
                    </div>
                    <Button asChild variant="gold" className="mt-5 w-full rounded-full"><Link to="/book">Get a quote <ArrowRight className="size-4" /></Link></Button>
                  </div>
                </div>
              </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-3xl border border-border bg-card p-8 text-center">
              <h3 className="font-display text-2xl font-semibold">No active vehicles are available right now.</h3>
              <p className="mt-2 text-sm text-muted-foreground">Once a vehicle is marked active in admin, it will appear here automatically.</p>
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
