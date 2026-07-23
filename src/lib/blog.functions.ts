/**
 * Public Content Hub — read-only server functions for /blog surfaces.
 * Uses the anon-friendly publishable client and depends on RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type BlogAuthor = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  links: Record<string, string> | null;
};

export type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  hero_image_url: string | null;
  seo_title: string | null;
  meta_description: string | null;
  sort_order: number;
};

export type BlogTag = { id: string; slug: string; name: string };

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  reading_minutes: number;
  published_at: string | null;
  category: { slug: string; name: string } | null;
  author: { slug: string; name: string; avatar_url: string | null } | null;
  cluster_key: string | null;
  pillar: boolean;
  featured: boolean;
};

export type BlogPostFull = BlogPostSummary & {
  body_md: string;
  seo_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_override: string | null;
  robots_status: string;
  toc: { id: string; text: string; level: number }[];
  faqs: { q: string; a: string }[];
  key_takeaways: string[];
  related_service_slugs: string[];
  related_location_slugs: string[];
  related_route_slugs: string[];
  related_post_ids: string[];
  tags: BlogTag[];
  author_full: BlogAuthor | null;
  last_reviewed_at: string | null;
};

const POST_LIST_SELECT =
  "id, slug, title, subtitle, excerpt, featured_image_url, featured_image_alt, reading_minutes, published_at, cluster_key, pillar, featured, category:blog_categories(slug,name), author:blog_authors(slug,name,avatar_url)";

const POST_FULL_SELECT = `id, slug, title, subtitle, excerpt, body_md, featured_image_url, featured_image_alt, reading_minutes, published_at, last_reviewed_at, seo_title, meta_description, og_image_url, canonical_override, robots_status, toc, faqs, key_takeaways, cluster_key, pillar, featured, related_service_slugs, related_location_slugs, related_route_slugs, related_post_ids, category:blog_categories(slug,name), author:blog_authors(slug,name,avatar_url), author_full:blog_authors(*), tags:blog_post_tags(tag:blog_tags(id,slug,name))`;

function normalizeSummary(row: any): BlogPostSummary {
  return {
    id: row.id, slug: row.slug, title: row.title, subtitle: row.subtitle,
    excerpt: row.excerpt, featured_image_url: row.featured_image_url,
    featured_image_alt: row.featured_image_alt, reading_minutes: row.reading_minutes,
    published_at: row.published_at, category: row.category ?? null,
    author: row.author ?? null, cluster_key: row.cluster_key,
    pillar: !!row.pillar, featured: !!row.featured,
  };
}

export const listBlogHome = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  const [categoriesRes, latestRes, featuredRes, pillarsRes] = await Promise.all([
    supabase.from("blog_categories").select("*").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("blog_posts").select(POST_LIST_SELECT).eq("status", "published").order("published_at", { ascending: false }).limit(12),
    supabase.from("blog_posts").select(POST_LIST_SELECT).eq("status", "published").eq("featured", true).order("published_at", { ascending: false }).limit(3),
    supabase.from("blog_posts").select(POST_LIST_SELECT).eq("status", "published").eq("pillar", true).order("published_at", { ascending: false }).limit(6),
  ]);
  return {
    categories: (categoriesRes.data ?? []) as BlogCategory[],
    latest: (latestRes.data ?? []).map(normalizeSummary),
    featured: (featuredRes.data ?? []).map(normalizeSummary),
    pillars: (pillarsRes.data ?? []).map(normalizeSummary),
  };
});

export const listPostsByCategory = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const { data: cat } = await supabase.from("blog_categories").select("*").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (!cat) return { category: null, posts: [] as BlogPostSummary[] };
    const { data: posts } = await supabase.from("blog_posts").select(POST_LIST_SELECT)
      .eq("status", "published").eq("category_id", cat.id).order("published_at", { ascending: false });
    return { category: cat as BlogCategory, posts: (posts ?? []).map(normalizeSummary) };
  });

export const listPostsByTag = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const { data: tag } = await supabase.from("blog_tags").select("*").eq("slug", data.slug).maybeSingle();
    if (!tag) return { tag: null, posts: [] as BlogPostSummary[] };
    const { data: joins } = await supabase.from("blog_post_tags").select("post_id").eq("tag_id", tag.id);
    const ids = (joins ?? []).map((j: any) => j.post_id);
    if (ids.length === 0) return { tag: tag as BlogTag, posts: [] };
    const { data: posts } = await supabase.from("blog_posts").select(POST_LIST_SELECT)
      .eq("status", "published").in("id", ids).order("published_at", { ascending: false });
    return { tag: tag as BlogTag, posts: (posts ?? []).map(normalizeSummary) };
  });

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }): Promise<{ post: BlogPostFull | null; related: BlogPostSummary[] }> => {
    const supabase = serverPublicClient();
    const { data: row, error } = await supabase.from("blog_posts").select(POST_FULL_SELECT)
      .eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (error || !row) return { post: null, related: [] };
    const r: any = row;
    const post: BlogPostFull = {
      ...normalizeSummary(r),
      body_md: r.body_md ?? "",
      seo_title: r.seo_title, meta_description: r.meta_description,
      og_image_url: r.og_image_url, canonical_override: r.canonical_override,
      robots_status: r.robots_status ?? "index,follow",
      toc: Array.isArray(r.toc) ? r.toc : [],
      faqs: Array.isArray(r.faqs) ? r.faqs : [],
      key_takeaways: Array.isArray(r.key_takeaways) ? r.key_takeaways : [],
      related_service_slugs: r.related_service_slugs ?? [],
      related_location_slugs: r.related_location_slugs ?? [],
      related_route_slugs: r.related_route_slugs ?? [],
      related_post_ids: r.related_post_ids ?? [],
      tags: ((r.tags ?? []) as any[]).map((t) => t.tag).filter(Boolean),
      author_full: r.author_full ?? null,
      last_reviewed_at: r.last_reviewed_at,
    };

    // Related posts: prefer explicit related_post_ids, otherwise same category
    let related: BlogPostSummary[] = [];
    if (post.related_post_ids.length) {
      const { data: rel } = await supabase.from("blog_posts").select(POST_LIST_SELECT)
        .eq("status", "published").in("id", post.related_post_ids).limit(4);
      related = (rel ?? []).map(normalizeSummary);
    }
    if (related.length < 3 && post.category) {
      const { data: rel } = await supabase.from("blog_posts").select(POST_LIST_SELECT)
        .eq("status", "published").eq("category_id", (r.category_id ?? r.category?.id ?? ""))
        .neq("id", post.id).order("published_at", { ascending: false }).limit(4 - related.length);
      const existing = new Set(related.map((p) => p.id));
      for (const p of rel ?? []) if (!existing.has((p as any).id)) related.push(normalizeSummary(p));
    }

    // Fire-and-forget view increment via anon UPDATE would need policy — skip.
    return { post, related };
  });

export const searchBlog = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ q: z.string().trim().min(1).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const q = data.q.replace(/[%_]/g, " ").trim();
    const { data: rows } = await supabase.from("blog_posts").select(POST_LIST_SELECT)
      .eq("status", "published")
      .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
      .order("published_at", { ascending: false }).limit(20);
    return (rows ?? []).map(normalizeSummary);
  });

/** Path list for the sitemap. */
export async function listPublishedBlogPathsImpl(): Promise<string[]> {
  const supabase = serverPublicClient();
  const { data } = await supabase.from("blog_posts").select("slug").eq("status", "published");
  return (data ?? []).map((r: any) => `/blog/${r.slug}`);
}
