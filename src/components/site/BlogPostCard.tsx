import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog.functions";

export function BlogPostCard({ post, compact = false }: { post: BlogPostSummary; compact?: boolean }) {
  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group block overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-white transition hover:-translate-y-0.5 shadow-raised hover:shadow-raised-hover"
    >
      {post.featured_image_url && (
        <div className={`overflow-hidden ${compact ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
          <img
            src={post.featured_image_url}
            alt={post.featured_image_alt ?? post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5">
        {post.category && (
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gold-ink)] font-semibold mb-2">
            {post.category.name}
          </p>
        )}
        <h3 className="font-display text-lg md:text-xl font-semibold text-[var(--navy)] leading-snug group-hover:text-[var(--gold-ink)] transition">
          {post.title}
        </h3>
        {post.excerpt && !compact && (
          <p className="mt-2 text-sm text-[var(--navy)]/70 line-clamp-2">{post.excerpt}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--navy)]/60">
          <span>{dateStr}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {post.reading_minutes} min
          </span>
        </div>
      </div>
    </Link>
  );
}
