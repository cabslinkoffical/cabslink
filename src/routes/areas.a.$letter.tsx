import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { alphaBucketQuery } from "@/lib/explore.functions";

/** A to Z hubs are indexable only when they list at least this many destinations. */
export const MIN_INDEXABLE_LETTER_COUNT = 8;

export const Route = createFileRoute("/areas/a/$letter")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(alphaBucketQuery(params.letter)),
  head: ({ params, loaderData }) => {
    const L = params.letter.toUpperCase();
    const count = Array.isArray(loaderData) ? loaderData.length : 0;
    const indexable = count >= MIN_INDEXABLE_LETTER_COUNT;
    const path = `/areas/a/${params.letter.toLowerCase()}`;
    return normalizeHead({
      meta: [
        { title: `Locations starting with ${L} — Cabslink` },
        { name: "description", content: `Cabslink destinations starting with the letter ${L}.` },
        { name: "robots", content: indexable ? "index,follow" : "noindex,follow" },
      ],
      links: indexable ? [{ rel: "canonical", href: `https://cabslink.com${path}` }] : [],
    });
  },
  component: LetterPage,
});

function LetterPage() {
  const { letter } = Route.useParams();
  const L = letter.toUpperCase();
  const { data } = useSuspenseQuery(alphaBucketQuery(letter));

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Directory"
        title={`Locations starting with ${L}`}
        subtitle={`Every Cabslink destination beginning with the letter ${L}.`}
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Locations", to: "/areas" },
          { label: L },
        ]}
      />
      <section className="section-y bg-background">
        <div className="container-x">
          {data.length ? (
            <div className="grid gap-8 border-t border-border pt-8 lg:grid-cols-[minmax(13rem,0.7fr)_2fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Directory / {L}</p>
                <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">All locations</h2>
                <p className="mt-2 text-sm text-muted-foreground">{data.length} result{data.length === 1 ? "" : "s"}</p>
              </div>
              <EntityGrid items={data} />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              No destinations here yet. <Link to="/areas" className="underline">Back to directory</Link>.
            </p>
          )}
          <div className="mt-10">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Locations", href: "/areas" },
                { name: L, href: `/areas/a/${letter}` },
              ]}
            />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
