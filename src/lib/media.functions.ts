/**
 * Media Library — one shared image store for the whole site.
 * Files live in the private `media` bucket; long-lived signed URLs are stored
 * in public.media_assets so pages keep working without re-signing.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const MEDIA_BUCKET = "media";
export const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

export type MediaAsset = {
  id: string;
  path: string;
  url: string;
  file_name: string;
  mime_type: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  folder: string;
  alt_text: string | null;
  created_at: string;
  source_kind: "upload" | "legacy_storage" | "database_url" | "bundled_asset";
  optimized_at: string | null;
  original_bytes: number | null;
  optimization_status: "pending" | "optimized" | "already_optimized" | "skipped" | "failed";
  usage_locations: { label: string; title: string; href?: string }[];
};

/** Tables/columns that can hold a library image URL. */
const USAGE_MAP: { table: string; column: string; label: string; titleCol: string; nullable: boolean }[] = [
  { table: "blog_posts", column: "featured_image_url", label: "Blog post cover", titleCol: "title", nullable: true },
  { table: "blog_posts", column: "og_image_url", label: "Blog post share image", titleCol: "title", nullable: true },
  { table: "blog_categories", column: "hero_image_url", label: "Blog category", titleCol: "name", nullable: true },
  { table: "blog_authors", column: "avatar_url", label: "Author photo", titleCol: "name", nullable: true },
  { table: "vehicle_classes", column: "hero_image", label: "Vehicle class", titleCol: "name", nullable: true },
  { table: "vehicles", column: "image_url", label: "Vehicle", titleCol: "name", nullable: false },
  { table: "seo_pages", column: "featured_image_url", label: "Page image", titleCol: "path", nullable: true },
  { table: "seo_pages", column: "og_image_url", label: "Page share image", titleCol: "path", nullable: true },
  { table: "seo_services", column: "hero_image_url", label: "Service page", titleCol: "name", nullable: true },
  { table: "seo_airports", column: "hero_image_url", label: "Airport page", titleCol: "name", nullable: true },
  { table: "scenic_route_templates", column: "hero_image_url", label: "Tour", titleCol: "name", nullable: true },
  { table: "points_of_interest", column: "image_url", label: "Point of interest", titleCol: "name", nullable: true },
  { table: "content_blocks", column: "image_url", label: "Content block", titleCol: "key", nullable: true },
  { table: "drivers", column: "photo_url", label: "Driver photo", titleCol: "full_name", nullable: true },
];

export type MediaUsage = { table: string; column: string; label: string; title: string; id: string };

const MEDIA_SELECT = "id, path, url, file_name, mime_type, bytes, width, height, folder, alt_text, created_at, source_kind, optimized_at, original_bytes, optimization_status, usage_locations";

async function scanUsage(supabase: any, url: string): Promise<MediaUsage[]> {
  const found: MediaUsage[] = [];
  await Promise.all(
    USAGE_MAP.map(async (m) => {
      const { data, error } = await supabase.from(m.table).select(`id, ${m.titleCol}`).eq(m.column, url).limit(25);
      if (error || !data) return;
      for (const row of data as any[]) {
        found.push({ table: m.table, column: m.column, label: m.label, title: String(row[m.titleCol] ?? "Untitled"), id: row.id });
      }
    }),
  );
  return found;
}

// ============ LIST ============
export const listMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        folder: z.string().trim().max(60).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(60),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("media_assets")
      .select(MEDIA_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) q = q.ilike("file_name", `%${data.search}%`);
    if (data.folder && data.folder !== "all") q = q.eq("folder", data.folder);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const { data: folderRows } = await context.supabase.from("media_assets").select("folder");
    const folders = Array.from(new Set(((folderRows ?? []) as any[]).map((r) => r.folder))).sort();

    return { items: (rows ?? []) as MediaAsset[], total: count ?? 0, folders };
  });

