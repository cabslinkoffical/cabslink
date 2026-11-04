import { RelatedLinks } from "@/components/site/RelatedLinks";
import { normalizeHead } from "@/lib/seo/page-head";
import { useMemo, useState, useDeferredValue } from "react";
import { priceCoverLines } from "@/lib/tour-price-covers";
import { FACT_TEXT } from "@/lib/site-facts";
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
import { TourDetailView } from "@/components/site/TourDetailView";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { DirectAnswer } from "@/components/seo/DirectAnswer";

/** Markdown-ish list text → clean lines ("- ", "* ", "1. " prefixes dropped). */
function mdLines(md: string): string[] {
  return md.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
}
import { draftTour } from "@/lib/seo/tour-seo";
import { tourMetaDescription, tourMetaTitle } from "@/lib/seo/tour-meta";
import { tourExtras } from "@/content/tour-extras";
import { BUSINESS_ID } from "@/lib/seo/business-graph";


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
      return normalizeHead({
        meta: [
          { title: draft.metaTitle },
          { name: "description", content: draft.metaDescription },
          { name: "robots", content: "noindex, nofollow" },
          { property: "og:title", content: draft.metaTitle },
          { property: "og:description", content: draft.metaDescription },
          { property: "og:type", content: "website" },
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
              provider: { "@id": BUSINESS_ID },
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
      });
    }

    const d = loaderData as PublicTourDetail | undefined;
    if (!d) {
      return normalizeHead({ meta: [{ title: "Tour not found — Cabslink" }, { name: "robots", content: "noindex" }] });
    }

    // The product name in the CMS is editorial; the searched phrase lives in
    // src/lib/seo/tour-seo.ts. Shared with the staff Google preview.
    const title = tourMetaTitle(d);
    const desc = tourMetaDescription(d);

    const url = `https://cabslink.com/tours/${d.slug}`;
    const allFaqs = [...(tourExtras(d.slug, d.duration_hours)?.faqs ?? []), ...d.faq];
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
    ];
    if (d.hero_image_url) {
      meta.push({ property: "og:image", content: d.hero_image_url });
      meta.push({ name: "twitter:image", content: d.hero_image_url });
    }
    return normalizeHead({
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
            provider: { "@id": "https://cabslink.com/#business" },
            url,
            itinerary: {
              "@type": "ItemList",
              itemListElement: d.pois.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: { "@type": "TouristAttraction", name: p.name, description: p.short_description ?? undefined },
              })),
            },
            // Only the "From £" price the page itself shows.
            offers: d.starting_price_pence != null
              ? {
                  "@type": "Offer",
                  price: (d.starting_price_pence / 100).toFixed(2),
                  priceCurrency: "GBP",
                  availability: "https://schema.org/InStock",
                  url,
                }
              : undefined,
          }),
        },
        ...(allFaqs.length
          ? [{
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: allFaqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              }),
            }]
          : []),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
              { "@type": "ListItem", position: 2, name: "Tours", item: "https://cabslink.com/tours" },
              { "@type": "ListItem", position: 3, name: seo?.h1 ?? d.name, item: url },
            ],
          }),
        },
      ],
    });
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

function TourDetailPage() {
  const { slug } = Route.useParams();
  const { enquire } = Route.useSearch();
  const { data: d } = useSuspenseQuery(tourDetailQuery(slug));
  return <TourDetailView d={d} slug={slug} enquire={enquire} />;
}
