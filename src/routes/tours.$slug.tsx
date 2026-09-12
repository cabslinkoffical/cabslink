import { useMemo, useState, useDeferredValue } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight, Clock, MapPin, Star, Check, X, Info, Minus, Plus, Loader2,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { TourBookingDialog, type TourForBooking } from "@/components/site/TourBookingDialog";
import { getPublishedTourBySlug, type PublicPoiCard, type PublicTourDetail } from "@/lib/tours.functions";
import { calculateMultiStopQuote } from "@/lib/scenic-quote.functions";
import { DraftTourPage } from "@/components/site/DraftTourPage";
import { draftTour, tourSeo } from "@/lib/seo/tour-seo";


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
  // Omit the key entirely when absent, otherwise every <Link to="/tours/$slug">
  // in the app is forced to pass `search` explicitly.
  validateSearch: (search: Record<string, unknown>): { enquire?: true } =>
    search.enquire === true || search.enquire === "true" || search.enquire === "1"
      ? { enquire: true }
      : {},
  // Code-defined draft tours never hit the CMS query.
  loader: ({ params, context }) =>
    draftTour(params.slug) ? null : context.queryClient.ensureQueryData(tourDetailQuery(params.slug)),


  head: ({ params, loaderData }) => {
    // ---- Code-defined draft tours: noindex until signed off, no Offer schema ----
    const draft = draftTour(params.slug);
    if (draft) {
      const url = `https://cabslink.com/tours/${draft.slug}`;
      return {
        meta: [
          { title: draft.metaTitle },
          { name: "description", content: draft.metaDescription },
          { name: "robots", content: "noindex, nofollow" },
          { property: "og:title", content: draft.metaTitle },
          { property: "og:description", content: draft.metaDescription },
          { property: "og:type", content: "article" },
          { property: "og:url", content: url },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: url }],
        scripts: [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TouristTrip",
              name: draft.h1,
              description: draft.metaDescription,
              touristType: "Private driver tour",
              provider: { "@type": "Organization", name: "CabsLink", url: "https://cabslink.com" },
            }),
          },
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: draft.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          },
        ],
      };
    }

    const d = loaderData as PublicTourDetail | undefined;
    if (!d) {
      return { meta: [{ title: "Tour not found — Cabslink" }, { name: "robots", content: "noindex" }] };
    }

    // The product name in the CMS is editorial; the searched phrase lives in
    // src/lib/seo/tour-seo.ts and owns the title tag, H1 and description.
    const seo = tourSeo(d.slug);
    const shortName = d.name.split(":")[0].trim();
    const title =
      seo?.metaTitle ??
      ([
        `${d.name} — Private Driver Tour | Cabslink`,
        `${d.name} | Cabslink`,
        `${shortName} Private Tour | Cabslink`,
        `${shortName} | Cabslink`,
      ].find((t) => t.length <= 60) ??
        `${shortName.slice(0, 47).replace(/[\s,.;:—-]+\S*$/, "")} | Cabslink`);

    let desc = seo?.metaDescription ?? "";
    if (!desc) {
      // Fallback only for tours with no override yet: CMS blurbs are often a
      // single short line, so top up to the 110-155 window on a word boundary.
      const base = (d.short_description ?? `Private driver tour of ${d.name}.`).trim();
      const extras = [
        d.long_day ? "Full-day itinerary with flexible stop times." : "Flexible stop times at every point of interest.",
        "Door-to-door pickup, quoted before you travel.",
      ];
      desc = base;
      for (const part of extras) {
        if (desc.length >= 110) break;
        if (desc.toLowerCase().includes(part.slice(0, 18).toLowerCase())) continue;
        desc = `${desc.replace(/\.$/, "")}. ${part}`;
      }
      if (desc.length > 155) desc = `${desc.slice(0, 152).replace(/[\s,.;:—-]+\S*$/, "")}…`;
    }


    const url = `https://cabslink.com/tours/${d.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
    ];
    if (d.hero_image_url) {
      meta.push({ property: "og:image", content: d.hero_image_url });
      meta.push({ name: "twitter:image", content: d.hero_image_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],

      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TouristTrip",
            name: seo?.h1 ?? d.name,
            description: desc,
            image: d.hero_image_url ?? undefined,
            touristType: "Private driver tour",
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
  component: TourRoute,
});

/** Draft tours are rendered from code; everything else from the CMS. */
function TourRoute() {
  const { slug } = Route.useParams();
  const draft = draftTour(slug);
  return draft ? <DraftTourPage record={draft} /> : <TourDetailPage />;
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}




function TourDetailPage() {
  const { slug } = Route.useParams();
  const { enquire } = Route.useSearch();

  const { data: d } = useSuspenseQuery(tourDetailQuery(slug));
  const seo = tourSeo(slug);

  // ---- Selection state (mandatory stops are always selected) ----
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    for (const p of d.pois) {
      if (p.default_selected) seed[p.id] = p.recommended_visit_minutes;
    }
    return seed;
  });

  const toggle = (p: PublicPoiCard) => {
    if (p.mandatory) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id] !== undefined) delete next[p.id];
      else next[p.id] = p.recommended_visit_minutes;
      return next;
    });
  };
  const bumpMinutes = (p: PublicPoiCard, delta: number) => {
    setSelected((prev) => {
      const cur = prev[p.id] ?? p.recommended_visit_minutes;
      const next = Math.max(p.minimum_visit_minutes, Math.min(p.maximum_visit_minutes, cur + delta));
      return { ...prev, [p.id]: next };
    });
  };

  // Ordered stops for quote (preserve template stop_order)
  const orderedStops = useMemo(
    () =>
      d.pois
        .filter((p) => selected[p.id] !== undefined)
        .sort((a, b) => a.stop_order - b.stop_order)
        .map((p) => ({
          place_id: p.place_id,
          label: p.name,
          minutes: selected[p.id],
          category: p.category,
        })),
    [d.pois, selected],
  );

  // Debounce the query key to avoid spamming the server on every click.
  const deferredStopsKey = useDeferredValue(
    orderedStops.map((s) => `${s.place_id}:${s.minutes}`).join("|"),
  );

  const multiFn = useServerFn(calculateMultiStopQuote);
  const quoteQuery = useQuery({
    enabled: orderedStops.length > 0 && !!d.origin_place_id && !!d.destination_place_id,
    queryKey: ["tour-quote", d.slug, deferredStopsKey],
    staleTime: 30_000,
    queryFn: () =>
      multiFn({
        data: {
          pickup_place_id: d.origin_place_id,
          pickup_label: d.origin_label ?? d.name,
          destination_place_id: d.destination_place_id,
          destination_label: d.destination_label ?? d.name,
          stops: orderedStops,
          route_mode: "scenic" as const,
        },
      }),
  });

  const totalMinutes = orderedStops.reduce((s, x) => s + x.minutes, 0);
  const drivingSecs = quoteQuery.data?.driving_duration_seconds ?? d.direct_duration_seconds;
  const totalJourneySecs = drivingSecs ? drivingSecs + totalMinutes * 60 : null;

  const tourForBooking: TourForBooking = useMemo(() => {
    const stops = d.pois
      .filter((p) => selected[p.id] !== undefined)
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((p) => ({
        name: p.name,
        time: `${selected[p.id]} min`,
        blurb: p.short_description ?? "",
      }));
    return {
      slug: d.slug,
      name: d.name,
      from: d.origin_label ?? d.name,
      to: d.destination_label ?? d.name,
      duration: formatDuration(d.direct_duration_seconds) ?? "—",
      distance: d.direct_distance_miles ? `${Math.round(d.direct_distance_miles)} mi` : "—",
      fromPrice: "Price on request",
      stops,
    };
  }, [d, selected]);


  const duration = formatDuration(d.direct_duration_seconds);
  const optionalPois = d.pois.filter((p) => !p.mandatory);
  const mandatoryCount = d.pois.filter((p) => p.mandatory).length;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Private Driver Tour"
        title={seo?.h1 ?? d.name}
        subtitle={d.short_description ?? undefined}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours", to: "/tours" }, { label: seo?.h1 ?? d.name }]}
      />

      <section className="section-y">
        <div className="container-x grid lg:grid-cols-[1fr_360px] gap-10">
          {/* MAIN */}
          <div>
            {/* The editorial product name stays on the page as the H2 — the H1
                above carries the phrase people actually search for. */}
            {seo && <h2 className="font-display text-2xl font-semibold mb-5">{d.name}</h2>}
            {d.hero_image_url && (
              <Reveal>
                <img
                  src={d.hero_image_url}
                  alt={`${d.name} — private driver tour`}
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
                  <p className="mt-1 font-medium flex items-center gap-1.5"><MapPin className="size-4 text-[var(--gold-ink)]" />{d.origin_label} → {d.destination_label}</p>
                </div>
              )}
              {duration && (
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Driving</p>
                  <p className="mt-1 font-medium flex items-center gap-1.5"><Clock className="size-4 text-[var(--gold-ink)]" />{duration}{d.direct_distance_miles ? ` · ${Math.round(d.direct_distance_miles)} mi` : ""}</p>
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
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h2 className="font-display text-2xl font-semibold">Customise your itinerary</h2>
                  <p className="text-xs text-muted-foreground">
                    {orderedStops.length} of {d.pois.length} stops selected
                    {mandatoryCount > 0 ? ` · ${mandatoryCount} included` : ""}
                  </p>
                </div>
                <ol className="space-y-4">
                  {d.pois.map((p, i) => {
                    const active = selected[p.id] !== undefined;
                    const minutes = selected[p.id] ?? p.recommended_visit_minutes;
                    return (
                      <li
                        key={p.id}
                        className={`rounded-2xl border overflow-hidden transition-colors ${
                          active ? "border-[var(--gold)]/50 bg-[var(--surface)]" : "border-white/10 bg-[var(--surface)]/60"
                        }`}
                      >
                        <div className="flex gap-4">
                          {p.image_url && (
                            <div className="w-32 sm:w-44 shrink-0 bg-black/40">
                              <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover aspect-square" />
                            </div>
                          )}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-widest text-[var(--gold-ink)]">Stop {i + 1}{p.category ? ` · ${p.category}` : ""}</p>
                                <h3 className="font-display text-lg font-semibold mt-0.5">{p.name}</h3>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {p.mandatory ? (
                                  <span className="rounded-full bg-[var(--gold)]/20 text-[var(--gold-ink)] text-[10px] px-2 py-0.5">Included</span>
                                ) : (
                                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                    <span className="text-[11px] text-muted-foreground">{active ? "In tour" : "Add"}</span>
                                    <input
                                      type="checkbox"
                                      checked={active}
                                      onChange={() => toggle(p)}
                                      className="size-4 accent-[var(--gold)] cursor-pointer"
                                      aria-label={active ? `Remove ${p.name}` : `Add ${p.name}`}
                                    />
                                  </label>
                                )}
                                {p.featured && !p.mandatory && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-[10px] px-2 py-0.5"><Star className="size-3" /> Popular</span>
                                )}
                              </div>
                            </div>
                            {p.short_description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.short_description}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                              {active ? (
                                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5">
                                  <button
                                    type="button"
                                    className="p-1 hover:text-[var(--gold-ink)] disabled:opacity-30"
                                    onClick={() => bumpMinutes(p, -15)}
                                    disabled={minutes <= p.minimum_visit_minutes}
                                    aria-label={`Reduce time at ${p.name}`}
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="min-w-[54px] text-center text-foreground"><Clock className="inline size-3 mr-1" />{minutes} min</span>
                                  <button
                                    type="button"
                                    className="p-1 hover:text-[var(--gold-ink)] disabled:opacity-30"
                                    onClick={() => bumpMinutes(p, 15)}
                                    disabled={minutes >= p.maximum_visit_minutes}
                                    aria-label={`Add time at ${p.name}`}
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1"><Clock className="size-3" />~{p.recommended_visit_minutes} min recommended</span>
                              )}
                              {p.admission_note && <span className="inline-flex items-center gap-1"><Info className="size-3" />{p.admission_note}</span>}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {optionalPois.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">All stops on this tour are included by default.</p>
                )}
              </div>
            )}

            {(d.included.length > 0 || d.excluded.length > 0) && (
              <div className="mt-10 grid sm:grid-cols-2 gap-6">
                {d.included.length > 0 && (
                  <div className="rounded-2xl border border-white/10 p-5">
                    <h3 className="font-display text-lg font-semibold">What's included</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {d.included.map((x, i) => <li key={i} className="flex items-start gap-2"><Check className="size-4 text-[var(--gold-ink)] mt-0.5 shrink-0" />{x}</li>)}
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
                <p className="flex items-start gap-2"><Info className="size-4 text-[var(--gold-ink)] mt-0.5 shrink-0" /><span>{d.seasonal_note}</span></p>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-6 shadow-[var(--shadow-elegant)]">
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Private day tour
                </p>
                {quoteQuery.isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="font-display text-3xl font-semibold text-[var(--gold-ink)] mt-1">
                Price on request
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tell us your date, group size and stops — we'll send a tailored quote.
              </p>


              <Button size="lg" variant="gold" className="w-full mt-5" asChild>
                <Link to="/book/tour" search={{ tour: d.slug }}>
                  Book this tour <ArrowRight className="size-4 ml-1 inline" />
                </Link>
              </Button>

              <TourBookingDialog
                tour={tourForBooking}
                autoOpen={enquire === true}
                trigger={
                  <Button size="lg" variant="outline" className="w-full mt-3">
                    Ask for a tailored quote
                  </Button>
                }
              />


              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold-ink)]" />{orderedStops.length || d.recommended_stop_count} stops selected</li>
                {totalJourneySecs && <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold-ink)]" />~{formatDuration(totalJourneySecs)} total journey</li>}
                <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold-ink)]" />Professional driver</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold-ink)]" />Free cancellation options at checkout</li>
              </ul>
            </div>

            {d.related_slugs.length > 0 && (
              <div className="mt-6 rounded-3xl border border-white/10 p-5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Other tours</p>
                <ul className="space-y-2 text-sm">
                  {d.related_slugs.map((s) => (
                    <li key={s}>
                      <Link to="/tours/$slug" params={{ slug: s }} className="inline-flex items-center gap-1 hover:text-[var(--gold-ink)]">
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
