import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Briefcase, Luggage, ArrowRight, Accessibility, Zap, CheckCircle2, Sparkles, Backpack, Fuel, Baby, Car } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { listPublicVehicleClasses, type PublicVehicleClass } from "@/lib/vehicle-classes.functions";
import { fleetImageFor } from "@/assets/fleet";
import { supabase } from "@/integrations/supabase/client";

const fleetQuery = queryOptions({
  queryKey: ["public-vehicle-classes"],
  queryFn: () => listPublicVehicleClasses(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Vehicle Classes | Cabslink UK" },
      { name: "description", content: "Explore Cabslink's vehicle classes — Executive Saloons, Luxury Chauffeur, Premium MPVs, Vans and Coaches. Book by class, guaranteed allocation." },
      { property: "og:title", content: "Our Fleet — Vehicle Classes | Cabslink" },
      { property: "og:description", content: "Executive Saloon, Luxury Chauffeur, Premium MPV and more. Book by class, guaranteed allocation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const RECOMMENDED_LABELS: Record<string, string> = {
  airport: "Airport transfers",
  corporate: "Corporate travel",
  long_distance: "Long distance",
  tours: "Private tours",
  weddings: "Weddings",
  executive: "Executive travel",
};

function FleetPage() {
  const { data: classes } = useSuspenseQuery(fleetQuery);
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] });
    const ch = supabase
      .channel("public-fleet-classes")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_classes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_models" }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const items = classes.filter((c) => c.slug !== "unclassified");

  return (
    <SiteLayout>
      {/* HERO — compact */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--navy-foreground)]">

        <div className="container-x relative pt-20 md:pt-24 pb-12 md:pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
              <Sparkles className="size-3.5" /> The Cabslink Fleet
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-5xl font-semibold leading-[1.05]">
              A vehicle class for every kind of journey.
            </h1>
            <p className="mt-4 text-base md:text-lg text-[var(--navy-foreground)]/80 max-w-2xl">
              Book by class — your exact model is allocated by dispatch, always from your booked class or a complimentary upgrade.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-full">
                <Link to="/book">Get a quote <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-transparent text-[var(--navy-foreground)] border-[var(--navy-foreground)]/30 hover:bg-white/10">
                <a href="#classes">Browse classes</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CLASS TICKETS — compact separate cards */}
      <section id="classes" className="bg-[var(--surface-2)]">
        <div className="container-x py-12 md:py-16">
          <div className="flex flex-col gap-6 md:gap-8">
            {items.map((c, i) => (
              <Reveal key={c.id}>
                <ClassTicket klass={c} reverse={i % 2 === 1} />
              </Reveal>
            ))}
          </div>

        </div>
      </section>

    </SiteLayout>
  );
}