// ============ REGISTER AN UPLOAD ============
export const registerUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        path: z.string().min(3).max(400),
        url: z.string().url(),
        file_name: z.string().min(1).max(200),
        mime_type: z.string().max(120).nullable().optional(),
        bytes: z.coerce.number().int().min(0).nullable().optional(),
        width: z.coerce.number().int().min(0).nullable().optional(),
        height: z.coerce.number().int().min(0).nullable().optional(),
        folder: z.string().trim().min(1).max(60).default("general"),
        alt_text: z.string().trim().max(200).nullable().optional(),
        source_kind: z.enum(["upload", "legacy_storage", "database_url", "bundled_asset"]).default("upload"),
        optimization_status: z.enum(["pending", "optimized", "already_optimized", "skipped", "failed"]).default("pending"),
        original_bytes: z.coerce.number().int().min(0).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("media_assets")
      .upsert({ ...data, uploaded_by: context.userId }, { onConflict: "path" })
      .select(MEDIA_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as MediaAsset;
  });

// ============ UPDATE (alt text / folder) ============
export const updateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        alt_text: z.string().trim().max(200).nullable().optional(),
        folder: z.string().trim().min(1).max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("media_assets").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ WHERE IS IT USED ============
export const getMediaUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from("media_assets").select("id, url, file_name").in("id", data.ids);
    if (error) throw new Error(error.message);
    const result: Record<string, MediaUsage[]> = {};
    for (const r of (rows ?? []) as any[]) {
      const scanned = await scanUsage(context.supabase, r.url);
      const { data: asset } = await context.supabase.from("media_assets").select("usage_locations").eq("id", r.id).maybeSingle();
      const known = Array.isArray(asset?.usage_locations) ? asset.usage_locations : [];
      result[r.id] = [
        ...scanned,
        ...known.map((u: any, index: number) => ({ table: "website", column: "asset", id: `${r.id}-${index}`, ...u })),
      ];
    }
    return result;
  });

// ============ DELETE ============
export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(50), clearReferences: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from("media_assets").select("id, path, url, source_kind").in("id", data.ids);
    if (error) throw new Error(error.message);
    const assets = (rows ?? []) as { id: string; path: string; url: string; source_kind: string }[];

    let cleared = 0;
    for (const a of assets) {
      const usage = await scanUsage(context.supabase, a.url);
      if (usage.length && !data.clearReferences) {
        throw new Error(`"${a.path.split("/").pop()}" is still used in ${usage.length} place(s). Confirm removal to continue.`);
      }
      for (const u of usage) {
        const map = USAGE_MAP.find((m) => m.table === u.table && m.column === u.column)!;
        await (context.supabase as any)
          .from(u.table)
          .update({ [u.column]: map.nullable ? null : "" })
          .eq("id", u.id);
        cleared++;
      }
    }

    // Entries indexed from other buckets / external URLs have no object in the media bucket.
    const ownedPaths = assets
      .filter((a) => a.source_kind === "upload")
      .map((a) => a.path);
    if (ownedPaths.length) {
      const { error: rmErr } = await context.supabase.storage.from(MEDIA_BUCKET).remove(ownedPaths);
      if (rmErr) throw new Error(rmErr.message);
    }

    const { error: delErr } = await context.supabase.from("media_assets").delete().in(
      "id",
      assets.map((a) => a.id),
    );
    if (delErr) throw new Error(delErr.message);

    return { deleted: assets.length, cleared };
  });

// ============ IMPORT OLDER UPLOADS ============
const LEGACY_BUCKETS: { bucket: string; prefixes: string[]; folder: string }[] = [
  { bucket: "blog-images", prefixes: ["posts", ""], folder: "blog" },
  { bucket: "vehicle-images", prefixes: ["classes", ""], folder: "fleet" },
];

