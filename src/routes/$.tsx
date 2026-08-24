/**
 * Catch-all 404.
 *
 * Without this splat route an unmatched URL fell through to the closest
 * matching parent, so `/services/anything` answered with the Services page
 * title and metadata. This route owns every unmatched path, returns a real
 * 404 status, and serves a single-H1, `noindex` page.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/$")({
  loader: () => {
    throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Page not found (404) — Cabslink" },
      { name: "description", content: "This Cabslink page doesn't exist or has moved. Browse our transfer services, airports and locations instead." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Page not found (404) — Cabslink" },
      { property: "og:description", content: "This Cabslink page doesn't exist or has moved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: NotFound,
  component: NotFound,
});

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "All services" },
  { to: "/airport-transfers", label: "Airport transfers" },
  { to: "/areas", label: "Areas we cover" },
  { to: "/tours", label: "Private tours" },
  { to: "/contact", label: "Contact us" },
];

function NotFound() {
  return (
    <SiteLayout hideLocations hideSocial>
      <section className="container-x py-20 md:py-28 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold-ink)]">Error 404</p>
        <h1 className="mt-3 font-display text-3xl md:text-5xl font-bold">This page doesn&apos;t exist</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm md:text-base text-muted-foreground">
          The link may be out of date or mistyped. Here are the pages people usually want.
        </p>
        <nav aria-label="Helpful links" className="mt-8 flex flex-wrap justify-center gap-2.5">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-[var(--gold)] hover:text-[var(--gold-ink)] transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </section>
    </SiteLayout>
  );
}
