import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Users, Briefcase, Luggage, ArrowRight, ShieldCheck, Star, Accessibility, Zap, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { VehicleAllocationNotice } from "@/components/site/VehicleAllocationNotice";
import { listPublicVehicleClasses, type PublicVehicleClass } from "@/lib/vehicle-classes.functions";

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
      { property: "og:description", content: "Explore Cabslink's vehicle classes — Executive Saloon, Luxury Chauffeur, Premium MPV and more. Book by class, guaranteed allocation." },
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
  const visible = classes.filter((c) => c.slug !== "unclassified");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Fleet"
        title="A vehicle class for every kind of journey."
        subtitle="Book by class — Executive, Luxury Chauffeur, Premium MPV and more. The exact model is allocated by our dispatch team, always from your booked class or a complimentary upgrade."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Fleet" }]}
      />

      <section className="section-y section-cool">
        <div className="container-x">
          <SectionHeader
            eyebrow="Industry-standard classes"
            title="The Cabslink Vehicle Class system"
            subtitle="Every class is professionally driven, fully insured and kept to a single Cabslink standard. Explore the class list below."
            center
          />
        </div>
      </section>

      {visible.map((k, i) => (
        <VehicleClassSection key={k.id} klass={k} alt={i % 2 === 1} />
      ))}

      <section className="section-y bg-[var(--background)]">
        <div className="container-x">
          <div className="rounded-3xl bg-[var(--navy)] text-[var(--navy-foreground)] p-10 md:p-14 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Not sure which class fits?</h2>
            <p className="mt-4 text-[var(--navy-foreground)]/80 max-w-2xl mx-auto">
              Tell us your party size, luggage and journey — we'll recommend the right class and lock in the fare.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Button asChild variant="gold" className="rounded-full"><Link to="/book">Get a quote <ArrowRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="rounded-full bg-transparent text-[var(--navy-foreground)] border-[var(--navy-foreground)]/40 hover:bg-[var(--navy-2)]"><Link to="/contact">Talk to our team</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function VehicleClassSection({ klass, alt }: { klass: PublicVehicleClass; alt: boolean }) {
  const recs = Object.entries(klass.recommended_for ?? {}).filter(([, v]) => v).map(([k]) => RECOMMENDED_LABELS[k] ?? k);
  return (
    <section className={`section-y ${alt ? "section-warm" : "bg-[var(--background)]"}`}>
      <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <Reveal className={alt ? "lg:order-2" : ""}>
          {klass.hero_image ? (
            <img
              src={klass.hero_image}
              alt={`${klass.name} — representative vehicle`}
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-elegant)] bg-[var(--surface-warm)]"
            />
          ) : (
            <div className="rounded-3xl w-full aspect-[4/3] bg-[var(--surface-warm)] grid place-items-center text-muted-foreground">
              Image coming soon
            </div>
          )}
        </Reveal>
        <Reveal delay={120} className={alt ? "lg:order-1" : ""}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Vehicle Class</p>
            {klass.badge && (
              <span className="rounded-full bg-[var(--gold)]/15 text-[var(--gold)] px-2.5 py-0.5 text-[11px] font-semibold">
                {klass.badge}
              </span>
            )}
            {klass.wheelchair_accessible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)]/5 text-[var(--navy)] px-2.5 py-0.5 text-[11px] font-semibold">
                <Accessibility className="size-3" /> Accessible
              </span>
            )}
            {klass.fuel_type === "electric" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold">
                <Zap className="size-3" /> Electric
              </span>
            )}
          </div>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold leading-tight">{klass.name}</h2>
          {klass.short_description && <p className="mt-3 text-muted-foreground italic">{klass.short_description}</p>}
          {klass.long_description && <p className="mt-4 text-foreground/80">{klass.long_description}</p>}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Spec icon={<Users className="size-4" />} label="Passengers">{klass.passengers}</Spec>
            <Spec icon={<Briefcase className="size-4" />} label="Large luggage">{klass.large_luggage}</Spec>
            <Spec icon={<Luggage className="size-4" />} label="Cabin bags">{klass.cabin_bags}</Spec>
            <Spec icon={<ShieldCheck className="size-4" />} label="Child seats">{klass.child_seats_supported ? "Yes" : "—"}</Spec>
            <Spec icon={<Accessibility className="size-4" />} label="Accessible">{klass.wheelchair_accessible ? "Yes" : "—"}</Spec>
            <Spec icon={<Zap className="size-4" />} label="Fuel">{klass.fuel_type.replace(/_/g, " ")}</Spec>
          </div>

          {recs.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Recommended for</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recs.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[12px]">
                    <CheckCircle2 className="size-3 text-[var(--gold)]" /> {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {klass.models.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Representative vehicles</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {klass.models.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)]/5 text-[var(--navy)] px-2.5 py-0.5 text-[12px] font-medium">
                    <Star className="size-3 fill-[var(--gold)] text-[var(--gold)]" /> {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <VehicleAllocationNotice className="mt-6" compact />

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="gold" className="rounded-full">
              <Link to="/book">
                {klass.quote_on_request ? "Request a quote" : "Get a quote"} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/contact">Ask about {klass.name}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Spec({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-[var(--gold)]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-semibold text-foreground text-sm capitalize">{children}</div>
    </div>
  );
}
