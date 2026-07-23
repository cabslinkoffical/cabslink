import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicSeoPageByPath } from "@/lib/seo-public.functions";
import { getRelatedSeoLinks } from "@/lib/seo-related.functions";
import { SeoPageRenderer, buildSeoHead } from "@/components/seo/SeoPageRenderer";
import { listDestinationsByType } from "@/lib/destinations.functions";

const ORIGIN = "https://cabslink.lovable.app";

// Map common IATA codes → destination slugs so /airports/edi still resolves.
const IATA_TO_SLUG: Record<string, string> = {
  edi: "edinburgh-airport",
  gla: "glasgow-airport",
  abz: "aberdeen-airport",
  inv: "inverness-airport",
  pik: "prestwick-airport",
  dnd: "dundee-airport",
};

export const Route = createFileRoute("/airports/$iata")({
  loader: async ({ params }) => {
    const iata = params.iata.toLowerCase();
    const page = await getPublicSeoPageByPath({ data: { path: `/airports/${iata}` } }).catch(() => null);
    if (page) {
      const related = await getRelatedSeoLinks({
        data: { entityType: page.primary_entity_type as any, entityId: page.primary_entity_id },
      }).catch(() => null);
      return { page, related, fallback: null };
    }
    // Fallback: friendly landing with links to every Scottish airport we cover.
    const airports = await listDestinationsByType({ data: { type: "airport", tiers: [1, 2, 3] } }).catch(() => []);
    const matched = airports.find((a) => a.slug === IATA_TO_SLUG[iata] || a.slug === iata) ?? null;
    return { page: null, related: null, fallback: { iata: iata.toUpperCase(), airports, matched } };
  },
  head: ({ loaderData }) => {
    if (loaderData?.page) return buildSeoHead(loaderData.page, ORIGIN, loaderData.related);
    const name = loaderData?.fallback?.matched?.display_name ?? loaderData?.fallback?.matched?.name ?? `${loaderData?.fallback?.iata ?? "UK"} Airport`;
    const title = `${name} Transfers — CabsLink`;
    const desc = `Private airport transfers to and from ${name}. 24/7 UK-wide, meet & greet, fixed fares.`;
    return { meta: [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
    ] };
  },
  component: AirportPage,
  errorComponent: ({ error }) => (
    <main className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">{error.message}</p>
    </main>
  ),
});

function AirportPage() {
  const { page, related, fallback } = Route.useLoaderData();
  if (page) return <SeoPageRenderer page={page} related={related} />;
  const f = fallback!;
  const title = f.matched?.display_name ?? f.matched?.name ?? `${f.iata} Airport Transfers`;
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold text-[var(--navy)]">{title}</h1>
      <p className="mt-3 max-w-2xl text-[var(--navy)]/70">
        Book a private transfer to or from {f.matched?.name ?? "this airport"}. Fixed
        fares, meet & greet, 24/7 dispatch across the UK.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/book"
          search={{ to: f.matched?.name ?? `${f.iata} Airport` } as any}
          className="rounded-full bg-[var(--gold)] px-6 py-3 font-semibold text-[var(--navy)]"
        >
          Get an instant quote
        </Link>
        <Link
          to="/contact"
          className="rounded-full border border-[var(--navy)]/20 px-6 py-3 font-semibold text-[var(--navy)]"
        >
          Talk to us
        </Link>
      </div>

      {f.airports.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold text-[var(--navy)]">All UK airports we cover</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {f.airports.map((a: typeof f.airports[number]) => (
              <li key={a.id}>
                <Link
                  to="/areas/$slug"
                  params={{ slug: a.slug }}
                  className="block rounded-xl border border-[var(--navy)]/10 bg-white p-4 hover:border-[var(--gold)]"
                >
                  <span className="font-medium text-[var(--navy)]">{a.display_name ?? a.name}</span>
                  {a.region && <span className="block text-xs text-[var(--navy)]/60">{a.region}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
