/**
 * Admin CRUD + validation for the CabsLink SEO system (Phase B).
 * All handlers require the admin role. Uses RLS-authenticated Supabase client.
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

const slug = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug must be kebab-case (lowercase letters, digits, hyphens).");
const optStr = z.string().max(2000).optional().nullable();
const optShort = z.string().max(300).optional().nullable();

// ============ LOCATIONS ============
const locationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  slug,
  location_type: z.enum(["country", "nation", "region", "county", "city", "town", "district"]),
  parent_id: z.string().uuid().optional().nullable(),
  country_code: z.string().min(2).max(3).default("GB"),
  nation: optShort, region: optShort, county: optShort,
  admin_area_1: optShort, admin_area_2: optShort,
  google_place_id: optShort,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  postcode_area: optShort,
  operational_status: z.enum(["active", "partner", "planned", "not_serviced"]).default("planned"),
  service_area_status: z.enum(["active", "partner", "planned", "not_serviced"]).default("planned"),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  display_priority: z.coerce.number().int().default(100),
});

export const listSeoLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_locations").select("*")
      .order("display_priority", { ascending: true }).order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertSeoLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => locationSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.published && data.operational_status === "not_serviced") {
      throw new Error("Cannot publish a location marked 'not serviced'.");
    }
    if (data.published && !data.google_place_id) {
      throw new Error("Published locations require a Google Place ID.");
    }
    const payload: any = { ...data };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_locations").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_locations").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_locations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ AIRPORTS ============
const airportSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  slug,
  iata_code: z.string().length(3).optional().nullable().or(z.literal("")),
  icao_code: z.string().length(4).optional().nullable().or(z.literal("")),
  google_place_id: optShort,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  terminal_information: optStr,
  pickup_instructions: optStr,
  dropoff_guidance: optStr,
  meet_and_greet_details: optStr,
  waiting_time_policy: optStr,
  flight_tracking_available: z.boolean().default(false),
  operating_hours_notes: optStr,
  parking_information: optStr,
  accessibility_notes: optStr,
  hero_image_url: optShort,
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  display_priority: z.coerce.number().int().default(100),
});

export const listSeoAirports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_airports").select("*").order("display_priority").order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertSeoAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => airportSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.published && !data.google_place_id) {
      throw new Error("Published airports require a Google Place ID.");
    }
    const payload: any = {
      ...data,
      iata_code: data.iata_code ? data.iata_code.toUpperCase() : null,
      icao_code: data.icao_code ? data.icao_code.toUpperCase() : null,
    };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_airports").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_airports").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_airports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SEO SERVICES ============
const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  slug,
  short_description: optShort,
  full_description: optStr,
  features: z.array(z.string().max(200)).default([]),
  eligibility: optStr,
  fleet_categories: z.array(z.string().max(80)).default([]),
  hero_image_url: optShort,
  legacy_route_path: optShort,
  published: z.boolean().default(false),
  display_priority: z.coerce.number().int().default(100),
});

export const listSeoServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_services").select("*").order("display_priority").order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertSeoService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => serviceSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_services").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_services").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ POPULAR ROUTES ============
const entityType = z.enum(["location", "airport", "tour", "port", "train_station", "service", "fleet_category"]);
const routeSchema = z.object({
  id: z.string().uuid().optional(),
  origin_entity_type: entityType,
  origin_entity_id: z.string().uuid(),
  destination_entity_type: entityType,
  destination_entity_id: z.string().uuid(),
  origin_place_id: z.string().min(3),
  destination_place_id: z.string().min(3),
  slug,
  bidirectional: z.boolean().default(true),
  applicable_service_ids: z.array(z.string().uuid()).default([]),
  applicable_vehicle_ids: z.array(z.string().uuid()).default([]),
  operational_status: z.enum(["active", "partner", "planned", "not_serviced"]).default("planned"),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  display_priority: z.coerce.number().int().default(100),
  route_notes: optStr,
  seasonal_notes: optStr,
});

export const listSeoRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_popular_routes").select("*").order("display_priority").order("slug");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertSeoRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => routeSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.origin_place_id === data.destination_place_id) {
      throw new Error("Origin and destination must be different places.");
    }
    if (data.published && data.operational_status === "not_serviced") {
      throw new Error("Cannot publish a route marked 'not serviced'.");
    }
    const payload: any = { ...data };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_popular_routes").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_popular_routes").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_popular_routes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SEO PAGES ============
const pageType = z.enum([
  "regional_hub", "location_hub", "location_service", "airport_hub", "airport_transfer",
  "airport_route", "city_to_city_route", "service", "fleet_category", "tour", "local_guide",
]);
const pubStatus = z.enum(["draft", "needs_content", "needs_review", "approved", "published", "noindex", "retired"]);

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  page_type: pageType,
  primary_entity_type: entityType,
  primary_entity_id: z.string().uuid(),
  secondary_entity_type: entityType.optional().nullable(),
  secondary_entity_id: z.string().uuid().optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
  vehicle_category: optShort,
  slug,
  path: z.string().min(1).max(300).regex(/^\/[a-z0-9\-\/]*$/i, "Path must start with / and be URL-safe."),
  seo_title: z.string().min(10).max(70),
  meta_description: z.string().min(50).max(180),
  h1: z.string().min(5).max(160),
  short_intro: z.string().max(600).optional().nullable(),
  canonical_override: optShort,
  robots_status: z.string().max(80).default("index,follow"),
  publication_status: pubStatus.default("draft"),
  featured_image_url: optShort,
  og_image_url: optShort,
  display_priority: z.coerce.number().int().default(100),
  canonical_parent_id: z.string().uuid().optional().nullable(),
  booking_cta_config: z.record(z.any()).default({}),
});

export const listSeoPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_pages").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

/**
 * Quality gate — used both on upsert (when publishing) and by the admin UI
 * to preview issues. Returns { blockers, warnings } without mutating anything.
 */
