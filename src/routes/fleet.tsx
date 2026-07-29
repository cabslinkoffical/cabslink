import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Briefcase, Luggage, ArrowRight, Accessibility, Zap, CheckCircle2, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {items.map((c) => (
              <Reveal key={c.id}>
                <ClassTicket klass={c} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-y bg-[var(--background)]">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--navy)] text-[var(--navy-foreground)] p-10 md:p-14">
            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-semibold">Not sure which class fits?</h2>
              <p className="mt-4 text-[var(--navy-foreground)]/80">
                Tell us your party size, luggage and journey — we'll recommend the right class and lock in the fare.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 justify-center">
                <Button asChild variant="gold" className="rounded-full"><Link to="/book">Get a quote <ArrowRight className="size-4" /></Link></Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent text-[var(--navy-foreground)] border-[var(--navy-foreground)]/40 hover:bg-white/10"><Link to="/contact">Talk to our team</Link></Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ClassTicket({ klass }: { klass: PublicVehicleClass }) {
  const img = fleetImageFor(klass.slug, klass.hero_image);
  const recs = Object.entries(klass.recommended_for ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RECOMMENDED_LABELS[k] ?? k)
    .slice(0, 2);

  return (
    <article
      id={klass.slug}
      className="group relative flex flex-col rounded-2xl bg-card border border-border overflow-hidden shadow-raised hover:shadow-raised-hover hover:-translate-y-1.5 transition-all duration-300"
    >
      {/* Image plate */}
      <div className="relative bg-muted aspect-[16/10] flex items-center justify-center overflow-hidden">
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

      {/* Perforation divider */}
      <div className="relative h-3 bg-card">
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-border" />
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[var(--surface-2)] border border-border" />
        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[var(--surface-2)] border border-border" />
      </div>

      {/* Body */}
      <div className="p-4 md:p-5 flex flex-col gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Vehicle Class</p>
          <h3 className="mt-1 font-display text-lg md:text-xl font-semibold leading-tight line-clamp-1">{klass.name}</h3>
          {klass.short_description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{klass.short_description}</p>
          )}
        </div>

        {/* Compact specs row */}
        <div className="flex items-center gap-3 text-xs text-foreground/80">
          <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-[var(--gold)]" /> {klass.passengers}</span>
          <span className="h-3 w-px bg-border" />
          <span className="inline-flex items-center gap-1.5"><Briefcase className="size-3.5 text-[var(--gold)]" /> {klass.large_luggage}</span>
          <span className="h-3 w-px bg-border" />
          <span className="inline-flex items-center gap-1.5"><Luggage className="size-3.5 text-[var(--gold)]" /> {klass.cabin_bags}</span>
        </div>

        {recs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recs.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] text-foreground/80 px-2 py-0.5 text-[10px] font-medium">
                <CheckCircle2 className="size-2.5 text-[var(--gold)]" /> {r}
              </span>
            ))}
          </div>
        )}

        <div className="pt-1">
          <Button asChild size="sm" variant="gold" className="w-full rounded-full">
            <Link to="/book">
              {klass.quote_on_request ? "Request quote" : "Book this class"} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
