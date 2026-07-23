import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { BlogPostCard } from "@/components/site/BlogPostCard";
import { listBlogHome } from "@/lib/blog.functions";

const BASE = "https://cabslink.lovable.app";

const homeQuery = queryOptions({
  queryKey: ["blog", "home"],
  queryFn: () => listBlogHome(),
});

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => ({
    meta: [
      { title: "Blog — Airport Transfer & Scotland Travel Guides | Cabslink" },
      { name: "description", content: "Expert guides on UK airport transfers, Scotland day tours, executive travel and city guides. Trusted advice from Cabslink's editorial team." },
      { property: "og:title", content: "Cabslink Blog — Travel Guides & Airport Transfer Tips" },
      { property: "og:description", content: "Expert guides on UK airport transfers, Scotland day tours, executive travel and city guides." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE}/blog` },
    ],
    links: [{ rel: "canonical", href: `${BASE}/blog` }],
  }),
  component: BlogHome,
});

function BlogHome() {
  const { data } = useSuspenseQuery(homeQuery);
  const { latest, featured, pillars, categories } = data;
  const hero = featured[0] ?? latest[0];
  const rest = latest.filter((p) => p.id !== hero?.id);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Content Hub"
        title="Travel guides, airport tips & Scotland stories"
        subtitle="Expert advice from Cabslink's editorial team — everything you need to travel confidently across the UK."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Blog" }]}
      />

      <section className="container-x py-12 md:py-16">
        {/* Featured hero */}
        {hero && (
          <div className="mb-14">
            <Link
              to="/blog/$slug"
              params={{ slug: hero.slug }}
              className="group grid md:grid-cols-2 gap-8 items-center overflow-hidden rounded-3xl border border-[var(--navy)]/10 bg-white"
            >
              {hero.featured_image_url && (
                <div className="aspect-[16/10] md:aspect-auto md:h-full overflow-hidden">
                  <img src={hero.featured_image_url} alt={hero.featured_image_alt ?? hero.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
              )}
              <div className="p-8 md:p-12">
                {hero.category && (
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] font-semibold mb-3">{hero.category.name}</p>
                )}
                <h2 className="font-display text-2xl md:text-4xl font-semibold text-[var(--navy)] leading-tight group-hover:text-[var(--gold)] transition">
                  {hero.title}
                </h2>
                {hero.excerpt && <p className="mt-4 text-[var(--navy)]/70">{hero.excerpt}</p>}
                <p className="mt-6 text-xs text-[var(--navy)]/50">{hero.reading_minutes} min read</p>
              </div>
            </Link>
          </div>
        )}

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="mb-12 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/blog/category/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border border-[var(--navy)]/15 bg-white px-4 py-2 text-sm text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Latest grid */}
        {rest.length > 0 && (
          <>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[var(--navy)] mb-6">Latest articles</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => <BlogPostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {/* Pillars */}
        {pillars.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[var(--navy)] mb-6">Cornerstone guides</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pillars.map((p) => <BlogPostCard key={p.id} post={p} compact />)}
            </div>
          </div>
        )}

        {latest.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 p-12 text-center text-[var(--navy)]/60">
            No articles published yet. Check back soon.
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