function ClassTicket({ klass, reverse = false }: { klass: PublicVehicleClass; reverse?: boolean }) {
  const img = fleetImageFor(klass.slug, klass.hero_image);
  const recs = Object.entries(klass.recommended_for ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RECOMMENDED_LABELS[k] ?? k.replace(/_/g, " "));
  const models = klass.models ?? [];
  const fuelLabel =
    klass.fuel_type === "electric"
      ? "Electric"
      : klass.fuel_type
        ? klass.fuel_type.charAt(0).toUpperCase() + klass.fuel_type.slice(1).replace(/_/g, " ")
        : null;

  return (
    <article
      id={klass.slug}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-raised transition-all duration-300 hover:-translate-y-1.5 hover:shadow-raised-hover ${
        reverse ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      {/* Image plate */}
      <div className="relative flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden bg-muted md:aspect-auto md:w-[38%] md:min-h-[300px]">

        {img ? (
          <img
            src={img}
            alt={`${klass.name}`}
            loading="lazy"
            decoding="async"
            className="max-h-[82%] max-w-[86%] w-auto h-auto object-contain drop-shadow-[0_10px_14px_rgba(14,24,44,0.18)] transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Image coming soon</span>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {klass.badge ? (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground,#0e182c)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest shadow-sm">
              {klass.badge}
            </span>
          ) : klass.featured ? (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground,#0e182c)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest shadow-sm">
              Featured
            </span>
          ) : null}
          {klass.fuel_type === "electric" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success text-success-foreground px-2 py-1 text-[9px] font-bold uppercase tracking-widest shadow-sm">
              <Zap className="size-2.5" /> Electric
            </span>
          )}
          {klass.wheelchair_accessible && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)] text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest shadow-sm">
              <Accessibility className="size-2.5" /> WAV
            </span>
          )}
        </div>
      </div>

      {/* Perforation divider — horizontal on mobile, vertical on desktop */}
      <div className="relative h-3 bg-card md:h-auto md:w-3">
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-border md:inset-x-auto md:inset-y-6 md:left-1/2 md:top-auto md:-translate-x-1/2 md:translate-y-0 md:border-t-0 md:border-l md:border-dashed" />
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[var(--surface-2)] border border-border md:left-1/2 md:top-0 md:-translate-x-1/2 md:-translate-y-1/2" />
        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[var(--surface-2)] border border-border md:left-1/2 md:right-auto md:top-full md:-translate-x-1/2 md:-translate-y-1/2" />
      </div>


      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5 md:p-7">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Vehicle Class</p>
          <h3 className="mt-1 font-display text-xl md:text-2xl font-semibold leading-tight">{klass.name}</h3>
          {(klass.short_description || klass.long_description) && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {klass.short_description || klass.long_description}
            </p>
          )}
        </div>


        {/* Full capacity spec grid */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SpecCell icon={<Users className="size-3.5" />} label="Passengers" value={klass.passengers} />
          <SpecCell icon={<Briefcase className="size-3.5" />} label="Large bags" value={klass.large_luggage} />
          <SpecCell icon={<Luggage className="size-3.5" />} label="Cabin bags" value={klass.cabin_bags} />
          <SpecCell icon={<Backpack className="size-3.5" />} label="Hand luggage" value={klass.hand_luggage} />
        </dl>


        {/* Attributes */}
        <div className="flex flex-wrap gap-1.5">
          {fuelLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-foreground/80">
              <Fuel className="size-2.5 text-[var(--gold)]" /> {fuelLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-foreground/80">
            <Baby className="size-2.5 text-[var(--gold)]" />
            {klass.child_seats_supported ? "Child seats available" : "No child seats"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-foreground/80">
            <Accessibility className="size-2.5 text-[var(--gold)]" />
            {klass.wheelchair_accessible ? "Wheelchair accessible" : "Step-in access"}
          </span>
        </div>

        {/* Vehicle models in this class */}
        {models.length > 0 && (
          <div className="rounded-xl border border-border bg-[var(--surface-2)]/70 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-ink)]">
              <Car className="size-3" /> Vehicles in this class
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {models.map((m) => (
                <li
                  key={m.id}
                  className="rounded-md bg-card border border-border px-2 py-1 text-[11px] font-medium text-foreground/85"
                >
                  {m.manufacturer && !m.name.toLowerCase().startsWith(m.manufacturer.toLowerCase())
                    ? `${m.manufacturer} ${m.name}`
                    : m.name}

                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">Or similar — allocated by dispatch.</p>
          </div>
        )}

        {recs.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Best for</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recs.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] text-foreground/80 px-2 py-0.5 text-[10px] font-medium capitalize"
                >
                  <CheckCircle2 className="size-2.5 text-[var(--gold)]" /> {r}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          <Button asChild size="sm" variant="gold" className="rounded-full px-6">
            <Link to="/book">
              {klass.quote_on_request ? "Request quote" : "Book this class"} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          {klass.quote_on_request && (
            <p className="text-[11px] font-medium text-muted-foreground">Pricing on request for this class.</p>
          )}
        </div>

      </div>
    </article>
  );
}

function SpecCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-[var(--surface-2)]/60 px-2.5 py-2">
      <span className="text-[var(--gold)]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</dt>
        <dd className="text-sm font-semibold leading-none">{value}</dd>
      </div>
    </div>
  );
}

