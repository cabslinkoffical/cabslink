/**
 * Vehicles offered on the admin test-quote page. Only pricing vehicles that an
 * active vehicle class points at are real, quotable classes; leftover rows in
 * the old vehicles table (an unlinked duplicate "Saloon", "Coach Bus
 * (55-seater)") are hidden here, not deleted. Labels use the class name so
 * the list matches the booking form.
 */
export type PreviewVehicle = { id: string; name: string; active?: boolean | null; display_order?: number | null };
export type PreviewClass = { name: string; pricing_vehicle_id: string | null; active: boolean | null; display_order?: number | null };
export type PreviewProfile = { vehicle_id: string; status: boolean | null };

export function previewVehicleOptions(
  vehicles: PreviewVehicle[],
  classes: PreviewClass[],
  profiles: PreviewProfile[],
): { id: string; name: string }[] {
  const classByVehicle = new Map<string, PreviewClass>();
  for (const c of classes) if (c.active && c.pricing_vehicle_id) classByVehicle.set(c.pricing_vehicle_id, c);
  return vehicles
    .filter((v) => v.active !== false && classByVehicle.has(v.id) && profiles.some((p) => p.vehicle_id === v.id && p.status))
    .map((v) => ({ v, c: classByVehicle.get(v.id)! }))
    .sort((a, b) => Number(a.c.display_order ?? 0) - Number(b.c.display_order ?? 0))
    .map(({ v, c }) => ({ id: v.id, name: c.name }));
}
