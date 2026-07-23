import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { BlogPostCard } from "@/components/site/BlogPostCard";
import { listPostsByCategory } from "@/lib/blog.functions";

const BASE = "https://cabslink.lovable.app";

const q = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "category", slug],
    queryFn: () => listPostsByCategory({ data: { slug } }),
  });

export const Route = createFileRoute("/blog/category/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(q(params.slug)),
  head: ({ params, loaderData }) => {
    const cat = loaderData?.category;
    const title = cat ? `${cat.seo_title ?? cat.name} — Cabslink Blog` : "Category — Cabslink Blog";
    const desc = cat?.meta_description ?? cat?.description ?? "Read the latest Cabslink guides in this category.";
    const url = `${BASE}/blog/category/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(q(slug));
  const { category, posts } = data;
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Category"
        title={category?.name ?? "Category"}
        subtitle={category?.description ?? undefined}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Blog", to: "/blog" }, { label: category?.name ?? slug }]}
      />
      <section className="container-x py-12 md:py-16">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 p-12 text-center text-[var(--navy)]/60">
            No articles in this category yet. <Link to="/blog" className="text-[var(--gold)] hover:underline">Browse all articles →</Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <BlogPostCard key={p.id} post={p} />)}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
