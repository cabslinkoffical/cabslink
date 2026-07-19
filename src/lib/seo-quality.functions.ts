/**
 * Phase SEO-C — content-quality audit, duplicate & orphan detection,
 * publication-issue persistence. Admin-only.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

type Issue = {
  page_id: string | null;
  issue_type: string;
  severity: "info" | "warning" | "blocker";
  message: string;
  payload?: Record<string, unknown>;
};

function pageIssuesFromRow(p: any): Issue[] {
  const issues: Issue[] = [];
  const push = (
    issue_type: string,
    severity: Issue["severity"],
    message: string,
    payload?: Record<string, unknown>,
  ) => issues.push({ page_id: p.id, issue_type, severity, message, payload });

  if (!p.seo_title) push("missing_title", "blocker", "Missing SEO title.");
  else if (p.seo_title.length < 30) push("title_short", "warning", `Title only ${p.seo_title.length} chars (aim 30–60).`);
  else if (p.seo_title.length > 65) push("title_long", "warning", `Title ${p.seo_title.length} chars may truncate in SERP.`);

  if (!p.meta_description) push("missing_meta", "blocker", "Missing meta description.");
  else if (p.meta_description.length < 90) push("meta_short", "warning", `Meta description only ${p.meta_description.length} chars (aim 90–160).`);
  else if (p.meta_description.length > 165) push("meta_long", "warning", `Meta description ${p.meta_description.length} chars may truncate.`);

  if (!p.h1) push("missing_h1", "blocker", "Missing H1.");
  if (!p.short_intro || p.short_intro.length < 120) push("thin_intro", "warning", "Short intro is thin (<120 chars).");
  if (!p.featured_image_url) push("no_featured_image", "info", "No featured image — social share will use fallback.");
  if (!p.og_image_url && !p.featured_image_url) push("no_og_image", "warning", "No og:image — social previews will be generic.");
  if (p.robots_status && p.robots_status.includes("noindex") && p.publication_status === "published") {
    push("published_but_noindex", "warning", "Page is published but marked noindex.");
  }
  return issues;
}

export const runSeoQualityAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      similarityThreshold: z.number().min(0.5).max(1).default(0.8),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase = context.supabase;

    // 1) Load every page
    const { data: pages, error: pagesErr } = await supabase
      .from("seo_pages").select("id, seo_title, meta_description, h1, short_intro, featured_image_url, og_image_url, robots_status, publication_status, path");
    if (pagesErr) throw new Error(pagesErr.message);

    const allIssues: Issue[] = [];
    for (const p of pages ?? []) allIssues.push(...pageIssuesFromRow(p));

    // 2) Section-count check per page
    const { data: sectionCounts } = await supabase
      .from("seo_page_sections").select("page_id").eq("visible", true);
    const counts = new Map<string, number>();
    for (const row of sectionCounts ?? []) counts.set(row.page_id, (counts.get(row.page_id) ?? 0) + 1);
    for (const p of pages ?? []) {
      const n = counts.get(p.id) ?? 0;
      if (p.publication_status === "published" && n < 3) {
        allIssues.push({ page_id: p.id, issue_type: "thin_content", severity: "warning", message: `Only ${n} visible sections — thin content.`, payload: { section_count: n } });
      }
    }

    // 3) Duplicates (trigram)
    const { data: dupes, error: dupErr } = await supabase.rpc("seo_find_similar_pages", { _threshold: data.similarityThreshold });
    if (dupErr) throw new Error(`similar-pages RPC failed: ${dupErr.message}`);
    for (const d of dupes ?? []) {
      const isTitle = d.title_sim >= data.similarityThreshold;
      const isMeta = d.meta_sim >= data.similarityThreshold;
      allIssues.push({
        page_id: d.a_id,
        issue_type: isTitle ? "duplicate_title" : "duplicate_meta",
        severity: "blocker",
        message: `Near-duplicate of ${d.b_path} (title ${Math.round(d.title_sim * 100)}%, meta ${Math.round(d.meta_sim * 100)}%).`,
        payload: { other_page_id: d.b_id, other_path: d.b_path, title_sim: d.title_sim, meta_sim: d.meta_sim },
      });
    }

    // 4) Orphans
    const { data: orphans, error: orphErr } = await supabase.rpc("seo_find_orphan_pages");
    if (orphErr) throw new Error(`orphan-pages RPC failed: ${orphErr.message}`);
    for (const o of orphans ?? []) {
      allIssues.push({ page_id: o.page_id, issue_type: "orphan_page", severity: "warning", message: `No internal links from other pages to ${o.path}.` });
    }

    // 5) Persist: clear unresolved issues for pages we just checked, then insert fresh
    const pageIds = (pages ?? []).map((p: any) => p.id);
    if (pageIds.length) {
      await supabase.from("seo_publication_issues").delete().in("page_id", pageIds).eq("resolved", false);
    }
    if (allIssues.length) {
      const { error: insErr } = await supabase.from("seo_publication_issues").insert(allIssues);
      if (insErr) throw new Error(`issue insert failed: ${insErr.message}`);
    }

    const blockers = allIssues.filter((i) => i.severity === "blocker").length;
    const warnings = allIssues.filter((i) => i.severity === "warning").length;
    const info = allIssues.filter((i) => i.severity === "info").length;
    return { pages: pages?.length ?? 0, blockers, warnings, info, total: allIssues.length };
  });

export const listSeoIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_publication_issues")
      .select("*, seo_pages:page_id(path, seo_title, publication_status)")
      .eq("resolved", false)
      .order("severity", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const resolveSeoIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("seo_publication_issues")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
