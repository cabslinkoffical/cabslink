import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Briefcase, Luggage, ArrowRight, ShieldCheck, Accessibility, Zap, CheckCircle2, Sparkles, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { VehicleAllocationNotice } from "@/components/site/VehicleAllocationNotice";
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
  const items = classes.filter((c) => c.slug !== "unclassified");

  return (
    <SiteLayout>
      {/* HERO — compact */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--navy-foreground)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, var(--gold) 0, transparent 45%), radial-gradient(circle at 85% 80%, #ffffff 0, transparent 40%)",
          }}
        />
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

      {/* ALTERNATING CLASS ROWS */}
      <section id="classes" className="bg-[var(--background)]">
        <div className="container-x py-12 md:py-16">
          <ul className="divide-y divide-border/60">
            {items.map((c, i) => (
              <li key={c.id} className="py-10 md:py-14 first:pt-0 last:pb-0">
                <Reveal>
                  <ClassRow klass={c} index={i} reverse={i % 2 === 1} />
                </Reveal>
              </li>
            ))}
          </ul>

          <div className="pt-10">
            <VehicleAllocationNotice />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-y bg-[var(--background)]">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--navy)] text-[var(--navy-foreground)] p-10 md:p-14">
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08]"
              style={{ backgroundImage: "radial-gradient(circle at 80% 30%, var(--gold) 0, transparent 45%)" }}
            />
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

function ClassRow({ klass, reverse }: { klass: PublicVehicleClass; index: number; reverse: boolean }) {
  const img = fleetImageFor(klass.slug, klass.hero_image);
  const recs = Object.entries(klass.recommended_for ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RECOMMENDED_LABELS[k] ?? k)
    .slice(0, 4);

  return (
    <article
      id={klass.slug}
      className={`grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center ${reverse ? "md:[&>div:first-child]:order-2" : ""}`}
    >
      {/* IMAGE PLATE */}
      <div className="md:col-span-6">
        <div className="group relative rounded-[28px] bg-gradient-to-br from-[var(--surface,#f5f2ec)] via-white to-[var(--surface,#f5f2ec)] aspect-[16/10] p-6 md:p-10 flex items-center justify-center overflow-hidden ring-1 ring-[var(--navy)]/5 shadow-[0_30px_60px_-40px_rgba(14,24,44,0.35)]">
          {/* soft gold glow */}
          <div
            aria-hidden
            className="absolute -inset-8 opacity-60 blur-3xl"
            style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--gold) 22%, transparent), transparent 70%)" }}
          />
          {/* ground shadow */}
          <div aria-hidden className="absolute bottom-6 left-8 right-8 h-3 rounded-full bg-[var(--navy)]/25 blur-xl" />

          {img ? (
            <img
              src={img}
              alt={`${klass.name} — representative vehicle`}
              loading="lazy"
              decoding="async"
              className="relative z-10 max-h-full max-w-full w-auto h-auto object-contain drop-shadow-[0_28px_28px_rgba(14,24,44,0.22)] transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="relative z-10 text-xs text-muted-foreground">Image coming soon</span>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-20">
            {klass.badge && (
              <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground,#0e182c)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                {klass.badge}
              </span>
            )}
            {klass.featured && !klass.badge && (
              <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground,#0e182c)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                Featured
              </span>
            )}
            {klass.fuel_type === "electric" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                <Zap className="size-2.5" /> Electric
              </span>
            )}
            {klass.wheelchair_accessible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)] text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                <Accessibility className="size-2.5" /> WAV
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="md:col-span-6">
        <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--gold)]">
          <span className="h-px w-8 bg-[var(--gold)]" /> Vehicle Class
        </p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl xl:text-5xl font-semibold text-foreground leading-[1.05] tracking-tight">
          {klass.name}
        </h2>
        {klass.short_description && (
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">{klass.short_description}</p>
        )}

        {/* Specs — prominent */}
        <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
          <MiniSpec icon={<Users className="size-4" />} label="Passengers" value={String(klass.passengers)} />
          <MiniSpec icon={<Briefcase className="size-4" />} label="Large bags" value={String(klass.large_luggage)} />
          <MiniSpec icon={<Luggage className="size-4" />} label="Cabin bags" value={String(klass.cabin_bags)} />
        </div>

        {/* Recommended chips */}
        {recs.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">Best for</p>
            <div className="flex flex-wrap gap-2">
              {recs.map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--navy)] text-white px-3 py-1.5 text-xs font-medium shadow-sm">
                  <CheckCircle2 className="size-3.5 text-[var(--gold)]" /> {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Models table */}
        {klass.models.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">Vehicles in this class</p>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-[var(--navy)]/5 text-[var(--navy)]">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Model</th>
                    <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">Make</th>
                    <th className="text-right font-semibold px-4 py-2.5">Pax</th>
                    <th className="text-right font-semibold px-4 py-2.5">Bags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {klass.models.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <span className="inline-flex items-center gap-1.5"><Star className="size-3 fill-[var(--gold)] text-[var(--gold)]" /> {m.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.manufacturer ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right">{klass.passengers}</td>
                      <td className="px-4 py-2.5 text-right">{klass.large_luggage} + {klass.cabin_bags}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground italic">
              You book the class — we allocate the specific vehicle from this list based on availability, or upgrade at no extra cost.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" variant="gold" className="rounded-full">
            <Link to="/book">
              {klass.quote_on_request ? "Request quote" : "Book this class"} <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/contact"><ShieldCheck className="size-4" /> Talk to us</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function MiniSpec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3.5 text-center shadow-[0_2px_10px_-6px_rgba(14,24,44,0.2)]">
      <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="text-[var(--gold)]">{icon}</span> {label}
      </div>
      <div className="mt-1 font-display font-semibold text-foreground text-2xl leading-none">{value}</div>
    </div>
  );
}
