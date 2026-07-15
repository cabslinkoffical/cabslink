import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicVehicle = {
  id: string;
  name: string;
  category: string;
  image_url: string;
  passengers: number;
  luggage: number;
  hand_luggage: number;
  description: string;
  featured: boolean;
  display_order: number;
};

export const listPublicVehicles = createServerFn({ method: "GET" }).handler(async (): Promise<PublicVehicle[]> => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client
    .from("vehicles")
    .select("id, name, category, image_url, passengers, luggage, hand_luggage, description, featured, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("listPublicVehicles failed", error);
    return [];
  }
  return (data ?? [])
    .filter((v: any) => !!v.image_url)
    .map((v: any) => ({
      id: v.id,
      name: (v.name ?? "").trim(),
      category: (v.category ?? "Vehicle").trim(),
      image_url: v.image_url,
      passengers: v.passengers ?? 0,
      luggage: v.luggage ?? 0,
      hand_luggage: v.hand_luggage ?? 0,
      description: (v.description ?? "").trim(),
      featured: !!v.featured,
      display_order: v.display_order ?? 0,
    }));
});
