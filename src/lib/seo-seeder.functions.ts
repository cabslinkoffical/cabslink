/**
 * Phase SEO-E — programmatic seeding of seo_pages from admin entities.
 * For each active location/airport/route with no existing seo_pages row,
 * create a DRAFT page with sensible defaults so admins can edit + publish.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

export const seedSeoPagesFromEntities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // ---- Locations ----
    const { data: locs } = await sb.from("seo_locations")
      .select("id, name, slug, nation, region, county")
      .in("operational_status", ["active", "partner"]);
    for (const l of locs ?? []) {
      const path = `/areas/${l.slug}`;
      const { data: existing } = await sb.from("seo_pages").select("id").eq("path", path).maybeSingle();
      if (existing) { skipped++; continue; }
      const region = l.region || l.nation || "the UK";
      const title = truncate(`${l.name} Airport Transfers & Private Travel | Cabslink`, 68);
      const meta = truncate(
        `Book reliable airport transfers and private travel in ${l.name}, ${region}. Fixed fares, 24/7 booking, flight tracking. Cabslink.`,
        170,
      );
      const { error } = await sb.from("seo_pages").insert({
        page_type: "location_hub",
        primary_entity_type: "location",
        primary_entity_id: l.id,
        slug: l.slug,
        path,
        seo_title: title,
        meta_description: meta,
        h1: `Private Airport Travel in ${l.name}`,
        short_intro: `Cabslink provides premium airport transfers and private travel throughout ${l.name} and ${region}. Fixed fares, 24/7 booking, and flight-tracking as standard.`,
        publication_status: "draft",
      });
      if (error) errors.push(`location ${l.slug}: ${error.message}`); else created++;
    }

    // ---- Airports ----
    const { data: airports } = await sb.from("seo_airports")
      .select("id, name, slug, iata_code")
      .not("iata_code", "is", null);
    for (const a of airports ?? []) {
      const iata = String(a.iata_code || "").toLowerCase();
      if (!iata) { skipped++; continue; }
      const path = `/airports/${iata}`;
      const { data: existing } = await sb.from("seo_pages").select("id").eq("path", path).maybeSingle();
      if (existing) { skipped++; continue; }
      const title = truncate(`${a.name} (${a.iata_code}) Transfers | Cabslink`, 68);
      const meta = truncate(
        `Pre-book ${a.name} (${a.iata_code}) airport transfers with Cabslink. Flight tracking, meet & greet, fixed fares. 24/7 UK-wide.`,
        170,
      );
      const { error } = await sb.from("seo_pages").insert({
        page_type: "airport_hub",
        primary_entity_type: "airport",
        primary_entity_id: a.id,
        slug: a.slug,
        path,
        seo_title: title,
        meta_description: meta,
        h1: `${a.name} Airport Transfers`,
        short_intro: `Reliable pre-booked transfers to and from ${a.name} (${a.iata_code}). Flight-tracking, meet & greet, and fixed transparent fares.`,
        publication_status: "draft",
      });
      if (error) errors.push(`airport ${iata}: ${error.message}`); else created++;
    }

    // ---- Popular routes ----
    const { data: routes } = await sb.from("seo_popular_routes")
      .select("id, slug, origin_entity_type, origin_entity_id, destination_entity_type, destination_entity_id")
      .in("operational_status", ["active", "partner"]);
    for (const r of routes ?? []) {
      const path = `/routes/${r.slug}`;
      const { data: existing } = await sb.from("seo_pages").select("id").eq("path", path).maybeSingle();
      if (existing) { skipped++; continue; }
      // Best-effort names
      const nameFor = async (t: string, id: string) => {
        if (t === "location") {
          const { data } = await sb.from("seo_locations").select("name").eq("id", id).maybeSingle();
          return data?.name;
        }
        if (t === "airport") {
          const { data } = await sb.from("seo_airports").select("name").eq("id", id).maybeSingle();
          return data?.name;
        }
        return null;
      };
      const oName = (await nameFor(r.origin_entity_type, r.origin_entity_id)) ?? r.slug;
      const dName = (await nameFor(r.destination_entity_type, r.destination_entity_id)) ?? r.slug;
      const title = truncate(`${oName} to ${dName} Private Transfer | Cabslink`, 68);
      const meta = truncate(
        `Fixed-fare private transfers from ${oName} to ${dName}. Professional drivers, 24/7 booking, flight tracking. Cabslink.`,
        170,
      );
      const { error } = await sb.from("seo_pages").insert({
        page_type: "city_to_city_route",
        primary_entity_type: r.origin_entity_type,
        primary_entity_id: r.origin_entity_id,
        secondary_entity_type: r.destination_entity_type,
        secondary_entity_id: r.destination_entity_id,
        slug: r.slug,
        path,
        seo_title: title,
        meta_description: meta,
        h1: `${oName} to ${dName} — Private Transfer`,
        short_intro: `Pre-book a fixed-fare private transfer between ${oName} and ${dName}. Professional drivers, executive vehicles, and 24/7 support.`,
        publication_status: "draft",
      });
      if (error) errors.push(`route ${r.slug}: ${error.message}`); else created++;
    }

    return { created, skipped, errors };
  });
