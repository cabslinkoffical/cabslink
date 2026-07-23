import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { AlphaBar } from "@/components/explore/AlphaBar";
import { alphaBucketQuery } from "@/lib/explore.functions";

export const Route = createFileRoute("/explore/a/$letter")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(alphaBucketQuery(params.letter)),
  head: ({ params }: { params: { letter: string } }) => {
    const L = (params.letter ?? "").toUpperCase();
    return {
      meta: [
        { title: `Destinations starting with ${L} — Cabslink` },
        { name: "description", content: `Browse Cabslink destinations beginning with the letter ${L}.` },
        { name: "robots", content: "noindex, follow" },
      ],
    };
  },
  component: AlphaPage,
});

function AlphaPage() {
  const { letter } = Route.useParams();
  const { data } = useSuspenseQuery(alphaBucketQuery(letter));
  const L = letter.toUpperCase();

  return (
    <main className="container-x py-10">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Explore", href: "/explore" },
          { name: L, href: `/explore/a/${letter}` },
        ]}
      />
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">A–Z Directory</p>
        <h1 className="mt-2 text-4xl font-bold text-[var(--navy)]">Destinations — {L}</h1>
        <p className="mt-2 text-[var(--navy)]/70">
          {data.length} destination{data.length === 1 ? "" : "s"} starting with {L}.
        </p>
      </header>

      <div className="mt-6">
        <AlphaBar available={"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")} />
      </div>

      <section className="mt-10">
        {data.length ? (
          <EntityGrid items={data} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center text-[var(--navy)]/60">
            No destinations here yet. <Link to="/explore" className="underline">Back to explorer</Link>.
          </p>
        )}
      </section>
    </main>
  );
}
