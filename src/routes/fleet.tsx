import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Users, Briefcase, Luggage, ArrowRight, ShieldCheck, Star, Accessibility, Zap, CheckCircle2, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { VehicleAllocationNotice } from "@/components/site/VehicleAllocationNotice";
import { listPublicVehicleClasses, type PublicVehicleClass } from "@/lib/vehicle-classes.functions";
import { fleetImageFor } from "@/assets/fleet";

const fleetQuery = queryOptions({
  queryKey: ["public-vehicle-classes"],
  queryFn: () => listPublicVehicleClasses(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Vehicle Classes | Cabslink UK" },
      { name: "description", content: "Explore Cabslink's vehicle classes — from Executive Saloons to Premium MPVs and Coaches. Book by class, guaranteed allocation or complimentary upgrade." },
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

type Grouped = { key: string; title: string; blurb: string; items: PublicVehicleClass[] };

function groupClasses(classes: PublicVehicleClass[]): Grouped[] {
  const map: Record<string, Grouped> = {
    saloon: { key: "saloon", title: "Saloons", blurb: "1–3 passengers · discreet, efficient, city-ready.", items: [] },
    estate: { key: "estate", title: "Estates & Wagons", blurb: "Extra luggage room without stepping up to a van.", items: [] },
    mpv: { key: "mpv", title: "People Carriers (MPV)", blurb: "Families, groups and extra bags — travel together.", items: [] },
    van: { key: "van", title: "Vans & Minibuses", blurb: "8 to 16 seats for tours, teams and airport groups.", items: [] },
    coach: { key: "coach", title: "Coaches", blurb: "Large-group touring and events across the UK.", items: [] },
    accessible: { key: "accessible", title: "Accessible", blurb: "Wheelchair-accessible vehicles with ramps and secure fittings.", items: [] },
    electric: { key: "electric", title: "Electric", blurb: "Zero-tailpipe emissions, whisper-quiet cabins.", items: [] },
  };
  for (const c of classes) {
    if (c.slug === "unclassified") continue;
    if (c.slug.startsWith("electric")) map.electric.items.push(c);
    else if (c.slug.includes("wheelchair") || c.wheelchair_accessible) map.accessible.items.push(c);
    else if (c.slug === "coach") map.coach.items.push(c);
    else if (c.slug.includes("van") || c.slug.includes("minibus")) map.van.items.push(c);
    else if (c.slug.includes("mpv")) map.mpv.items.push(c);
    else if (c.slug.includes("estate")) map.estate.items.push(c);
    else map.saloon.items.push(c);
  }
  return Object.values(map).filter((g) => g.items.length > 0);
}

function FleetPage() {
  const { data: classes } = useSuspenseQuery(fleetQuery);
  const groups = groupClasses(classes);
  const featured = classes.filter((c) => c.featured && c.slug !== "unclassified").slice(0, 3);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--navy-foreground)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, var(--gold) 0, transparent 45%), radial-gradient(circle at 85% 80%, #ffffff 0, transparent 40%)",
          }}
        />
        <div className="container-x relative pt-24 md:pt-32 pb-16 md:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
              <Sparkles className="size-3.5" /> The Cabslink Fleet
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-6xl font-semibold leading-[1.05]">
              A vehicle class for every kind of journey.
            </h1>
            <p className="mt-5 text-lg text-[var(--navy-foreground)]/80 max-w-2xl">
              Book by class — Executive, Luxury Chauffeur, Premium MPV and more. Your exact model is
              allocated by our dispatch team, always from your booked class or a complimentary upgrade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-full">
                <Link to="/book">Get a quote <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-transparent text-[var(--navy-foreground)] border-[var(--navy-foreground)]/30 hover:bg-white/10">
                <a href="#classes">Browse classes</a>
              </Button>
            </div>
          </div>

          {/* Featured strip */}
          {featured.length > 0 && (
            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map((c) => {
                const img = fleetImageFor(c.slug, c.hero_image);
                return (
                  <a
                    key={c.id}
                    href={`#${c.slug}`}
                    className="group relative rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm p-4 hover:bg-white/[0.1] transition"
                  >
                    <div className="aspect-[16/10] rounded-xl bg-white/95 overflow-hidden flex items-center justify-center p-3">
                      {img ? (
                        <img src={img} alt={c.name} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Image coming soon</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)]">Featured</p>
                        <p className="mt-0.5 font-display text-lg font-semibold">{c.name}</p>
                      </div>
                      <ArrowRight className="size-4 text-[var(--navy-foreground)]/60 group-hover:translate-x-1 transition" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CLASSES BY GROUP */}
      <section id="classes" className="section-y bg-[var(--background)]">
        <div className="container-x space-y-16 md:space-y-20">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-6 md:mb-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--gold)]">Category</p>
                  <h2 className="mt-1.5 font-display text-3xl md:text-4xl font-semibold text-foreground">{g.title}</h2>
                  <p className="mt-1.5 text-muted-foreground max-w-2xl">{g.blurb}</p>
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? "class" : "classes"}
                </span>
              </div>

              <div className="grid gap-5 md:gap-6 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((c) => (
                  <Reveal key={c.id}>
                    <ClassCard klass={c} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-2">
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

function ClassCard({ klass }: { klass: PublicVehicleClass }) {
  const img = fleetImageFor(klass.slug, klass.hero_image);
  const recs = Object.entries(klass.recommended_for ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RECOMMENDED_LABELS[k] ?? k)
    .slice(0, 3);

  return (
    <article
      id={klass.slug}
      className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-[0_4px_24px_-16px_rgba(14,24,44,0.25)] hover:shadow-[0_16px_40px_-20px_rgba(14,24,44,0.4)] transition-shadow"
    >
      {/* Image plate — light warm surface, generous padding, object-contain */}
      <div className="relative bg-[var(--surface,#f5f2ec)] aspect-[16/10] p-5 md:p-6 flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={`${klass.name} — representative vehicle`}
            width={1400}
            height={900}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full w-auto h-auto object-contain drop-shadow-[0_18px_18px_rgba(14,24,44,0.15)] transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Image coming soon</span>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {klass.badge && (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground,#0e182c)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              {klass.badge}
            </span>
          )}
          {klass.featured && !klass.badge && (
            <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground,#0e182c)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              Featured
            </span>
          )}
          {klass.fuel_type === "electric" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              <Zap className="size-2.5" /> Electric
            </span>
          )}
          {klass.wheelchair_accessible && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              <Accessibility className="size-2.5" /> WAV
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 flex-1 flex flex-col">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">Vehicle Class</p>
        <h3 className="mt-1.5 font-display text-xl md:text-2xl font-semibold text-foreground leading-tight">
          {klass.name}
        </h3>
        {klass.short_description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{klass.short_description}</p>
        )}

        {/* Specs row */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <MiniSpec icon={<Users className="size-3.5" />} label="Pax" value={String(klass.passengers)} />
          <MiniSpec icon={<Briefcase className="size-3.5" />} label="Lg bags" value={String(klass.large_luggage)} />
          <MiniSpec icon={<Luggage className="size-3.5" />} label="Cabin" value={String(klass.cabin_bags)} />
        </div>

        {/* Chips */}
        {recs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {recs.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)]/[0.06] text-[var(--navy)] px-2 py-0.5 text-[11px] font-medium">
                <CheckCircle2 className="size-3 text-[var(--gold)]" /> {r}
              </span>
            ))}
          </div>
        )}

        {/* Models */}
        {klass.models.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Includes models</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {klass.models.slice(0, 3).map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1 text-[11px] text-foreground/80">
                  <Star className="size-2.5 fill-[var(--gold)] text-[var(--gold)]" /> {m.name}
                </span>
              ))}
              {klass.models.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{klass.models.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
          <Button asChild size="sm" variant="gold" className="rounded-full flex-1">
            <Link to="/book">
              {klass.quote_on_request ? "Request quote" : "Book this class"} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/contact"><ShieldCheck className="size-3.5" /></Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function MiniSpec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface,#f5f2ec)] px-2.5 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-[var(--gold)]">{icon}</span> {label}
      </div>
      <div className="mt-0.5 font-semibold text-foreground text-sm">{value}</div>
    </div>
  );
}
