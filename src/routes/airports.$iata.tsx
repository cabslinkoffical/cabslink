import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Plane, MapPin, Clock, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { getRelatedSeoLinks } from "@/lib/seo-related.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";
import { listDestinationsByType, type Destination } from "@/lib/destinations.functions";

const ORIGIN = "https://cabslink.com";

export const Route = createFileRoute("/airports/$iata")({
  loader: async ({ params }) => {
    const key = params.iata.toLowerCase();

    // 1) Try CMS SEO page first (published rich page).
    const page = await getPublicSeoPageByPath({ data: { path: `/airports/${key}` } }).catch(() => null);
    if (page) {
      const related = await getRelatedSeoLinks({
        data: { entityType: page.primary_entity_type as any, entityId: page.primary_entity_id },
      }).catch(() => null);
      return { mode: "cms" as const, page, related };
    }

    // 2) Resolve destination row: match by slug OR by meta.iata (case-insensitive).
    const airports: Destination[] = await listDestinationsByType({ data: { type: "airport", tiers: [1, 2, 3] } }).catch(() => [] as Destination[]);
    const matched =
      airports.find((a: Destination) => a.slug === key) ??
      airports.find((a: Destination) => ((a.meta?.iata as string | undefined) ?? "").toLowerCase() === key) ??
      null;

    if (!matched) throw notFound();
    return { mode: "detail" as const, airport: matched, airports };
  },
  head: ({ loaderData }) => {
    if (loaderData?.mode === "cms") return buildSeoHead(loaderData.page, ORIGIN, loaderData.related);
    if (loaderData?.mode === "detail") {
      const a = loaderData.airport;
      const iata = (a.meta?.iata as string | undefined) ?? "";
      const name = a.display_name ?? a.name;
      const title = `${name}${iata && !name.includes(iata) ? ` (${iata})` : ""} Transfers — Fixed-Fare Airport Taxi | Cabslink`;

      const desc = `Private transfers to and from ${name}. Fixed fares, meet & greet, live flight tracking, 24/7 dispatch across the UK.`;
      const canonical = `${ORIGIN}/airports/${a.slug}`;
      const image = (a as { hero_image_url?: string | null }).hero_image_url || null;
      return {
        meta: [
          { title },
          { name: "description", content: desc },
          { property: "og:title", content: title },
          { property: "og:description", content: desc },
          { property: "og:url", content: canonical },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
          { name: "twitter:title", content: title },
          { name: "twitter:description", content: desc },
          ...(image
            ? [
                { property: "og:image", content: image },
                { name: "twitter:image", content: image },
              ]
            : []),
        ],
        links: [{ rel: "canonical", href: canonical }],
      };
    }

    return { meta: [{ title: "Airport not found" }, { name: "robots", content: "noindex" }] };
  },
  component: AirportPage,
  notFoundComponent: () => (
    <SiteLayout>
      <main className="container-x py-24 text-center">
        <h1 className="text-3xl font-bold text-[var(--navy)]">Airport not published yet</h1>
        <p className="mt-3 text-[var(--navy)]/70">We still cover this airport — get a fixed-fare quote in seconds.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/book" className="rounded-full bg-[var(--gold)] px-6 py-3 font-semibold text-[var(--navy)]">Get an instant quote</Link>
          <Link to="/airports" className="rounded-full border border-[var(--navy)]/20 px-6 py-3 font-semibold text-[var(--navy)]">All UK airports</Link>
        </div>
      </main>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <main className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-[var(--navy)]/70 mt-2">{error.message}</p>
      </main>
    </SiteLayout>
  ),
});

