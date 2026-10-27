import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { RelatedGroups } from "@/lib/related-links";

function serverPublicClient() {
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

/** Indexable airports, areas and tours used by the shared related-pages block. */
export const getRelatedLinkPool = createServerFn({ method: "GET" }).handler(async (): Promise<RelatedGroups> => {
  const sb = serverPublicClient();
  const [dest, tours] = await Promise.all([
    sb
      .from("destinations")
      .select("type,slug,name,display_name,lat,lng")
      .in("type", ["airport", "city", "town"])
      .eq("active", true)
      .eq("noindex", false)
      .neq("seo_tier", 4)
      .limit(500),
    sb.from("scenic_route_templates").select("slug,name").limit(200),
  ]);
  const rows = (dest.data ?? []) as Array<{ type: string; slug: string; name: string; display_name: string | null; lat: number | null; lng: number | null }>;
  const toCand = (r: (typeof rows)[number], seg: string) => ({
    href: `/${seg}/${r.slug}`,
    label: r.display_name || r.name,
    lat: r.lat,
    lng: r.lng,
  });
  return {
    airports: rows.filter((r) => r.type === "airport").map((r) => toCand(r, "airports")),
    areas: rows.filter((r) => r.type !== "airport").map((r) => toCand(r, "areas")),
    tours: ((tours.data ?? []) as Array<{ slug: string; name: string }>)
      .filter((t) => t.slug && t.name)
      .map((t) => ({ href: `/tours/${t.slug}`, label: t.name })),
  };
});

export const relatedLinkPoolQuery = () =>
  queryOptions({ queryKey: ["related-link-pool"], queryFn: () => getRelatedLinkPool(), staleTime: 10 * 60_000 });
