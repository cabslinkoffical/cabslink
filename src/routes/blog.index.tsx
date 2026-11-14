import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { BlogPostCard } from "@/components/site/BlogPostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBlogHome } from "@/lib/blog.functions";
import { collectionPageSchema } from "@/components/seo/schema";

const BASE = "https://cabslink.com";

const homeQuery = queryOptions({
  queryKey: ["blog", "home"],
  queryFn: () => listBlogHome(),
});

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => normalizeHead({
    meta: [
      { title: "Travel Guides & Airport Transfer Tips | Cabslink" },
      { name: "description", content: "Expert guides on UK airport transfers, Scotland day tours, executive travel and city guides. Trusted advice from Cabslink's editorial team." },
      { property: "og:title", content: "Cabslink Blog — Travel Guides & Airport Transfer Tips" },
      { property: "og:description", content: "Expert guides on UK airport transfers, Scotland day tours, executive travel and city guides." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: `${BASE}/blog` },
    ],
    links: [{ rel: "canonical", href: `${BASE}/blog` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          collectionPageSchema({
            name: "Cabslink Blog — Travel Guides & Airport Transfer Tips",
            description: "Expert guides on UK airport transfers, Scotland day tours, executive travel and city guides.",
            url: "/blog",
            breadcrumbs: [{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }],
          }),
        ),
      },
    ],
  }),
  component: BlogHome,
});

function BlogHome() {
  const { data } = useSuspenseQuery(homeQuery);
  const { latest, featured, pillars, categories } = data;
  const hero = featured[0] ?? latest[0];
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  const matches = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (p: (typeof latest)[number]) => {
      if (category && p.category?.slug !== category) return false;
      if (!words.length) return true;
      const haystack = [p.title, p.subtitle, p.excerpt, p.category?.name].filter(Boolean).join(" ").toLowerCase();
      return words.every((w) => haystack.includes(w));
    };
  }, [q, category]);

  const rest = latest.filter((p) => p.id !== hero?.id && matches(p));
  const shownPillars = pillars.filter(matches);
  const filtering = !!q.trim() || !!category;

  return (
    <SiteLayout cta={{ heading: <>Plan your trip <span className="text-gold">with Cabslink</span></>, label: "Get a fixed price", trackAs: "final_cta_blog_list" }}>
      <PageHero
        eyebrow="Content Hub"
        title="Travel guides, airport tips & Scotland stories"
        subtitle="Expert advice from Cabslink's editorial team — everything you need to travel confidently across the UK."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Blog" }]}
      />

      <section className="container-x py-12 md:py-16">
        {/* Search + category filters */}
        <div className="mb-10 border-b border-[var(--navy)]/10 pb-8">
          <div className="max-w-xl space-y-2">
            <Label htmlFor="blog-search">Search articles</Label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="blog-search" type="search" maxLength={80} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Topic, place or keyword" className="h-12 pl-10 pr-12 text-base [&::-webkit-search-cancel-button]:appearance-none" />
              {q && <Button type="button" size="icon" variant="ghost" aria-label="Clear article search"
                className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQ("")}><X /></Button>}
            </div>
          </div>
          {categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" aria-pressed={!category} onClick={() => setCategory("")}
                className={`rounded-full border px-4 py-2 text-sm transition ${!category ? "border-[var(--gold)] bg-[var(--gold)]/10 font-semibold text-[var(--gold-ink)]" : "border-[var(--navy)]/15 bg-card text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"}`}>
                All topics
              </button>
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={category === c.slug} onClick={() => setCategory(category === c.slug ? "" : c.slug)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${category === c.slug ? "border-[var(--gold)] bg-[var(--gold)]/10 font-semibold text-[var(--gold-ink)]" : "border-[var(--navy)]/15 bg-card text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {filtering && (
            <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">
              {rest.length + shownPillars.length} {rest.length + shownPillars.length === 1 ? "article" : "articles"} found
              <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={() => { setQ(""); setCategory(""); }}><X />Clear filters</Button>
            </p>
          )}
        </div>

        {/* Featured hero */}
        {hero && !filtering && (
          <div className="mb-14">
            <Link
              to="/blog/$slug"
              params={{ slug: hero.slug }}
              className="group grid md:grid-cols-2 gap-8 items-center overflow-hidden rounded-3xl border border-[var(--navy)]/10 bg-card shadow-raised hover:shadow-raised-hover"
            >
              {hero.featured_image_url && (
                <div className="aspect-[16/10] md:aspect-auto md:h-full overflow-hidden">
                  <img src={hero.featured_image_url} alt={hero.featured_image_alt ?? hero.title} width={800} height={500} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
              )}
              <div className="p-8 md:p-12">
                {hero.category && (
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold-ink)] font-semibold mb-3">{hero.category.name}</p>
                )}
                <h2 className="font-display text-2xl md:text-4xl font-semibold text-[var(--navy)] leading-tight group-hover:text-[var(--gold-ink)] transition">
                  {hero.title}
                </h2>
                {hero.excerpt && <p className="mt-4 text-[var(--navy)]/70">{hero.excerpt}</p>}
                <p className="mt-6 text-xs text-[var(--navy)]/70">{hero.reading_minutes} min read</p>
              </div>
            </Link>
          </div>
        )}

        {/* Latest grid */}
        {rest.length > 0 && (
          <>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[var(--navy)] mb-6">Latest articles</h2>
            <div className="grid auto-rows-fr justify-start gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => <BlogPostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {/* Pillars */}
        {shownPillars.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[var(--navy)] mb-6">Cornerstone guides</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shownPillars.map((p) => <BlogPostCard key={p.id} post={p} compact />)}
            </div>
          </div>
        )}

        {filtering && rest.length === 0 && shownPillars.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 p-12 text-center">
            <h2 className="font-display text-2xl font-semibold text-[var(--navy)]">No articles match that search</h2>
            <p className="mt-3 text-[var(--navy)]/60">Try a different word or clear the filters to see everything.</p>
            <Button className="mt-6" onClick={() => { setQ(""); setCategory(""); }}>Clear filters</Button>
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
