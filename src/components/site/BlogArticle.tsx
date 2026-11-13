import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { extractToc, remarkHeadingIds } from "@/lib/blog-markdown";
import remarkGfm from "remark-gfm";
import { Clock, Calendar, User } from "lucide-react";
import { SiteLayout } from "./SiteLayout";
import { BookingWidget } from "./BookingWidget";
import { BlogPostCard } from "./BlogPostCard";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import type { BlogPostFull, BlogPostSummary } from "@/lib/blog.functions";

import { DirectAnswer, firstSentences } from "@/components/seo/DirectAnswer";

export function BlogArticle({ post, related }: { post: BlogPostFull; related: BlogPostSummary[] }) {
  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <SiteLayout cta={{ heading: <>Plan your trip <span className="text-gold">with Cabslink</span></>, label: "Get a fixed price", trackAs: "final_cta_blog" }}>
      <article>
        {/* Hero */}
        <header className="hero-gradient page-hero text-[var(--navy-foreground)]" data-align="left">
          <div className="container-x page-hero-inner page-hero-reading">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Blog", href: "/blog" },
                ...(post.category ? [{ name: post.category.name, href: `/blog/category/${post.category.slug}` }] : []),
                { name: post.title, href: `/blog/${post.slug}` },
              ]}
              dark
            />
            {post.category && (
              <p className="page-hero-eyebrow">{post.category.name}</p>
            )}
            <h1 className="page-hero-title font-display">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="page-hero-subtitle">
                {post.subtitle}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--navy-foreground)]/70">
              {post.author && (
                <span className="inline-flex items-center gap-2">
                  <User className="size-4" /> {post.author.name}
                </span>
              )}
              {publishedDate && (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="size-4" /> {publishedDate}
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4" /> {post.reading_minutes} min read
              </span>
            </div>
          </div>
        </header>
        <div className="container-x mt-8 max-w-4xl">
          <DirectAnswer
            sentences={firstSentences(post.excerpt || post.meta_description, 2)}
            updated={post.last_reviewed_at ?? post.published_at}
          />
        </div>

        {/* Featured image */}
        {post.featured_image_url && (
          <div className="container-x mt-8">
            <div className="overflow-hidden rounded-3xl shadow-xl aspect-[16/8]">
              <img
                src={post.featured_image_url}
                alt={post.featured_image_alt ?? post.title}
                width={1200}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Content grid */}
        <div className="container-x py-12 md:py-16 grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[220px_minmax(0,1fr)_340px] gap-10">
          {/* TOC */}
          <aside className="hidden lg:block">
            {post.toc.length > 0 && (
              <div className="sticky top-24 rounded-2xl border border-[var(--navy)]/10 bg-card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-ink)] font-semibold mb-3">On this page</p>
                <ol className="space-y-2 text-sm">
                  {post.toc.map((t) => (
                    <li key={t.id} style={{ paddingLeft: `${(t.level - 2) * 12}px` }}>
                      <a href={`#${t.id}`} className="text-[var(--navy)]/80 hover:text-[var(--gold-ink)]">{t.text}</a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>

          {/* Body */}
          <div className="min-w-0">
            {post.key_takeaways.length > 0 && (
              <div className="mb-8 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-ink)] font-semibold mb-3">Key takeaways</p>
                <ul className="space-y-2 text-[var(--navy)]/85 list-disc pl-5">
                  {post.key_takeaways.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}

            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-[var(--navy)] prose-headings:scroll-mt-28 prose-a:text-[var(--gold-ink)] prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm, [remarkHeadingIds, { ids: (post.toc.length ? post.toc : extractToc(post.body_md)).map((t) => t.id) }]]} components={{ h1: ({ node: _node, ...props }) => <h2 {...props} /> }}>{post.body_md}</ReactMarkdown>
            </div>

            {post.faqs.length > 0 && (
              <div className="mt-14">
                <FaqBlock items={post.faqs} />
              </div>
            )}

            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Link
                    key={t.id}
                    to="/blog/tag/$slug"
                    params={{ slug: t.slug }}
                    className="inline-block rounded-full border border-[var(--navy)]/15 bg-card px-3 py-1 text-xs text-[var(--navy)]/80 hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Author box */}
            {post.author_full && (
              <div className="mt-12 rounded-2xl border border-[var(--navy)]/10 bg-card p-6 flex items-start gap-4">
                {post.author_full.avatar_url ? (
                  <img src={post.author_full.avatar_url} alt={post.author_full.name} width={56} height={56} className="size-14 rounded-full object-cover" />
                ) : (
                  <div className="size-14 rounded-full bg-[var(--navy)] text-navy-foreground flex items-center justify-center font-semibold">
                    {post.author_full.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[var(--navy)]">{post.author_full.name}</p>
                  {post.author_full.role && <p className="text-xs text-[var(--navy)]/60">{post.author_full.role}</p>}
                  {post.author_full.bio && <p className="mt-2 text-sm text-[var(--navy)]/75">{post.author_full.bio}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar CTA */}
          <aside className="space-y-6">
            <div className="sticky top-24 rounded-2xl bg-[var(--navy)] text-navy-foreground p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Need a car?</p>
              <p className="font-display text-xl leading-tight">Get a fixed price for your journey.</p>
              <div className="mt-5 @container">
                <BookingWidget tone="dark" />
              </div>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="bg-[var(--navy)]/[0.03] py-16">
            <div className="container-x">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-[var(--navy)] mb-8">
                Continue reading
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {related.slice(0, 3).map((p) => <BlogPostCard key={p.id} post={p} />)}
              </div>
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}
