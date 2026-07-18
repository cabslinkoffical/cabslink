import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MapPin, Star, Check, X, Info } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { getPublishedTourBySlug, type PublicTourDetail } from "@/lib/tours.functions";

const tourDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tour-detail", slug],
    queryFn: async () => {
      const detail = await getPublishedTourBySlug({ data: { slug } });
      if (!detail) throw notFound();
      return detail;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/tours/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(tourDetailQuery(params.slug)),
  head: ({ loaderData }) => {
    const d = loaderData as PublicTourDetail | undefined;
    if (!d) {
      return { meta: [{ title: "Tour not found — Cabslink" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${d.name} — Private Chauffeur Tour | Cabslink`;
    const desc = d.short_description ?? `Private chauffeured tour: ${d.origin_label} to ${d.destination_label}. Book with Cabslink.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/tours/${d.slug}` },
    ];
    if (d.hero_image_url) {
      meta.push({ property: "og:image", content: d.hero_image_url });
      meta.push({ name: "twitter:image", content: d.hero_image_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: `/tours/${d.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TouristTrip",
            name: d.name,
            description: desc,
            image: d.hero_image_url ?? undefined,
            touristType: "Private chauffeur tour",
            itinerary: d.pois.map((p) => ({
              "@type": "TouristAttraction",
              name: p.name,
              description: p.short_description ?? undefined,
            })),
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <SiteLayout>
      <div className="container-x section-y text-center">
        <h1 className="font-display text-3xl font-semibold">Tour temporarily unavailable</h1>
        <p className="mt-3 text-muted-foreground">Please refresh the page in a moment.</p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-x section-y text-center">
        <h1 className="font-display text-3xl font-semibold">Tour not found</h1>
        <p className="mt-3 text-muted-foreground">We couldn't find that tour. It may have been renamed or unpublished.</p>
        <div className="mt-6"><Button asChild><Link to="/tours">Browse all tours</Link></Button></div>
      </div>
    </SiteLayout>
  ),
  component: TourDetailPage,
});

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatPrice(pence: number | null, currency: string): string {
  if (pence == null) return "Price on request";
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  return `${symbol}${Math.round(pence / 100).toLocaleString()}`;
}

function TourDetailPage() {
  const { slug } = Route.useParams();
  const { data: d } = useSuspenseQuery(tourDetailQuery(slug));
  const duration = formatDuration(d.direct_duration_seconds);
  const bookHref = `/book?templateSlug=${encodeURIComponent(d.slug)}`;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Private Chauffeur Tour"
        title={d.name}
        subtitle={d.short_description ?? undefined}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours", to: "/tours" }, { label: d.name }]}
      />

      <section className="section-y">
        <div className="container-x grid lg:grid-cols-[1fr_360px] gap-10">
          {/* MAIN */}
          <div>
            {d.hero_image_url && (
              <Reveal>
                <img
                  src={d.hero_image_url}
                  alt={`${d.name} — private chauffeur tour`}
                  className="w-full aspect-[16/9] object-cover rounded-3xl shadow-[var(--shadow-elegant)]"
                  loading="eager"
                  decoding="async"
                />
              </Reveal>
            )}

            <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
              {d.origin_label && d.destination_label && (
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Route</p>
                  <p className="mt-1 font-medium flex items-center gap-1.5"><MapPin className="size-4 text-[var(--gold)]" />{d.origin_label} → {d.destination_label}</p>
                </div>
              )}
              {duration && (
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Driving</p>
                  <p className="mt-1 font-medium flex items-center gap-1.5"><Clock className="size-4 text-[var(--gold)]" />{duration}{d.direct_distance_miles ? ` · ${Math.round(d.direct_distance_miles)} mi` : ""}</p>
                </div>
              )}
              {d.recommended_start_time && (
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Recommended start</p>
                  <p className="mt-1 font-medium">{d.recommended_start_time}</p>
                </div>
              )}
            </div>

            {d.description && (
              <div className="mt-8 prose prose-invert max-w-none">
                <h2 className="font-display text-2xl font-semibold mb-3">About this tour</h2>
                <p className="text-muted-foreground whitespace-pre-line">{d.description}</p>
              </div>
            )}

            {d.pois.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold mb-5">Itinerary highlights</h2>
                <ol className="space-y-4">
                  {d.pois.map((p, i) => (
                    <li key={p.id} className="rounded-2xl border border-white/10 bg-[var(--surface)] overflow-hidden">
                      <div className="flex gap-4">
                        {p.image_url && (
                          <div className="w-32 sm:w-48 shrink-0 bg-black/40">
                            <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover aspect-square" />
                          </div>
                        )}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-widest text-[var(--gold)]">Stop {i + 1}{p.category ? ` · ${p.category}` : ""}</p>
                              <h3 className="font-display text-lg font-semibold mt-0.5">{p.name}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {p.mandatory && <span className="rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-[10px] px-2 py-0.5">Included</span>}
                              {p.featured && !p.mandatory && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-[10px] px-2 py-0.5"><Star className="size-3" /> Popular</span>}
                            </div>
                          </div>
                          {p.short_description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.short_description}</p>}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="size-3" />~{p.recommended_visit_minutes} min</span>
                            {p.admission_note && <span className="inline-flex items-center gap-1"><Info className="size-3" />{p.admission_note}</span>}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(d.included.length > 0 || d.excluded.length > 0) && (
              <div className="mt-10 grid sm:grid-cols-2 gap-6">
                {d.included.length > 0 && (
                  <div className="rounded-2xl border border-white/10 p-5">
                    <h3 className="font-display text-lg font-semibold">What's included</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {d.included.map((x, i) => <li key={i} className="flex items-start gap-2"><Check className="size-4 text-[var(--gold)] mt-0.5 shrink-0" />{x}</li>)}
                    </ul>
                  </div>
                )}
                {d.excluded.length > 0 && (
                  <div className="rounded-2xl border border-white/10 p-5">
                    <h3 className="font-display text-lg font-semibold">Not included</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {d.excluded.map((x, i) => <li key={i} className="flex items-start gap-2"><X className="size-4 mt-0.5 shrink-0" />{x}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {d.seasonal_note && (
              <div className="mt-8 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4 text-sm">
                <p className="flex items-start gap-2"><Info className="size-4 text-[var(--gold)] mt-0.5 shrink-0" /><span>{d.seasonal_note}</span></p>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-6 shadow-[var(--shadow-elegant)]">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Starting price</p>
              <p className="font-display text-4xl font-semibold text-[var(--gold)] mt-1">{formatPrice(d.starting_price_pence, d.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Live pricing — final total shown at checkout after vehicle & stops.</p>

              <Button asChild size="lg" className="w-full mt-5">
                <a href={bookHref}>
                  Continue to booking <ArrowRight className="size-4 ml-1 inline" />
                </a>
              </Button>

              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {d.recommended_stop_count > 0 && <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold)]" />{d.recommended_stop_count} curated stops</li>}
                {duration && <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold)]" />{duration} driving time</li>}
                <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold)]" />Professional chauffeur</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold)]" />Free cancellation options at checkout</li>
              </ul>
            </div>

            {d.related_slugs.length > 0 && (
              <div className="mt-6 rounded-3xl border border-white/10 p-5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Other tours</p>
                <ul className="space-y-2 text-sm">
                  {d.related_slugs.map((s) => (
                    <li key={s}>
                      <Link to="/tours/$slug" params={{ slug: s }} className="inline-flex items-center gap-1 hover:text-[var(--gold)]">
                        <ArrowRight className="size-3.5" /> {s.replace(/-/g, " ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
