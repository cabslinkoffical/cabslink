/**
 * Public site status — currently just the admin "Maintenance mode" switch.
 *
 * Read through the publishable (anon) client: only the column-level granted
 * fields are readable, so nothing private leaks to the public site.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SiteStatus = { maintenance: boolean; company_name: string | null };

export const getSiteStatus = createServerFn({ method: "GET" }).handler(async (): Promise<SiteStatus> => {
  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
    const { data } = await client
      .from("site_settings_public" as any)
      .select("maintenance_mode, company_name")
      .eq("id", 1)
      .maybeSingle();
    return {
      maintenance: !!data?.maintenance_mode,
      company_name: data?.company_name ?? null,
    };
  } catch {
    // Never take the site down because the status lookup failed.
    return { maintenance: false, company_name: null };
  }
});
