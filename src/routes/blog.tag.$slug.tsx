import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { BlogPostCard } from "@/components/site/BlogPostCard";
import { listPostsByTag } from "@/lib/blog.functions";

const BASE = "https://cabslink.lovable.app";

const q = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "tag", slug],
    queryFn: () => listPostsByTag({ data: { slug } }),
  });

export const Route = createFileRoute("/blog/tag/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(q(params.slug)),
  head: ({ params, loaderData }) => {
    const tag = loaderData?.tag;
    const title = tag ? `#${tag.name} — Cabslink Blog` : "Tag — Cabslink Blog";
    const desc = `Articles tagged with ${tag?.name ?? params.slug} on the Cabslink blog.`;
    const url = `${BASE}/blog/tag/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex,follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TagPage,
});

function TagPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(q(slug));
  const { tag, posts } = data;
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Tag"
        title={tag ? `#${tag.name}` : `#${slug}`}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Blog", to: "/blog" }, { label: tag?.name ?? slug }]}
      />
      <section className="container-x py-12 md:py-16">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 p-12 text-center text-[var(--navy)]/60">
            No articles for this tag. <Link to="/blog" className="text-[var(--gold-ink)] hover:underline">Browse all articles →</Link>
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
