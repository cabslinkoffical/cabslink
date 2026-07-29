import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { searchDestinations } from "@/lib/destinations.functions";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteLayout } from "@/components/site/SiteLayout";

type Result = Awaited<ReturnType<typeof searchDestinations>>[number];

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: ({ match }) => {
    const q = (match.search as { q?: string }).q ?? "";
    const title = q ? `Search: ${q} — CabsLink` : "Search — CabsLink";
    return {
      meta: [
        { title },
        { name: "description", content: "Search every UK destination CabsLink covers." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const initial = Route.useSearch().q;
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function run(query: string) {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await searchDestinations({ data: { q: query, limit: 30 } });
      setResults(res);
    } finally { setLoading(false); }
  }

  return (
    <SiteLayout>
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Search", href: "/search" }]} />
      <h1 className="mt-4 mb-6 text-4xl font-bold text-[var(--navy)]">Search destinations</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); run(q); }}
        className="mb-8 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type an area, airport, station, attraction…"
          className="flex-1 rounded-full border border-[var(--navy)]/20 bg-white px-5 py-3 text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
        <button className="rounded-full bg-[var(--navy)] px-6 py-3 font-semibold text-white hover:bg-[var(--navy)]/90">
          Search
        </button>
      </form>

      {loading && <p className="text-[var(--navy)]/60">Searching…</p>}

      {!loading && results.length === 0 && q && (
        <p className="text-[var(--navy)]/60">No matches. Try a broader term.</p>
      )}

      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id} className="rounded-xl border border-[var(--navy)]/10 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-[var(--navy)]">{r.display_name ?? r.name}</div>
                <div className="text-xs uppercase tracking-wide text-[var(--navy)]/60">
                  {r.type.replace(/_/g, " ")}
                  {r.region ? ` · ${r.region}` : ""}
                </div>
              </div>
              {r.hasPage ? (
                <Link
                  to={r.href}
                  className="rounded-full border border-[var(--navy)]/20 px-4 py-1.5 text-sm font-medium text-[var(--navy)] hover:border-[var(--gold)]"
                >
                  View page
                </Link>
              ) : (
                <a
                  href={`/book?to=${encodeURIComponent(r.display_name ?? r.name)}`}
                  className="rounded-full bg-[var(--gold)] px-4 py-1.5 text-sm font-semibold text-[var(--navy)]"
                >
                  Book to here
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
    </SiteLayout>
  );
}
