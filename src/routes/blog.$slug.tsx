import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getBlogPost, type BlogPostFull, type BlogPostSummary } from "@/lib/blog.functions";
import { BlogArticle } from "@/components/site/BlogArticle";
import { SiteLayout } from "@/components/site/SiteLayout";

const BASE = "https://cabslink.lovable.app";

const postQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "post", slug],
    queryFn: () => getBlogPost({ data: { slug } }),
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const res = await context.queryClient.ensureQueryData(postQuery(params.slug));
    if (!res.post) throw notFound();
    return res as { post: BlogPostFull; related: BlogPostSummary[] };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article not found — Cabslink" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    const url = `${BASE}/blog/${p.slug}`;
    const title = p.seo_title ?? p.title;
    const desc = p.meta_description ?? p.excerpt ?? "";
    const image = p.og_image_url ?? p.featured_image_url ?? undefined;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { name: "robots", content: p.robots_status },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    if (p.published_at) meta.push({ property: "article:published_time", content: p.published_at });
    if (p.last_reviewed_at) meta.push({ property: "article:modified_time", content: p.last_reviewed_at });
    if (p.author) meta.push({ property: "article:author", content: p.author.name });
    if (p.category) meta.push({ property: "article:section", content: p.category.name });

    const canonical = p.canonical_override && p.canonical_override.length ? p.canonical_override : url;

    const articleLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: desc,
      image: image ? [image] : undefined,
      datePublished: p.published_at ?? undefined,
      dateModified: p.last_reviewed_at ?? p.published_at ?? undefined,
      mainEntityOfPage: url,
      author: p.author ? { "@type": "Person", name: p.author.name } : undefined,
      publisher: {
        "@type": "Organization",
        name: "Cabslink",
        logo: { "@type": "ImageObject", url: `${BASE}/favicon.ico` },
      },
      articleSection: p.category?.name,
      keywords: p.tags.map((t) => t.name).join(", ") || undefined,
    };

    const scripts: Array<Record<string, string>> = [
      { type: "application/ld+json", children: JSON.stringify(articleLd) },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
            ...(p.category
              ? [{ "@type": "ListItem", position: 3, name: p.category.name, item: `${BASE}/blog/category/${p.category.slug}` }]
              : []),
            {
              "@type": "ListItem",
              position: p.category ? 4 : 3,
              name: p.title,
              item: url,
            },
          ],
        }),
      },
    ];
    if (p.faqs.length > 0) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: p.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      });
    }

    return {
      meta,
      links: [{ rel: "canonical", href: canonical }],
      scripts,
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-[var(--navy)] mb-4">Article not found</h1>
        <p className="text-[var(--navy)]/70 mb-6">This article may have been moved or is no longer published.</p>
        <Link to="/blog" className="text-[var(--gold-ink)] hover:underline">← Back to the blog</Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: () => (
    <SiteLayout>
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-[var(--navy)] mb-4">Something went wrong</h1>
        <Link to="/blog" className="text-[var(--gold-ink)] hover:underline">← Back to the blog</Link>
      </div>
    </SiteLayout>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(postQuery(slug));
  if (!data.post) return null;
  return <BlogArticle post={data.post} related={data.related} />;
}