function AirportPage() {
  const data = Route.useLoaderData();
  if (data.mode === "cms") return <SeoPageRenderer page={data.page} related={data.related} />;

  const { airport, airports } = data;
  const iata = (airport.meta?.iata as string | undefined) ?? "";
  const name = airport.display_name ?? airport.name;
  const shortName = airport.short_name ?? airport.name.replace(/ Airport$/, "");
  const cityLine = [airport.town, airport.council, airport.region].filter(Boolean).join(", ");
  const others = airports.filter((a: Destination) => a.id !== airport.id).slice(0, 12);

  const features = [
    { icon: Plane, title: "Live flight tracking", desc: "We monitor your flight and adjust pickup for delays or early arrivals — no extra charge." },
    { icon: ShieldCheck, title: "Meet & greet", desc: "Your driver waits inside the terminal with a name board so you're never lost after a long flight." },
    { icon: Clock, title: "24/7 dispatch", desc: "Book any airport transfer, any hour of the day, with fixed fares confirmed instantly." },
    { icon: MapPin, title: "Door-to-door service", desc: "From terminal to your hotel, office or home address anywhere in the UK." },
  ];

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative bg-[var(--navy)] text-white">
        <div className="container-x py-16 md:py-24">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Airports", href: "/airports" },
              { name: shortName, href: "#" },
            ]}
          />
          <div className="mt-6 flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <p className="eyebrow-gold text-[11px]">— Airport Transfers</p>
              <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.05]">
                {shortName} <span className="text-[var(--gold)]">Transfers</span>
              </h1>
              {cityLine && (
                <p className="mt-4 text-white/70 flex items-center gap-2">
                  <MapPin className="size-4" /> {cityLine}
                </p>
              )}
              <p className="mt-4 text-lg text-white/80 max-w-xl">
                Book a private, fixed-fare transfer to or from {name}. Meet & greet, live flight tracking and 24/7
                dispatch across the UK.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/book"
                  search={{ to: name } as any}
                  className="rounded-full bg-[var(--gold)] px-8 py-4 font-semibold text-[var(--navy)] hover:brightness-110"
                >
                  Get an instant quote
                </Link>
                <Link
                  to="/contact"
                  className="rounded-full border border-white/30 px-8 py-4 font-semibold text-white hover:border-[var(--gold)]"
                >
                  Talk to us
                </Link>
              </div>
            </div>
            {iata && (
              <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur px-6 py-5 text-center">
                <p className="text-[10px] uppercase tracking-widest text-white/50">IATA</p>
                <p className="mt-1 font-mono text-4xl font-bold text-[var(--gold)]">{iata}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-y">
        <div className="container-x">
          <p className="eyebrow-gold text-[11px]">— What's included</p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-[var(--navy)]">
            Everything a smooth airport transfer needs.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[var(--navy)]/10 bg-white p-6">
                <f.icon className="size-6 text-[var(--gold-ink)]" />
                <h3 className="mt-4 font-semibold text-[var(--navy)]">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--navy)]/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x">
          <p className="eyebrow-gold text-[11px]">— How it works</p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-[var(--navy)]">
            Book {shortName} transfers in three steps.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Enter your details", d: "Pick your date, time and drop-off address. Get a fixed fare instantly." },
              { n: "02", t: "Confirm your ride", d: "Choose vehicle class and add extras like meet & greet or child seats." },
              { n: "03", t: "Meet your driver", d: `We track your flight and greet you inside ${shortName}'s arrivals hall.` },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-6 border border-[var(--navy)]/10">
                <p className="font-mono text-xs text-[var(--gold-ink)] tracking-widest">{s.n}</p>
                <h3 className="mt-3 font-display text-xl font-semibold text-[var(--navy)]">{s.t}</h3>
                <p className="mt-2 text-sm text-[var(--navy)]/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular use cases */}
      <section className="section-y">
        <div className="container-x">
          <p className="eyebrow-gold text-[11px]">— Who we drive</p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-[var(--navy)]">
            {shortName} transfers for every kind of traveller.
          </h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              "Business travellers needing quiet, on-time executive travel",
              "Families with luggage, prams and child seats sorted in advance",
              "Cruise passengers connecting to and from UK cruise ports",
              "Groups of up to 16 in our V-Class, minibus and coaster fleet",
              "Wedding parties and event guests with coordinated pickups",
              "VIP clients requiring discreet meet & greet and NDA drivers",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 rounded-xl border border-[var(--navy)]/10 bg-white p-4">
                <Check className="size-5 text-[var(--gold-ink)] flex-none" />
                <span className="text-sm text-[var(--navy)]">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Other airports */}
      {others.length > 0 && (
        <section className="section-y bg-[var(--surface-2)]">
          <div className="container-x">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
              <div>
                <p className="eyebrow-gold text-[11px]">— More airports</p>
                <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-[var(--navy)]">
                  Other UK airports we cover.
                </h2>
              </div>
              <Link
                to="/airports"
                className="rounded-full border border-[var(--navy)]/20 px-5 py-2.5 text-sm font-semibold text-[var(--navy)] hover:border-[var(--gold)]"
              >
                View all airports <ArrowRight className="size-3 inline-block" />
              </Link>
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {others.map((a: Destination) => {
                const oi = (a.meta?.iata as string | undefined) ?? "";
                return (
                  <Link
                    key={a.id}
                    to="/airports/$iata"
                    params={{ iata: oi.toLowerCase() || a.slug }}
                    className="rounded-xl border border-[var(--navy)]/10 bg-white p-4 hover:border-[var(--gold)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--navy)]">
                        {a.short_name ?? a.name.replace(/ Airport$/, "")}
                      </span>
                      {oi && <span className="font-mono text-[10px] text-[var(--navy)]/40">{oi}</span>}
                    </div>
                    {a.region && <span className="mt-1 block text-xs text-[var(--navy)]/60">{a.region}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Airport",
            name,
            iataCode: iata || undefined,
            address: cityLine ? { "@type": "PostalAddress", addressLocality: airport.town, addressRegion: airport.region, addressCountry: "GB" } : undefined,
            geo: airport.lat && airport.lng ? { "@type": "GeoCoordinates", latitude: airport.lat, longitude: airport.lng } : undefined,
          }),
        }}
      />
    </SiteLayout>
  );
}
