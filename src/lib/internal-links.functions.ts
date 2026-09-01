/**
 * Automated internal-linking engine.
 *
 * One public server function builds deterministic cross-link modules between
 * the three commercial entity families:
 *
 *   services  ↔  airports  ↔  locations
 *
 * Everything is derived from canonical sources — LOCATION/AIRPORT/ROUTE
 * identity from the `destinations` table, SERVICE identity from
 * `service-registry.ts`, combination pages from `service-locations.ts` — so
 * no page hand-maintains its own link list and every link resolves to a real
 * published URL.
 */
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { LinkModule } from "@/lib/internal-links";
import { publishedServices } from "@/lib/seo/service-registry";
import { servicePagesForLocation, localPagesForService } from "@/lib/seo/service-locations";

function sb() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const LOCATION_TYPES = ["location", "city", "town", "village"] as const;

type Row = {
  id: string;
  type: string;
  slug: string;
  name: string;
  display_name: string | null;
  region: string | null;
  council: string | null;
  lat: number | null;
  lng: number | null;
  seo_tier: number | null;
  meta: Record<string, unknown> | null;
};

function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearest(rows: Row[], center: { lat: number; lng: number } | null, limit: number) {
  const withCoords = rows.filter((r) => r.lat != null && r.lng != null);
  if (!center) {
    return rows
      .slice()
      .sort((a, b) => (a.seo_tier ?? 9) - (b.seo_tier ?? 9) || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((r) => ({ row: r, mi: null as number | null }));
  }
  return withCoords
    .map((r) => ({ row: r, mi: miles(center, { lat: Number(r.lat), lng: Number(r.lng) }) }))
    .sort((a, b) => a.mi - b.mi)
    .slice(0, limit);
}

const label = (r: Row) => r.display_name ?? r.name;
// Always emit the canonical full-slug URL. `/airports/:iata` still exists but
// 301-redirects, so internal links must never point at it.
const airportHref = (r: Row) => `/airports/${r.slug.toLowerCase()}`;

const airportLabel = (r: Row) => {
  const iata = (r.meta?.["iata"] as string | undefined) ?? "";
  const n = label(r);
  return iata && !n.includes(iata) ? `${n} (${iata.toUpperCase()})` : n;
};

export type LinkHub = { modules: LinkModule[] };

export const getLinkHub = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) =>
    z
      .object({
        kind: z.enum(["location", "airport", "service"]),
        /** Destination slug for location/airport, service id for service. */
        slug: z.string().trim().min(1).max(120),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<LinkHub> => {
    const supabase = sb();
    const { data: rows } = await supabase
      .from("destinations")
      .select("id,type,slug,name,display_name,region,council,lat,lng,seo_tier,meta")
      .eq("active", true)
      .eq("noindex", false)
      .in("type", [...LOCATION_TYPES, "airport"]);

    const all = (rows ?? []) as unknown as Row[];
    const airports = all.filter((r) => r.type === "airport");
    const locations = all.filter((r) => (LOCATION_TYPES as readonly string[]).includes(r.type));
    const services = publishedServices();

    const self =
      data.kind === "airport"
        ? airports.find((a) => a.slug === data.slug) ??
          airports.find((a) => ((a.meta?.["iata"] as string | undefined) ?? "").toLowerCase() === data.slug.toLowerCase()) ??
          null
        : data.kind === "location"
          ? locations.find((l) => l.slug === data.slug) ?? null
          : null;

    const center = self?.lat != null && self?.lng != null ? { lat: Number(self.lat), lng: Number(self.lng) } : null;
    const modules: LinkModule[] = [];

    if (data.kind === "location") {
      const name = self ? label(self) : data.slug;
      // Combination pages win when they exist; otherwise link the national service.
      const combos = new Map(servicePagesForLocation(data.slug).map((p) => [p.to, p.label]));
      modules.push({
        heading: `Services in ${name}`,
        links: services.slice(0, 6).map((s) => {
          const combo = [...combos.keys()].find((to) => to.startsWith(`${s.url}/`));
          return {
            href: combo ?? s.url,
            label: combo ? `${s.name} in ${name}` : s.name,
            sublabel: combo ? undefined : "UK-wide",
          };
        }),
      });
      modules.push({
        heading: `Airports near ${name}`,
        links: nearest(airports, center, 5).map(({ row, mi }) => ({
          href: airportHref(row),
          label: airportLabel(row),
          sublabel: mi != null ? `${mi.toFixed(0)} mi` : undefined,
        })),
      });
      modules.push({
        heading: `Areas near ${name}`,
        links: nearest(locations.filter((l) => l.id !== self?.id), center, 6).map(({ row, mi }) => ({
          href: `/areas/${row.slug}`,
          label: label(row),
          sublabel: mi != null ? `${mi.toFixed(0)} mi` : row.region ?? undefined,
        })),
      });
    }

    if (data.kind === "airport") {
      const name = self ? airportLabel(self) : data.slug.toUpperCase();
      modules.push({
        heading: `Popular transfer areas`,
        links: nearest(locations, center, 6).map(({ row, mi }) => ({
          href: `/areas/${row.slug}`,
          label: label(row),
          sublabel: mi != null ? `${mi.toFixed(0)} mi` : row.region ?? undefined,
        })),
      });
      modules.push({
        heading: `Services for ${name}`,
        links: services.slice(0, 6).map((s) => ({ href: s.url, label: s.name })),
      });
      modules.push({
        heading: "Other UK airports",
        links: nearest(airports.filter((a) => a.id !== self?.id), center, 5).map(({ row, mi }) => ({
          href: airportHref(row),
          label: airportLabel(row),
          sublabel: mi != null ? `${mi.toFixed(0)} mi` : undefined,
        })),
      });
    }

    if (data.kind === "service") {
      const svc = services.find((s) => s.id === data.slug);
      const locals = localPagesForService(data.slug);
      modules.push({
        heading: svc ? `${svc.name} by location` : "Popular locations",
        links: (locals.length
          ? locals.map((l) => ({ href: l.to, label: l.label }))
          : nearest(locations, null, 8).map(({ row }) => ({
              href: `/areas/${row.slug}`,
              label: label(row),
              sublabel: row.region ?? undefined,
            }))
        ).slice(0, 8),
      });
      modules.push({
        heading: "Transfers by airport",
        links: nearest(airports, null, 6).map(({ row }) => ({
          href: airportHref(row),
          label: airportLabel(row),
        })),
      });
      modules.push({
        heading: "Other services",
        links: services
          .filter((s) => s.id !== data.slug)
          .slice(0, 6)
          .map((s) => ({ href: s.url, label: s.name })),
      });
    }

    return { modules: modules.filter((m) => m.links.length > 0) };
  });

export const linkHubQuery = (kind: "location" | "airport" | "service", slug: string) =>
  queryOptions({
    queryKey: ["link-hub", kind, slug],
    queryFn: () => getLinkHub({ data: { kind, slug } }),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
