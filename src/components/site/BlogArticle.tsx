import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, Calendar, User } from "lucide-react";
import { SiteLayout } from "./SiteLayout";
import { BlogPostCard } from "./BlogPostCard";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import type { BlogPostFull, BlogPostSummary } from "@/lib/blog.functions";

export function BlogArticle({ post, related }: { post: BlogPostFull; related: BlogPostSummary[] }) {
  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <SiteLayout>
      <article>
        {/* Hero */}
        <header className="hero-gradient text-[var(--navy-foreground)]">
          <div className="container-x py-14 md:py-20">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Blog", href: "/blog" },
                ...(post.category ? [{ name: post.category.name, href: `/blog/category/${post.category.slug}` }] : []),
                { name: post.title, href: `/blog/${post.slug}` },
              ]}
            />
            {post.category && (
              <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
                {post.category.name}
              </p>
            )}
            <h1 className="mt-3 font-display text-3xl md:text-5xl font-semibold leading-[1.1] max-w-4xl">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="mt-4 max-w-2xl text-base md:text-lg text-[var(--navy-foreground)]/75">
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

        {/* Featured image */}
        {post.featured_image_url && (
          <div className="container-x -mt-6 md:-mt-10">
            <div className="overflow-hidden rounded-3xl shadow-xl aspect-[16/8]">
              <img
                src={post.featured_image_url}
                alt={post.featured_image_alt ?? post.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Content grid */}
        <div className="container-x py-12 md:py-16 grid lg:grid-cols-[240px_minmax(0,1fr)_260px] gap-10">
          {/* TOC */}
          <aside className="hidden lg:block">
            {post.toc.length > 0 && (
              <div className="sticky top-24 rounded-2xl border border-[var(--navy)]/10 bg-white p-5">
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

            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-[var(--navy)] prose-a:text-[var(--gold-ink)] prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_md}</ReactMarkdown>
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
                    className="inline-block rounded-full border border-[var(--navy)]/15 bg-white px-3 py-1 text-xs text-[var(--navy)]/80 hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Author box */}
            {post.author_full && (
              <div className="mt-12 rounded-2xl border border-[var(--navy)]/10 bg-white p-6 flex items-start gap-4">
                {post.author_full.avatar_url ? (
                  <img src={post.author_full.avatar_url} alt={post.author_full.name} className="size-14 rounded-full object-cover" />
                ) : (
                  <div className="size-14 rounded-full bg-[var(--navy)] text-white flex items-center justify-center font-semibold">
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
            <div className="sticky top-24 rounded-2xl bg-[var(--navy)] text-white p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Need a car?</p>
              <p className="font-display text-xl leading-tight">Book a private airport transfer in 60 seconds.</p>
              <Link
                to="/book"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-[var(--navy)] hover:opacity-90"
              >
                Get an instant quote
              </Link>
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
