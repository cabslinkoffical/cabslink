import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Briefcase,
  Luggage,
  ArrowRight,
  Accessibility,
  Zap,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  Clock,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { listPublicVehicleClasses, type PublicVehicleClass } from "@/lib/vehicle-classes.functions";
import { fleetImageFor } from "@/assets/fleet";
import { supabase } from "@/integrations/supabase/client";
import { collectionPageSchema } from "@/components/seo/schema";

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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          collectionPageSchema({
            name: "Cabslink Fleet — Vehicle Classes",
            description: "Executive Saloons, Luxury Class, Premium MPVs, Vans and Coaches. Book by class with guaranteed allocation.",
            url: "/fleet",
            breadcrumbs: [{ name: "Home", url: "/" }, { name: "Fleet", url: "/fleet" }],
          }),
        ),
      },
    ],
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

type GroupKey = "all" | "saloons" | "mpv" | "group" | "accessible" | "electric";

const GROUPS: { key: GroupKey; label: string; match: (c: PublicVehicleClass) => boolean }[] = [
  { key: "all", label: "All classes", match: () => true },
  {
    key: "saloons",
    label: "Saloons & Estates",
    match: (c) => /saloon|estate|sedan/.test(c.slug),
  },
  { key: "mpv", label: "MPVs & Vans", match: (c) => /mpv|van/.test(c.slug) && !/minibus/.test(c.slug) },
  { key: "group", label: "Minibus & Coach", match: (c) => /minibus|coach|bus/.test(c.slug) },
  { key: "accessible", label: "Accessible", match: (c) => c.wheelchair_accessible },
  { key: "electric", label: "Electric", match: (c) => c.fuel_type === "electric" },
];

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

  const items = useMemo(() => classes.filter((c) => c.slug !== "unclassified"), [classes]);
  const [group, setGroup] = useState<GroupKey>("all");

  const tabs = useMemo(
    () => GROUPS.filter((g) => g.key === "all" || items.some(g.match)),
    [items],
  );
  const active = tabs.find((t) => t.key === group) ?? tabs[0];
  const visible = items.filter(active.match);

  const maxPax = items.reduce((m, c) => Math.max(m, c.passengers), 0);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--navy-foreground)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-10%] size-[420px] rounded-full bg-[var(--gold)]/10 blur-3xl"
        />
        <div className="container-x relative pt-16 md:pt-20 pb-10 md:pb-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
              <Sparkles className="size-3.5" /> Vehicle Classes
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05]">
              Book by class,{" "}
              <span className="text-[var(--gold)]">travel the standard.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base md:text-lg text-[var(--navy-foreground)]/75">
              You pick a vehicle class — Executive, Luxury, Premium MPV or more. Our dispatch team allocates
              the exact model on the day, always from your booked class or a complimentary upgrade.
            </p>
          </div>

          {/* Stat strip */}
          <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              { v: `${items.length}`, l: "Vehicle classes" },
              { v: `1–${maxPax || 8}`, l: "Passengers per booking" },
              { v: "Fixed", l: "Prices, quoted upfront" },
              { v: "24/7", l: "UK dispatch support" },
            ].map((s) => (
              <div key={s.l} className="bg-[var(--navy)] px-4 py-4 md:px-5 md:py-5">
                <dt className="font-display text-2xl font-semibold text-[var(--gold)] md:text-3xl">{s.v}</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/60">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FILTER + GRID */}
      <section id="classes" className="bg-[var(--navy)]">
        <div className="container-x pb-16 md:pb-24">
          <div className="mb-8 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 md:pb-0">
              {tabs.map((t) => {
                const on = t.key === active.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setGroup(t.key)}
                    aria-pressed={on}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                      on
                        ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-foreground)]"
                        : "border-white/15 text-white/70 hover:border-[var(--gold)]/50 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              {visible.length} {visible.length === 1 ? "class" : "classes"}
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/70">
              No classes in this category yet — try another filter.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {visible.map((c) => (
                <Reveal key={c.id}>
                  <FleetCard klass={c} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW ALLOCATION WORKS */}
      <section className="bg-white">
        <div className="container-x section-y">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--gold-ink)]">
              How allocation works
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[var(--navy)] md:text-4xl">
              You book the standard, we assign the vehicle
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: BadgeCheck,
                title: "Choose a class",
                body: "Every class lists exact passenger and luggage capacity, so you book with confidence — not guesswork.",
              },
              {
                icon: Clock,
                title: "We allocate on the day",
                body: "Dispatch assigns the best available vehicle from your booked class, matched to your route and timing.",
              },
              {
                icon: ShieldCheck,
                title: "Never a downgrade",
                body: "If your class is stretched we upgrade at no extra cost. You always travel at or above the standard you paid for.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-[var(--navy)]/10 bg-[var(--surface-2)] p-6"
              >
                <span className="grid size-10 place-items-center rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold-ink)]">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-[var(--navy)]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-[var(--surface-2)]">
        <div className="container-x section-y">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--gold-ink)]">
              Compare at a glance
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[var(--navy)] md:text-4xl">
              Capacity by vehicle class
            </h2>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--navy)]/10 bg-[var(--navy)]/[0.03] text-[11px] uppercase tracking-[0.16em] text-[var(--navy)]/60">
                    <th scope="col" className="px-5 py-3 font-semibold">Class</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Passengers</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Large bags</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Cabin bags</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const recs = Object.entries(c.recommended_for ?? {})
                      .filter(([, v]) => v)
                      .map(([k]) => RECOMMENDED_LABELS[k] ?? k.replace(/_/g, " "));
                    return (
                      <tr key={c.id} className="border-b border-[var(--navy)]/[0.07] last:border-0">
                        <th scope="row" className="px-5 py-3 font-medium text-[var(--navy)]">
                          {c.name}
                        </th>
                        <td className="px-5 py-3 text-[var(--navy)]/70">{c.passengers}</td>
                        <td className="px-5 py-3 text-[var(--navy)]/70">{c.large_luggage}</td>
                        <td className="px-5 py-3 text-[var(--navy)]/70">{c.cabin_bags}</td>
                        <td className="px-5 py-3 text-[var(--navy)]/70 capitalize">
                          {recs.slice(0, 2).join(", ") || "All journeys"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_50px_-24px_rgba(0,0,0,0.5)]">
      {/* Image stage — uniform crop so every card reads the same */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--navy)]">
        {img ? (
          <img
            src={img}
            alt={`${klass.name} vehicle class`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <span className="grid size-full place-items-center text-xs text-white/50">Image coming soon</span>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/45 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {klass.badge || klass.featured ? (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              {klass.badge || "Featured"}
            </span>
          ) : null}
          {klass.fuel_type === "electric" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white text-[var(--navy)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <Zap className="size-2.5 text-[var(--gold-ink)]" /> Zero emission
            </span>
          )}
          {klass.wheelchair_accessible && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white text-[var(--navy)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <Accessibility className="size-2.5 text-[var(--gold-ink)]" /> WAV
            </span>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">Vehicle class</p>
          <h3 className="mt-0.5 font-display text-xl font-semibold leading-tight text-white">{klass.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-[var(--navy)]/70">
          {klass.short_description || klass.long_description}
        </p>

        {/* Capacity */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--navy)]/10 bg-[var(--surface-2)] p-3 text-center">
          <div>
            <Users className="mx-auto size-4 text-[var(--gold-ink)]" />
            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">{klass.passengers}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--navy)]/55">Pax</p>
          </div>
          <div className="border-x border-[var(--navy)]/10">
            <Briefcase className="mx-auto size-4 text-[var(--gold-ink)]" />
            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">{klass.large_luggage}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--navy)]/55">Large</p>
          </div>
          <div>
            <Luggage className="mx-auto size-4 text-[var(--gold-ink)]" />
            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">{klass.cabin_bags}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--navy)]/55">Cabin</p>
          </div>
        </div>

        {/* Models */}
        {models.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--navy)]/45">
              Typical models
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
          </div>
        )}

        {/* Best for */}
        {recs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recs.slice(0, 2).map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--gold-ink)] capitalize"
              >
                <CheckCircle2 className="size-2.5" /> {r}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto border-t border-[var(--navy)]/10 pt-4">
          <Button asChild variant="gold" className="w-full rounded-full">
            <Link to="/book">
              {klass.quote_on_request ? "Request a quote" : "Get a fixed price"}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

