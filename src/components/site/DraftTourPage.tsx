/**
 * Renderer for code-defined draft tour pages (`DRAFT_TOURS` in
 * src/lib/seo/tour-seo.ts). These are awaiting owner sign-off, so they are
 * served noindex and kept out of the sitemap by the route.
 *
 * No pricing is rendered: tour prices are unresolved and must not be invented.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Info } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import type { DraftTourRecord } from "@/lib/seo/tour-seo";

export function DraftTourPage({ record }: { record: DraftTourRecord }) {
  return (
    <SiteLayout>
      <PageHero
        eyebrow={record.eyebrow}
        title={record.h1}
        subtitle={record.intro[0]}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours", to: "/tours" }, { label: record.h1 }]}
      />

      <section className="section-y">
        <div className="container-x grid lg:grid-cols-[1fr_340px] gap-10">
          <div>
            {/* Product name stays the H2 — the H1 carries the searched phrase. */}
            <h2 className="font-display text-2xl font-semibold">{record.productName}</h2>

            <div className="mt-5 space-y-4 text-muted-foreground">
              {record.intro.slice(1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
              {record.facts.map((f) => (
                <div key={f.label} className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{f.label}</p>
                  <p className="mt-1 font-medium">{f.value}</p>
                </div>
              ))}
            </div>

            {record.sections.map((s) => (
              <Reveal key={s.heading}>
                <div className="mt-10">
                  <h2 className="font-display text-2xl font-semibold">{s.heading}</h2>
                  <div className="mt-3 space-y-4 text-muted-foreground">
                    {s.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm">
                      {s.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="size-4 text-[var(--gold-ink)] mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.links && s.links.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {s.links.map((l) => (
                        <li key={l.to}>
                          <a
                            href={l.to}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-sm hover:border-[var(--gold)]/50 hover:text-[var(--gold-ink)]"
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            ))}

            <div className="mt-12">
              <h2 className="font-display text-2xl font-semibold">Questions people ask</h2>
              <dl className="mt-4 space-y-4">
                {record.faqs.map((f) => (
                  <div key={f.q} className="rounded-2xl border border-white/10 p-5">
                    <dt className="font-medium">{f.q}</dt>
                    <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-6 shadow-[var(--shadow-elegant)]">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Private day tour</p>
              <p className="font-display text-3xl font-semibold text-[var(--gold-ink)] mt-1">Price on request</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mileage, hours and any overnight arrangements change the figure, so we quote each trip
                individually rather than publish an estimate.
              </p>
              <Button asChild size="lg" className="w-full mt-5">
                <Link to="/contact">
                  Request a quote <ArrowRight className="size-4 ml-1 inline" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full mt-3">
                <Link to="/tours">Browse all tours</Link>
              </Button>
            </div>

            {record.related.length > 0 && (
              <div className="mt-6 rounded-3xl border border-white/10 p-5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Related pages</p>
                <ul className="space-y-2 text-sm">
                  {record.related.map((r) => (
                    <li key={r.to}>
                      <a href={r.to} className="inline-flex items-center gap-1 hover:text-[var(--gold-ink)]">
                        <ArrowRight className="size-3.5" /> {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              Distances and driving times are typical road figures without stops; traffic and weather change them.
            </p>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