async function validatePageForPublish(ctx: { supabase: any }, page: any) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!page.seo_title || page.seo_title.length < 30) warnings.push("SEO title is short (aim for 30–60 chars).");
  if (page.seo_title && page.seo_title.length > 65) warnings.push("SEO title may truncate in SERP (>65 chars).");
  if (!page.meta_description || page.meta_description.length < 90) warnings.push("Meta description is short (aim for 90–160 chars).");
  if (!page.h1) blockers.push("Missing H1.");
  if (!page.short_intro || page.short_intro.length < 120) warnings.push("Short intro is thin (<120 chars).");
  if (!page.featured_image_url) warnings.push("No featured image set.");

  // Duplicate title/description across published pages
  const { data: dupTitle } = await ctx.supabase
    .from("seo_pages").select("id, path").eq("seo_title", page.seo_title).eq("publication_status", "published").neq("id", page.id ?? "00000000-0000-0000-0000-000000000000");
  if (dupTitle && dupTitle.length > 0) blockers.push(`Duplicate SEO title with published page: ${dupTitle[0].path}`);

  const { data: dupDesc } = await ctx.supabase
    .from("seo_pages").select("id, path").eq("meta_description", page.meta_description).eq("publication_status", "published").neq("id", page.id ?? "00000000-0000-0000-0000-000000000000");
  if (dupDesc && dupDesc.length > 0) blockers.push(`Duplicate meta description with published page: ${dupDesc[0].path}`);

  // Section count / minimum content
  if (page.id) {
    const { count } = await ctx.supabase
      .from("seo_page_sections").select("*", { count: "exact", head: true })
      .eq("page_id", page.id).eq("visible", true);
    if ((count ?? 0) < 3) warnings.push("Fewer than 3 visible content sections — page may be thin.");
  }

  return { blockers, warnings };
}

