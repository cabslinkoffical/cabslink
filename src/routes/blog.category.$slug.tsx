import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { BlogPostCard } from "@/components/site/BlogPostCard";
import { listPostsByCategory } from "@/lib/blog.functions";
import { categoryIntro, categoryIsIndexable } from "@/lib/blog-category-seo";

const BASE = "https://cabslink.com";

const q = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "category", slug],
    queryFn: () => listPostsByCategory({ data: { slug } }),
  });

export const Route = createFileRoute("/blog/category/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(q(params.slug));
    // Inactive or empty categories are not real pages: a true 404.
    if (!data.category || data.posts.length === 0) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const cat = loaderData?.category;
    const count = loaderData?.posts.length ?? 0;
    const title = cat ? `${cat.seo_title ?? cat.name} — Cabslink Blog` : "Category — Cabslink Blog";
    const desc = cat
      ? (cat.meta_description ?? categoryIntro(cat, count))
      : "Read the latest Cabslink guides in this category.";
    const url = `${BASE}/blog/category/${params.slug}`;
    return normalizeHead({
      meta: [
        { title },
        // Indexed once the category holds enough articles to be a real hub.
        { name: "robots", content: cat && categoryIsIndexable(count) ? "index,follow" : "noindex,follow" },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: cat
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: cat.name,
              description: desc,
              url,
              mainEntity: {
                "@type": "ItemList",
                itemListElement: (loaderData?.posts ?? []).map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${BASE}/blog/${p.slug}`,
                  name: p.title,
                })),
              },
              breadcrumb: {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
                  { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
                  { "@type": "ListItem", position: 3, name: cat.name, item: url },
                ],
              },
            }),
          }]
        : [],
    });
  },
  component: CategoryPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Category temporarily unavailable</h1>
        <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : "Please try again shortly."}</p>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Category not found</h1>
        <p className="mt-2 text-muted-foreground">
          There are no articles here yet. <Link to="/blog" className="text-[var(--gold-ink)] underline">Browse all articles</Link>.
        </p>
      </section>
    </SiteLayout>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(q(slug));
  const { category, posts } = data;
  return (
    <SiteLayout cta={{ heading: <>Plan your trip <span className="text-gold">with Cabslink</span></>, label: "Get a fixed price", trackAs: "final_cta_blog_list" }}>
      <PageHero
        eyebrow="Blog category"
        title={category?.name ?? "Category"}
        subtitle={category ? categoryIntro(category, posts.length) : undefined}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Blog", to: "/blog" }, { label: category?.name ?? slug }]}
      />
      <section className="container-x py-12 md:py-16">
        <h2 className="sr-only">Articles in {category?.name ?? "this category"}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <BlogPostCard key={p.id} post={p} />)}
        </div>
      </section>
    </SiteLayout>
  );
}
