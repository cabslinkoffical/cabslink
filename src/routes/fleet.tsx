import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Briefcase, Luggage, ArrowRight, Accessibility, Zap, CheckCircle2, Sparkles } from "lucide-react";
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
      { name: "description", content: "Explore Cabslink's vehicle classes — Executive Saloons, Luxury Class, Premium MPVs, Vans and Coaches. Book by class, guaranteed allocation." },
      { property: "og:title", content: "Our Fleet — Vehicle Classes | Cabslink" },
      { property: "og:description", content: "Executive Saloon, Luxury Class, Premium MPV and more. Book by class, guaranteed allocation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://cabslink.com/fleet" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/fleet" }],
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
      {/* HERO */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--navy-foreground)]">
        <div className="container-x relative pt-20 md:pt-24 pb-12 md:pb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
                <Sparkles className="size-3.5" /> Vehicle Classes
              </div>
              <h1 className="mt-5 font-display text-4xl md:text-5xl font-semibold leading-[1.05]">
                Book by class,{" "}
                <span className="text-[var(--gold)]">travel the standard.</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-[var(--navy-foreground)]/80 max-w-2xl">
                You pick a vehicle class — Executive, Luxury, Premium MPV or more. Our dispatch team allocates the exact model on the day, always from your booked class or a complimentary upgrade.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full bg-transparent text-[var(--navy-foreground)] border-[var(--navy-foreground)]/30 hover:bg-white/10 hover:text-[var(--navy-foreground)] shrink-0">
              <Link to="/fleet">
                View all classes <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CLASS GRID */}
      <section id="classes" className="bg-[var(--navy)]">
        <div className="container-x pb-16 md:pb-24">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((c) => (
              <Reveal key={c.id}>
                <FleetCard klass={c} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Guaranteed allocation"
        title="Book the class that fits your journey"
        subtitle="Choose a vehicle class and we allocate the model — or a complimentary upgrade."
      />
    </SiteLayout>
  );
}

function FleetCard({ klass }: { klass: PublicVehicleClass }) {
  const img = fleetImageFor(klass.slug, klass.hero_image);
  const models = (klass.models ?? []).slice(0, 3);
  const recs = Object.entries(klass.recommended_for ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RECOMMENDED_LABELS[k] ?? k.replace(/_/g, " "));

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--navy)]/10 bg-white transition-all duration-300 hover:-translate-y-2 hover:border-[var(--navy)]/20 hover:shadow-[0_22px_46px_-20px_rgba(0,0,0,0.18)]">
      {/* Image stage */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[var(--surface-2)]">
        {img ? (
          <img
            src={img}
            alt={klass.name}
            loading="lazy"
            decoding="async"
            className="relative z-10 max-h-[78%] max-w-[84%] w-auto h-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <span className="text-xs text-[var(--navy)]/50">Image coming soon</span>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {klass.badge ? (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              {klass.badge}
            </span>
          ) : klass.featured ? (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              Featured
            </span>
          ) : null}
          {klass.fuel_type === "electric" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white text-[var(--navy)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-[var(--navy)]/10 shadow-sm">
              <Zap className="size-2.5 text-[var(--gold)]" /> Zero emission
            </span>
          )}
          {klass.wheelchair_accessible && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white text-[var(--navy)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-[var(--navy)]/10 shadow-sm">
              <Accessibility className="size-2.5 text-[var(--gold)]" /> WAV
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Vehicle Class</p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-[var(--navy)]">{klass.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/70">
            {klass.short_description || klass.long_description}
          </p>
        </div>

        {/* Capacity */}
        <div className="flex flex-wrap items-center gap-3 text-[var(--navy)]/80">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Users className="size-3.5 text-[var(--gold-ink)]" /> {klass.passengers} pax
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Briefcase className="size-3.5 text-[var(--gold-ink)]" /> {klass.large_luggage} bags
          </span>
          {klass.cabin_bags > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <Luggage className="size-3.5 text-[var(--gold-ink)]" /> {klass.cabin_bags} cabin
            </span>
          )}
        </div>

        {/* Models */}
        {models.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <span
                key={m.id}
                className="rounded-md border border-[var(--navy)]/10 bg-[var(--navy)]/5 px-2 py-1 text-[11px] font-medium text-[var(--navy)]/80"
              >
                {m.manufacturer && !m.name.toLowerCase().startsWith(m.manufacturer.toLowerCase())
                  ? `${m.manufacturer} ${m.name}`
                  : m.name}
              </span>
            ))}
          </div>
        )}

        {/* Best for */}
        {recs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recs.slice(0, 2).map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--gold-ink)] capitalize"
              >
                <CheckCircle2 className="size-2.5" /> {r}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-[var(--navy)]/10">
          <Link
            to="/book"
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--navy)]/80 hover:text-[var(--gold-ink)] transition-colors"
          >
            View class
          </Link>
          <Button asChild size="sm" variant="gold" className="rounded-full px-5">
            <Link to="/book">
              {klass.quote_on_request ? "GET QUOTE" : "GET QUOTE"} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
