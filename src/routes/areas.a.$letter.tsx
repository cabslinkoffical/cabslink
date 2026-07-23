import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EntityGrid } from "@/components/explore/EntityCard";
import { alphaBucketQuery } from "@/lib/explore.functions";

export const Route = createFileRoute("/areas/a/$letter")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(alphaBucketQuery(params.letter)),
  head: ({ params }) => {
    const L = params.letter.toUpperCase();
    return {
      meta: [
        { title: `Locations starting with ${L} — Cabslink` },
        { name: "description", content: `Cabslink destinations starting with the letter ${L}.` },
        { name: "robots", content: "noindex,follow" },
      ],
    };
  },
  component: LetterPage,
});

function LetterPage() {
  const { letter } = Route.useParams();
  const L = letter.toUpperCase();
  const { data } = useSuspenseQuery(alphaBucketQuery(letter));

  return (
    <main className="container-x py-10">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Locations", href: "/areas" },
          { name: L, href: `/areas/a/${letter}` },
        ]}
      />
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">Directory</p>
        <h1 className="mt-2 text-4xl font-bold text-[var(--navy)] sm:text-5xl">Locations starting with {L}</h1>
      </header>
      <div className="mt-8">
        {data.length ? (
          <EntityGrid items={data} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center text-[var(--navy)]/60">
            No destinations here yet. <Link to="/areas" className="underline">Back to directory</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
