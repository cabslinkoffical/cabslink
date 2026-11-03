import { RelatedLinks } from "@/components/site/RelatedLinks";
import type React from "react";
/**
 * Shared renderer for every destination-typed route.
 *
 * The route file only supplies the loader key; this component pulls the
 * template config, runs the content engine, and renders sections in the
 * template's declared order. No route file needs to know section-level
 * details — one page pattern for all 15 destination types.
 */
import { type Crumb } from "@/components/seo/Breadcrumbs";
import { DestinationSections } from "@/components/seo/DestinationSections";
import { buildSections } from "@/lib/seo/content-engine";
import { getTemplate } from "@/lib/seo/template-registry";
import { evaluateQuality } from "@/lib/seo/quality";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LocalPageHero } from "@/components/site/LocalPageHero";
import { LocalMapSection } from "@/components/site/LocalMapSection";
import { defaultLocalImage, destinationPrefill } from "@/lib/local-page";
import { MapPin, Clock, Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFromFare } from "@/lib/from-fare.functions";
import { estimateDrive, fmtMins } from "@/lib/drive-estimate";

export { loadDestination, buildBreadcrumbs, type LoadedDestination } from "@/lib/destination-loader";
import type { LoadedDestination } from "@/lib/destination-loader";

/** Reference points for journey estimates (city-centre coordinates). */
const ORIGINS = [
  { name: "Edinburgh city centre", lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow city centre", lat: 55.8609, lng: -4.2514 },
];

export { estimateDrive };

export function DestinationPage({
  data,
  breadcrumbs,
  appendix,
}: {
  data: LoadedDestination;
  breadcrumbs: Crumb[];
  /** Phase 7 guide text rendered below all existing content. */
  appendix?: React.ReactNode;
}) {
  const d = data.destination;
  const tpl = getTemplate(d.type);
  const quality = evaluateQuality(d);
  // Generic service definitions are dropped: they read as boilerplate.
  const allSections = buildSections(data, tpl.sections.filter((k) => k !== "related_services"));
  // The summary paragraph sits beside the page photo; the rest follow below.
  const summary = allSections.find((s) => s.key === "summary");
  const sections = allSections.filter((s) => s.key !== "summary");
  const summarySentences = summary && "sentences" in summary ? (summary.sentences as string[]) : [];
  const name = d.display_name ?? d.name;
  const place = [d.town, d.council, d.region].filter(Boolean).join(" · ");
  const image = (d as { hero_image_url?: string | null }).hero_image_url ?? null;
  const hasGeo = typeof d.lat === "number" && typeof d.lng === "number";
  const drives = hasGeo
    ? ORIGINS.map((o) => ({ from: o.name, ...estimateDrive(d.lat as number, d.lng as number, o) }))
    : [];
  const fare = useQuery({
    queryKey: ["from-fare", d.lat, d.lng],
    queryFn: () => getFromFare({ data: { lat: d.lat as number, lng: d.lng as number } }),
    enabled: hasGeo,
    staleTime: 10 * 60_000,
  }).data;

  const heroFacts = [
    ...(place ? [{ label: "Location", value: place }] : []),
    ...(fare
      ? [{ label: "From Edinburgh", value: `${fare.symbol}${fare.amount} · ${fare.vehicle}` }]
      : []),
  ];

  return (
    <SiteLayout cta={{ heading: <>Travel to <span className="text-gold">{name}</span></>, label: `Get a price to ${name}`, href: "#booking", trackAs: "final_cta_destination", subtitle: "Your journey details are already in the booking form above. Check the fixed price before you pay, or call our team any time." }}>
      <LocalPageHero
        breadcrumbs={breadcrumbs}
        eyebrow={d.type === "airport" ? "Airport transfers" : "Private transfers"}
        title={name}
        titleAccent="transfers"
        subtitle={`Private, pre-booked car to or from ${name}. Fixed fare confirmed before you pay, with a professional driver collecting you at the pickup address you choose.`}
        facts={heroFacts}
        prefill={destinationPrefill(d.type, name)}
        mapFocus={hasGeo ? { lat: d.lat as number, lng: d.lng as number, label: name } : null}
        image={image ?? defaultLocalImage(d.type)}
        imageAlt={`Cabslink ${name} transfers`}
        imageCaption={`${name} · private transfers & airport travel`}
        intro={{
          eyebrow: place || undefined,
          heading: `Getting to ${name}`,
          body: summarySentences.length
            ? summarySentences.map((p, i) => <p key={i}>{p}</p>)
            : <p>{`Book a private car to or from ${name} with a fixed fare confirmed before you pay.`}</p>,
          details: [
            ...drives.map((j) => ({
              icon: Clock,
              label: `From ${j.from}`,
              value: `approx. ${fmtMins(j.mins)} · ${j.miles} miles`,
              note: "Estimate — traffic varies. Your quote shows the exact route.",
            })),
            {
              icon: Car,
              label: "Pickup",
              value: "At the exact address or entrance you enter when booking.",
              note: "Add notes (gate, door, flight number) at checkout.",
            },
          ],
        }}
      />

      {quality.effectiveNoindex && d.seo_tier !== 2 && (
        <div className="container-x pt-6">
          <div className="rounded-xl border border-warning/40 bg-warning/12 px-4 py-3 text-sm text-[var(--gold-ink)]">
            This page is not indexed by search engines yet — it is missing required data.
          </div>
        </div>
      )}

      {/* Bands sit directly in <main> so the shared white / cream rhythm applies. */}
      <DestinationSections sections={sections} loaded={data}>{appendix}</DestinationSections>
      <LocalMapSection focus={hasGeo ? { lat: d.lat as number, lng: d.lng as number, label: name } : null} />
      <RelatedLinks center={typeof d.lat === "number" && typeof d.lng === "number" ? { lat: d.lat, lng: d.lng } : null} />
    </SiteLayout>
  );
}