export const validateSeoPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: page, error } = await context.supabase.from("seo_pages").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const result = await validatePageForPublish(context, page);
    return { page, ...result };
  });

export const upsertSeoPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    if (data.publication_status === "published") {
      const { blockers } = await validatePageForPublish(context, data);
      if (blockers.length) throw new Error("Cannot publish — blockers: " + blockers.join(" · "));
    }

    const payload: any = { ...data };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_pages").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_pages").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SEO PAGE SECTIONS ============
const sectionType = z.enum([
  "hero", "intro", "service_overview", "local_travel_info", "airport_pickup_instructions",
  "route_overview", "route_facts", "fleet_recommendations", "popular_destinations",
  "nearby_airports", "nearby_cities", "relevant_services", "relevant_tours", "booking_cta",
  "faqs", "local_landmarks", "corporate_travel_info", "accessibility", "custom_rich_text",
]);
const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  page_id: z.string().uuid(),
  section_type: sectionType,
  position: z.coerce.number().int().default(0),
  heading: optShort,
  body: optStr,
  structured_payload: z.record(z.any()).default({}),
  visible: z.boolean().default(true),
});

export const listSeoPageSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ page_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("seo_page_sections").select("*")
      .eq("page_id", data.page_id).order("position");
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const upsertSeoPageSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => sectionSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_page_sections").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_page_sections").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoPageSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_page_sections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ REDIRECTS ============
const redirectSchema = z.object({
  id: z.string().uuid().optional(),
  from_path: z.string().regex(/^\/[a-z0-9\-\/]*$/i, "Path must start with /"),
  to_path: z.string().min(1).max(500),
  status_code: z.enum(["301", "308"]).default("301"),
  active: z.boolean().default(true),
  notes: optShort,
});

export const listSeoRedirects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("seo_redirects").select("*").order("from_path");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertSeoRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => redirectSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.from_path === data.to_path) throw new Error("Redirect cannot loop to itself.");
    // Prevent multi-hop chains: destination must not itself be a from_path.
    const { data: hop } = await context.supabase
      .from("seo_redirects").select("id").eq("from_path", data.to_path).eq("active", true).maybeSingle();
    if (hop) throw new Error("Destination path is itself an active redirect — would create a chain.");
    const payload: any = { ...data };
    if (payload.id) {
      const { error } = await context.supabase.from("seo_redirects").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase.from("seo_redirects").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteSeoRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("seo_redirects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SEO DASHBOARD ============
export const getSeoOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [loc, air, svc, rte, pg, red] = await Promise.all([
      context.supabase.from("seo_locations").select("published, operational_status", { count: "exact", head: false }),
      context.supabase.from("seo_airports").select("published", { count: "exact", head: false }),
      context.supabase.from("seo_services").select("published", { count: "exact", head: false }),
      context.supabase.from("seo_popular_routes").select("published", { count: "exact", head: false }),
      context.supabase.from("seo_pages").select("publication_status"),
      context.supabase.from("seo_redirects").select("active", { count: "exact", head: false }),
    ]);
    const byStatus: Record<string, number> = {};
    for (const p of pg.data ?? []) byStatus[p.publication_status] = (byStatus[p.publication_status] ?? 0) + 1;
    return {
      locations: { total: loc.data?.length ?? 0, published: loc.data?.filter((r: any) => r.published).length ?? 0 },
      airports: { total: air.data?.length ?? 0, published: air.data?.filter((r: any) => r.published).length ?? 0 },
      services: { total: svc.data?.length ?? 0, published: svc.data?.filter((r: any) => r.published).length ?? 0 },
      routes: { total: rte.data?.length ?? 0, published: rte.data?.filter((r: any) => r.published).length ?? 0 },
      pages: { total: pg.data?.length ?? 0, byStatus },
      redirects: { total: red.data?.length ?? 0, active: red.data?.filter((r: any) => r.active).length ?? 0 },
    };
  });
