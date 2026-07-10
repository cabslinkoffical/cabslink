import { createClient } from "@supabase/supabase-js";
import { stubDistanceMiles, type PricingProfile } from "@/lib/pricing";

// -------------------------------------------------------------------
// Public client for anonymous quote reads
// -------------------------------------------------------------------
export function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

// -------------------------------------------------------------------
// Distance estimation (Google Maps if connector configured, else stub)
// -------------------------------------------------------------------
export async function estimateDistanceMiles(pickup: string, dropoff: string): Promise<{ miles: number; minutes: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (apiKey && lovableKey) {
    try {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/routes/distanceMatrix/v2:computeRouteMatrix",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": apiKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,duration,condition",
          },
          body: JSON.stringify({
            origins: [{ waypoint: { address: pickup }, routeModifiers: { avoidFerries: false } }],
            destinations: [{ waypoint: { address: dropoff } }],
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            regionCode: "GB",
          }),
          signal: AbortSignal.timeout(3500),
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ distanceMeters?: number; duration?: string; condition?: string }>;
        const first = Array.isArray(rows) ? rows[0] : null;
        if (first?.condition === "ROUTE_EXISTS" && first.distanceMeters) {
          const miles = Math.round((first.distanceMeters / 1609.34) * 100) / 100;
          const secs = first.duration ? parseInt(String(first.duration).replace(/[^\d]/g, ""), 10) || 0 : 0;
          const minutes = secs > 0 ? Math.round(secs / 60) : Math.round((miles / 35) * 60);
          return { miles, minutes };
        }
      }
    } catch {
      // fall through to stub
    }
  }
  const miles = stubDistanceMiles(pickup, dropoff);
  return { miles, minutes: Math.max(5, Math.round((miles / 35) * 60)) };
}

// -------------------------------------------------------------------
// Load all active pricing profiles + tiers + vehicle meta
// -------------------------------------------------------------------
export type LoadedProfile = PricingProfile & {
  vehicle: {
    id: string;
    name: string;
    category: string;
    image_url: string;
    passengers: number;
    luggage: number;
    hand_luggage: number;
  };
};

export async function loadActiveProfiles(client: ReturnType<typeof publicClient>): Promise<LoadedProfile[]> {
  const { data: profiles, error: pErr } = await client
    .from("vehicle_pricing_profiles" as any)
    .select("*")
    .eq("status", true);
  if (pErr) throw new Error(pErr.message);

  const ids = (profiles ?? []).map((p: any) => p.id);
  const vehicleIds = (profiles ?? []).map((p: any) => p.vehicle_id);

  const [tiersRes, vehiclesRes] = await Promise.all([
    client
      .from("vehicle_mileage_tiers" as any)
      .select("*")
      .in("pricing_profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true }),
    client
      .from("vehicles")
      .select("id, name, category, image_url, passengers, luggage, hand_luggage, active, display_order")
      .in("id", vehicleIds.length ? vehicleIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  if (tiersRes.error) throw new Error(tiersRes.error.message);
  if (vehiclesRes.error) throw new Error(vehiclesRes.error.message);
  const tiers = tiersRes.data;
  const vehicles = vehiclesRes.data;

  const tiersByProfile = new Map<string, any[]>();
  for (const t of tiers ?? []) {
    const list = tiersByProfile.get((t as any).pricing_profile_id) ?? [];
    list.push(t);
    tiersByProfile.set((t as any).pricing_profile_id, list);
  }
  const vehicleById = new Map((vehicles ?? []).map((v: any) => [v.id, v]));

  return (profiles ?? [])
    .map((p: any) => {
      const v: any = vehicleById.get(p.vehicle_id);
      if (!v || !v.active) return null;
      return {
        ...p,
        tiers: (tiersByProfile.get(p.id) ?? []).map((t: any) => ({
          id: t.id,
          tier_name: t.tier_name,
          miles: Number(t.miles),
          cost_per_mile: Number(t.cost_per_mile),
          sort_order: t.sort_order,
        })),
        vehicle: {
          id: v.id,
          name: v.name,
          category: v.category,
          image_url: v.image_url,
          passengers: v.passengers,
          luggage: v.luggage,
          hand_luggage: v.hand_luggage,
        },
      } as LoadedProfile;
    })
    .filter(Boolean) as LoadedProfile[];
}

// -------------------------------------------------------------------
// Area pickup / dropoff surcharges (from `addresses` table)
// -------------------------------------------------------------------
export type AreaSurcharge = { label: string; amount: number };
export async function loadAreaSurcharges(
  client: ReturnType<typeof publicClient>,
  pickup: string,
  dropoff: string,
): Promise<AreaSurcharge[]> {
  const { data } = await client
    .from("addresses")
    .select("name, comparable_value, pickup_charge, dropoff_charge")
    .eq("active", true);
  const rows = data ?? [];
  const p = pickup.toLowerCase();
  const d = dropoff.toLowerCase();
  const matchFor = (text: string) => {
    let best: { label: string; charge: number; len: number } | null = null;
    for (const r of rows as any[]) {
      const keys = [r.name, r.comparable_value].filter(Boolean) as string[];
      for (const k of keys) {
        const kl = k.toLowerCase();
        if (kl && text.includes(kl)) {
          if (!best || kl.length > best.len) {
            best = { label: r.name as string, charge: 0, len: kl.length };
          }
        }
      }
    }
    return best;
  };
  const out: AreaSurcharge[] = [];
  const pm = matchFor(p);
  if (pm) {
    const row = (rows as any[]).find((r) => r.name === pm.label);
    const amt = Number(row?.pickup_charge) || 0;
    if (amt > 0) out.push({ label: `Pickup area: ${pm.label}`, amount: amt });
  }
  const dm = matchFor(d);
  if (dm) {
    const row = (rows as any[]).find((r) => r.name === dm.label);
    const amt = Number(row?.dropoff_charge) || 0;
    if (amt > 0) out.push({ label: `Dropoff area: ${dm.label}`, amount: amt });
  }
  return out;
}
