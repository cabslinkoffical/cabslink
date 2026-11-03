/**
 * The public tour page body, shared by /tours/$slug and the staff draft
 * preview so a draft looks exactly like the page customers will see.
 */
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { useMemo, useState, useDeferredValue } from "react";
import { priceCoverLines } from "@/lib/tour-price-covers";
import { FACT_TEXT } from "@/lib/site-facts";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight, Clock, MapPin, Star, Check, X, Info, Minus, Plus, Loader2,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { TourBookingDialog, type TourForBooking } from "@/components/site/TourBookingDialog";
import type { PublicPoiCard, PublicTourDetail } from "@/lib/tours.functions";
import { calculateMultiStopQuote } from "@/lib/scenic-quote.functions";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { tourSeo } from "@/lib/seo/tour-seo";
import { tourExtras } from "@/content/tour-extras";

/** Markdown-ish list text → clean lines ("- ", "* ", "1. " prefixes dropped). */
function mdLines(md: string): string[] {
  return md.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}




export function TourDetailView({ d, slug, enquire, preview = false }: {
  d: PublicTourDetail;
  slug: string;
  enquire?: boolean;
  /** Staff draft preview: shows a banner; booking still uses only live tours. */
  preview?: boolean;
}) {
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

  // Admin-written lists win over the legacy array columns.
  const included = d.included_md ? mdLines(d.included_md) : d.included;
  const excluded = d.excluded_md ? mdLines(d.excluded_md) : d.excluded;

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
      fromPrice:
        d.starting_price_pence != null
          ? `From £${(d.starting_price_pence / 100).toFixed(0)}`
          : "Price on request",
      stops,
    };
  }, [d, selected]);


  const extras = tourExtras(d.slug, d.duration_hours);
  const allFaqs = [...(extras?.faqs ?? []), ...d.faq];
  const duration = formatDuration(d.direct_duration_seconds);
  const optionalPois = d.pois.filter((p) => !p.mandatory);
  const mandatoryCount = d.pois.filter((p) => p.mandatory).length;

  return (
    <SiteLayout cta={{ heading: <>Ready to <span className="text-gold">book this tour</span>?</>, subtitle: "Choose your date, see the price for your group, then pay securely online.", label: "Book this tour", to: "/book/tour", search: { tour: d.slug }, trackAs: "final_cta_tour" }}>
      {preview && (
        <div role="status" className="sticky top-0 z-50 bg-[var(--gold)] px-4 py-2 text-center text-sm font-semibold text-[var(--navy)]">
          Staff preview — this is how the page will look. {d.published ? "This tour is live." : "This tour is a draft and is not on the website yet."} Booking buttons only work once it is published.
        </div>
      )}
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
                  width={1280}
                  height={720}
                  className="w-full aspect-[16/9] object-cover rounded-3xl shadow-[var(--shadow-elegant)]"
                  loading="eager"
                  decoding="async"
                />
              </Reveal>
            )}

            <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
              {d.origin_label && d.destination_label && (
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Route</p>
                  <p className="mt-1 font-medium flex items-center gap-1.5"><MapPin className="size-4 text-[var(--gold-ink)]" />{d.origin_label} → {d.destination_label}</p>
                </div>
              )}
              {duration && (
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Driving</p>
                  <p className="mt-1 font-medium flex items-center gap-1.5"><Clock className="size-4 text-[var(--gold-ink)]" />{duration}{d.direct_distance_miles ? ` · ${Math.round(d.direct_distance_miles)} mi` : ""}</p>
                </div>
              )}
              {d.recommended_start_time && (
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Recommended start</p>
                  <p className="mt-1 font-medium">{d.recommended_start_time}</p>
                </div>
              )}
            </div>

            <DirectAnswer
              className="mt-6"
              sentences={[
                `${seo?.h1 ?? d.name} is a private${d.duration_hours ? ` ${d.duration_hours}-hour` : ""} day tour${d.origin_label ? ` from ${d.origin_label}` : ""}${d.pois.length ? `, stopping at ${d.pois.filter((p) => p.default_selected).slice(0, 3).map((p) => p.name).join(", ") || d.pois.slice(0, 3).map((p) => p.name).join(", ")}` : ""}.`,
                d.starting_price_pence != null
                  ? `Prices start from £${(d.starting_price_pence / 100).toFixed(0)} per vehicle with your driver included.`
                  : "Your price is confirmed before you pay.",
              ]}
              updated={d.updated_at}
            />

            {d.description && (
              <div className="mt-8 prose max-w-none">
                <h2 className="font-display text-2xl font-semibold mb-3">What is this tour about?</h2>
                <p className="text-muted-foreground whitespace-pre-line">{d.description}</p>
              </div>
            )}

            {extras?.sections.map((s) => (
              <section key={s.heading} className="mt-10">
                <h2 className="font-display text-2xl font-semibold mb-3">{s.heading}</h2>
                <div className="space-y-3">
                  {s.body.map((p) => (
                    <p key={p} className="text-muted-foreground leading-relaxed">{p}</p>
                  ))}
                </div>
                {s.points && s.points.length > 0 && (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {s.points.map((pt) => (
                      <li key={pt.title} className="rounded-2xl border border-border p-4">
                        <h3 className="font-display text-base font-semibold flex items-center gap-1.5"><MapPin className="size-4 text-[var(--gold-ink)]" />{pt.title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{pt.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}


            {(d.duration_hours != null || d.direct_distance_miles != null) && (
              <dl className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
                {d.duration_hours != null && (
                  <div className="rounded-2xl border border-border p-4">
                    <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Duration</dt>
                    <dd className="mt-1 font-display text-xl font-semibold">{d.duration_hours} hours</dd>
                  </div>
                )}
                {d.direct_distance_miles != null && (
                  <div className="rounded-2xl border border-border p-4">
                    <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Distance</dt>
                    <dd className="mt-1 font-display text-xl font-semibold">~{Math.round(d.direct_distance_miles)} miles</dd>
                  </div>
                )}
              </dl>
            )}

            {d.itinerary_md && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold mb-4">What does the day look like?</h2>
                <ol className="space-y-3">
                  {mdLines(d.itinerary_md).map((line, i) => {
                    const m = line.match(/^(\d{1,2}[:.]\d{2}(?:\s?[ap]m)?)\s*[-–—:]\s*(.+)$/i);
                    return (
                      <li key={i} className="flex gap-4 rounded-2xl border border-border p-4 text-sm">
                        {m && <span className="w-16 shrink-0 font-semibold text-[var(--gold-ink)] tabular-nums">{m[1]}</span>}
                        <span className="text-muted-foreground">{m ? m[2] : line}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {d.suits_md && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold mb-3">Who is this tour for?</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {mdLines(d.suits_md).map((x, i) => <li key={i} className="flex items-start gap-2"><Check className="size-4 text-[var(--gold-ink)] mt-0.5 shrink-0" />{x}</li>)}
                </ul>
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
                          active ? "border-[var(--gold)]/50 bg-[var(--surface)]" : "border-border bg-[var(--surface)]/60"
                        }`}
                      >
                        <div className="flex gap-4">
                          {p.image_url && (
                            <div className="w-32 sm:w-44 shrink-0 bg-navy/40">
                              <img src={p.image_url} alt={p.name} width={176} height={176} loading="lazy" decoding="async" className="w-full h-full object-cover aspect-square" />
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
                                  <label className="inline-flex min-h-11 items-center gap-2 cursor-pointer select-none px-1">
                                    <span className="text-[11px] text-muted-foreground">{active ? "In tour" : "Add"}</span>
                                    <input
                                      type="checkbox"
                                      checked={active}
                                      onChange={() => toggle(p)}
                                      className="size-5 shrink-0 accent-[var(--gold)] cursor-pointer"
                                      aria-label={active ? `Remove ${p.name}` : `Add ${p.name}`}
                                    />
                                  </label>
                                )}
                                {p.featured && !p.mandatory && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--navy)]/[0.06] text-[10px] px-2 py-0.5"><Star className="size-3" /> Popular</span>
                                )}
                              </div>
                            </div>
                            {p.short_description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.short_description}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                              {active ? (
                                <div className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                                  <button
                                    type="button"
                                    className="grid size-10 place-items-center hover:text-[var(--gold-ink)] disabled:opacity-30"
                                    onClick={() => bumpMinutes(p, -15)}
                                    disabled={minutes <= p.minimum_visit_minutes}
                                    aria-label={`Reduce time at ${p.name}`}
                                  >
                                    <Minus className="size-4" />
                                  </button>
                                  <span className="min-w-[54px] text-center text-foreground"><Clock className="inline size-3 mr-1" />{minutes} min</span>
                                  <button
                                    type="button"
                                    className="grid size-10 place-items-center hover:text-[var(--gold-ink)] disabled:opacity-30"
                                    onClick={() => bumpMinutes(p, 15)}
                                    disabled={minutes >= p.maximum_visit_minutes}
                                    aria-label={`Add time at ${p.name}`}
                                  >
                                    <Plus className="size-4" />
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

            {(included.length > 0 || excluded.length > 0) && (
              <div className="mt-10 grid sm:grid-cols-2 gap-6">
                {included.length > 0 && (
                  <div className="rounded-2xl border border-border p-5">
                    <h3 className="font-display text-lg font-semibold">What's included</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {included.map((x, i) => <li key={i} className="flex items-start gap-2"><Check className="size-4 text-[var(--gold-ink)] mt-0.5 shrink-0" />{x}</li>)}
                    </ul>
                  </div>
                )}
                {excluded.length > 0 && (
                  <div className="rounded-2xl border border-border p-5">
                    <h3 className="font-display text-lg font-semibold">Not included</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {excluded.map((x, i) => <li key={i} className="flex items-start gap-2"><X className="size-4 mt-0.5 shrink-0" />{x}</li>)}
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

            {d.class_prices.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold mb-3">How much does this tour cost?</h2>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground"><th className="p-3">Vehicle</th><th className="p-3 text-right">Fixed price</th></tr></thead>
                    <tbody>
                      {d.class_prices.map((c) => (
                        <tr key={c.class_id} className="border-t border-border">
                          <td className="p-3">{c.name}</td>
                          <td className="p-3 text-right font-semibold tabular-nums">£{(c.price_pence / 100).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Per vehicle for {d.duration_hours} hours, driver included. Extra stops or time are priced before you pay.</p>
              </div>
            )}

            {allFaqs.length > 0 && (
              <div className="mt-10"><FaqBlock items={allFaqs} /></div>
            )}

            {d.reviews.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold mb-4">What do guests say?</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {d.reviews.map((r, i) => (
                    <li key={i} className="rounded-2xl border border-border p-5 text-sm">
                      <p className="text-[var(--gold-ink)]" aria-label={`${r.stars} out of 5 stars`}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</p>
                      <p className="mt-2 text-muted-foreground">{r.text}</p>
                      <p className="mt-3 text-xs">
                        <span className="font-semibold">{r.name}</span> · {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        {r.source_url && <> · <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="underline">Source</a></>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10 rounded-2xl border border-border p-5 text-sm">
              <h2 className="font-display text-lg font-semibold mb-2">Booking terms</h2>
              <p className="text-muted-foreground">{FACT_TEXT.tourCancellation}</p>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-[var(--surface)] p-6 shadow-[var(--shadow-elegant)]">
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Private day tour
                </p>
                {quoteQuery.isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="font-display text-3xl font-semibold text-[var(--gold-ink)] mt-1">
                {d.starting_price_pence != null
                  ? `From £${(d.starting_price_pence / 100).toFixed(0)}`
                  : "Price on request"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {d.starting_price_pence != null
                  ? "Per vehicle, driver included. Your final price is confirmed before you pay."
                  : "Tell us your date, group size and stops — we'll send a tailored quote."}
              </p>
              {d.starting_price_pence != null && d.price_covers && (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--navy)]/70">What the price covers</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--navy)]/80">
                    {priceCoverLines(d.price_covers).map((line) => (
                      <li key={line.text} className="flex items-start gap-2">
                        {line.covered
                          ? <Check className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" aria-hidden="true" />
                          : <Minus className="mt-0.5 size-4 shrink-0 text-[var(--navy)]/60" aria-hidden="true" />}
                        {line.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}



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
                <li className="flex items-center gap-2"><Check className="size-4 text-[var(--gold-ink)]" />{FACT_TEXT.tourCancellationShort}</li>
              </ul>
            </div>

          </aside>
        </div>
      </section>
      <RelatedLinks />
    </SiteLayout>
  );
}
