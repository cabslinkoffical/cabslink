/**
 * Content Hub — admin CRUD for blog posts, categories, tags, authors.
 * Every function asserts admin role via user_roles.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ============ LIST ============
export const listAdminPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("blog_posts")
      .select("id, slug, title, status, published_at, updated_at, featured, pillar, category:blog_categories(name,slug), author:blog_authors(name)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAdminPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: post } = await context.supabase.from("blog_posts").select("*, tags:blog_post_tags(tag_id)").eq("id", data.id).maybeSingle();
    if (!post) throw new Error("Not found");
    return { ...post, tag_ids: ((post as any).tags ?? []).map((t: any) => t.tag_id) };
  });

// ============ POSTS UPSERT ============
const postSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(slugRegex, "lowercase-with-hyphens").min(2).max(120),
  title: z.string().trim().min(3).max(200),
  subtitle: z.string().trim().max(220).nullable().optional(),
  excerpt: z.string().trim().max(400).nullable().optional(),
  body_md: z.string().default(""),
  category_id: z.string().uuid().nullable().optional(),
  author_id: z.string().uuid().nullable().optional(),
  featured_image_url: z.string().url().nullable().optional(),
  featured_image_alt: z.string().trim().max(200).nullable().optional(),
  status: z.enum(["draft", "review", "scheduled", "published", "archived"]).default("draft"),
  published_at: z.string().datetime().nullable().optional(),
  reading_minutes: z.coerce.number().int().min(1).max(60).default(3),
  seo_title: z.string().trim().max(200).nullable().optional(),
  meta_description: z.string().trim().max(320).nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  canonical_override: z.string().trim().max(500).nullable().optional(),
  robots_status: z.string().max(60).default("index,follow"),
  toc: z.array(z.object({ id: z.string(), text: z.string(), level: z.number() })).default([]),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  key_takeaways: z.array(z.string()).default([]),
  cluster_key: z.string().trim().max(80).nullable().optional(),
  pillar: z.boolean().default(false),
  featured: z.boolean().default(false),
  related_service_slugs: z.array(z.string()).default([]),
  related_location_slugs: z.array(z.string()).default([]),
  related_route_slugs: z.array(z.string()).default([]),
  related_post_ids: z.array(z.string().uuid()).default([]),
  tag_ids: z.array(z.string().uuid()).default([]),
});

export const upsertPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => postSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, tag_ids, ...payload } = data;
    let postId = id;
    if (id) {
      const { error } = await context.supabase.from("blog_posts").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await context.supabase.from("blog_posts").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      postId = (row as any).id;
    }
    // Sync tags
    if (postId) {
      await context.supabase.from("blog_post_tags").delete().eq("post_id", postId);
      if (tag_ids.length) {
        await context.supabase.from("blog_post_tags").insert(tag_ids.map((tid) => ({ post_id: postId, tag_id: tid })));
      }
    }
    return { ok: true, id: postId };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ CATEGORIES ============
export const listCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("blog_categories").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(slugRegex).min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  hero_image_url: z.string().url().nullable().optional(),
  seo_title: z.string().trim().max(200).nullable().optional(),
  meta_description: z.string().trim().max(320).nullable().optional(),
  sort_order: z.coerce.number().int().default(100),
  active: z.boolean().default(true),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => categorySchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("blog_categories").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("blog_categories").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("blog_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ TAGS ============
export const listTagsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("blog_tags").select("*").order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    slug: z.string().regex(slugRegex).min(2).max(80),
    name: z.string().trim().min(2).max(100),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("blog_tags").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("blog_tags").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("blog_tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ AUTHORS ============
export const listAuthorsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("blog_authors").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const authorSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(slugRegex).min(2).max(80),
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  links: z.record(z.string(), z.string()).default({}),
  active: z.boolean().default(true),
});

export const upsertAuthor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => authorSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await context.supabase.from("blog_authors").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("blog_authors").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAuthor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("blog_authors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