export const importLegacyMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    let imported = 0;

    for (const src of LEGACY_BUCKETS) {
      for (const prefix of src.prefixes) {
        const { data: files } = await context.supabase.storage.from(src.bucket).list(prefix, { limit: 500 });
        for (const f of (files ?? []) as any[]) {
          if (!f.id || !f.name || f.name.startsWith(".")) continue;
          const path = prefix ? `${prefix}/${f.name}` : f.name;
          const legacyPath = `${src.bucket}/${path}`;
          const { data: existing } = await context.supabase
            .from("media_assets")
            .select("id")
            .eq("path", legacyPath)
            .maybeSingle();
          if (existing) continue;

          const { data: signed } = await context.supabase.storage.from(src.bucket).createSignedUrl(path, SIGNED_URL_TTL);
          if (!signed?.signedUrl) continue;

          const { error } = await context.supabase.from("media_assets").insert({
            path: legacyPath,
            url: signed.signedUrl,
            file_name: f.name,
            mime_type: f.metadata?.mimetype ?? null,
            bytes: f.metadata?.size ?? null,
            folder: src.folder,
            uploaded_by: context.userId,
            source_kind: "legacy_storage",
            optimization_status: /webp|avif/i.test(f.metadata?.mimetype ?? f.name) ? "already_optimized" : "pending",
          });
          if (!error) imported++;
        }
      }
    }

    // Also index any image URL already referenced anywhere on the site
    // (pages, tours, fleet, blog, stops, people) so the library reflects the live site.
    const { data: known } = await context.supabase.from("media_assets").select("url");
    const seen = new Set(((known ?? []) as any[]).map((r) => r.url));

    for (const m of USAGE_MAP) {
      const { data: rows } = await (context.supabase as any)
        .from(m.table)
        .select(`${m.column}`)
        .not(m.column, "is", null)
        .limit(500);
      for (const row of (rows ?? []) as any[]) {
        const url = String(row[m.column] ?? "").trim();
        if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);
        const fileName = decodeURIComponent(url.split("?")[0]!.split("/").pop() || "image");
        const { error } = await context.supabase.from("media_assets").insert({
          path: `external/${fileName}-${Math.random().toString(36).slice(2, 8)}`,
          url,
          file_name: fileName,
          folder: m.table.startsWith("blog")
            ? "blog"
            : m.table.startsWith("vehicle")
              ? "fleet"
              : m.table.startsWith("seo")
                ? "pages"
                : m.table === "scenic_route_templates" || m.table === "points_of_interest"
                  ? "tours"
                  : "general",
          uploaded_by: context.userId,
          source_kind: "database_url",
          optimization_status: /\.(webp|avif)(\?|$)/i.test(url) ? "already_optimized" : "pending",
        });
        if (!error) imported++;
      }
    }

    return { imported };
  });

// ============ CATALOGUE BUILT-IN WEBSITE ASSETS ============
export const catalogueBundledMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ assets: z.array(z.object({
    path: z.string().min(3).max(500),
    url: z.string().min(1).max(2000),
    file_name: z.string().min(1).max(200),
    folder: z.string().min(1).max(60),
    bytes: z.number().int().min(0).nullable(),
    mime_type: z.string().max(120).nullable(),
    usage_locations: z.array(z.object({ label: z.string(), title: z.string(), href: z.string().optional() })).max(30),
  })).max(150) }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let imported = 0;
    for (const asset of data.assets) {
      const { data: existing } = await context.supabase.from("media_assets").select("id").eq("path", asset.path).maybeSingle();
      const payload = { ...asset, source_kind: "bundled_asset", optimization_status: "already_optimized", optimized_at: new Date().toISOString(), uploaded_by: context.userId };
      const { error } = existing
        ? await context.supabase.from("media_assets").update(payload).eq("id", existing.id)
        : await context.supabase.from("media_assets").insert(payload);
      if (!error && !existing) imported++;
    }
    return { imported, catalogued: data.assets.length };
  });

export const listOptimizationCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("media_assets")
      .select(MEDIA_SELECT)
      .eq("optimization_status", "pending")
      .neq("source_kind", "bundled_asset")
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MediaAsset[];
  });

export const finishMediaOptimization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["optimized", "already_optimized", "skipped", "failed"]),
    url: z.string().url().optional(),
    path: z.string().max(400).optional(),
    file_name: z.string().max(200).optional(),
    mime_type: z.string().max(120).optional(),
    bytes: z.number().int().min(0).optional(),
    original_bytes: z.number().int().min(0).nullable().optional(),
  }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: current, error } = await context.supabase.from("media_assets").select("id, url, bytes").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    if (data.url && data.url !== current.url) {
      const usage = await scanUsage(context.supabase, current.url);
      for (const u of usage) {
        await (context.supabase as any).from(u.table).update({ [u.column]: data.url }).eq("id", u.id);
      }
    }
    const { id, status, ...changes } = data;
    const patch = {
      ...changes,
      optimization_status: status,
      optimized_at: status === "failed" ? null : new Date().toISOString(),
      original_bytes: data.original_bytes ?? current.bytes ?? null,
    };
    const { error: updateError } = await context.supabase.from("media_assets").update(patch).eq("id", id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });
