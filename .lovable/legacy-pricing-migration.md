# Legacy Vehicle Pricing Columns — Audit + Migration Plan

Status: **audit only, no columns dropped in Phase 1.**

## Scope

Columns on `public.vehicles` inherited from the pre-mileage-tier era:

- `base_fare` (numeric, nullable)
- `per_mile_rate` (numeric, nullable)
- `waiting_charge` (numeric, nullable)
- (`price_per_hour` lives on `hourly_rates`, **not** `vehicles` — see note)

## Read/write map

Grep sweep across `src/` on 2026-07-15.

| Column | Read sites | Write sites | Migration usage | Production pricing depends? | Admin form binding |
|---|---|---|---|---|---|
| `vehicles.base_fare` | none in pricing engine (`pricing-helpers.server.ts`, `pricing.functions.ts`); admin fleet list + form only | `src/routes/_authenticated/admin/fleet.tsx` (form state), `src/lib/admin.functions.ts` (`updateVehicle` schema line 242) | column present in generated types; no migration touches it | **No.** Pricing goes through `vehicle_pricing_profiles` + `vehicle_mileage_tiers` + `pricing_rules` | Yes (admin fleet drawer) |
| `vehicles.per_mile_rate` | same as above (admin only) | same | same | No | Yes |
| `vehicles.waiting_charge` | same as above (admin only) | same | same | No | Yes |
| `hourly_rates.price_per_hour` | `src/routes/_authenticated/admin/hourly-rate.tsx`; schema in `src/lib/admin.functions.ts` line 771 | admin hourly-rate CRUD | column is the primary key of the row | **Currently unused by public booking flow** — hourly tab has no server pricing wired (see `src/lib/pricing.functions.ts` has zero `hourly` references) | Yes |

Production booking pricing flows entirely through `calculateQuotes` in `src/lib/pricing.functions.ts`, which reads `vehicle_pricing_profiles` → `vehicle_mileage_tiers` → `pricing_rules` → `surcharges`. The three legacy `vehicles.*` columns are a **compatibility fallback** kept in the admin edit form but never consulted at quote time.

## Migration plan (deferred to a later phase)

Six migrations, applied at least one release apart so a rollback is always possible.

### M1 — Backfill snapshot (safety net)

```sql
-- Copy current legacy values into a snapshot table before removal.
CREATE TABLE public.vehicles_legacy_pricing_snapshot AS
SELECT id, base_fare, per_mile_rate, waiting_charge, now() AS snapped_at
FROM public.vehicles;
GRANT SELECT ON public.vehicles_legacy_pricing_snapshot TO service_role;
```

Validation: `SELECT count(*) FROM public.vehicles_legacy_pricing_snapshot;` matches `SELECT count(*) FROM public.vehicles;`.

### M2 — Compatibility period (soft removal from UI)

- Remove the three fields from the admin vehicle drawer (`admin/fleet.tsx`).
- Remove the fields from the `updateVehicle` Zod schema (`admin.functions.ts` lines 242–246 — leave `active`, `image_url`, capacity fields).
- Leave the columns in the DB.

Rollback: revert the two files; no data loss.

Compatibility window: 1 full release cycle where the admin cannot edit the legacy fields but the DB still stores them.

### M3 — Read-path removal

Search `src/` for any remaining reference:

```bash
rg -nF -e 'base_fare' -e 'per_mile_rate' -e 'waiting_charge' src/
```

Expected result: only `src/integrations/supabase/types.ts` (auto-generated, refreshes after M4). No handwritten reads should remain.

### M4 — Write-path removal (drop columns)

```sql
ALTER TABLE public.vehicles
  DROP COLUMN IF EXISTS base_fare,
  DROP COLUMN IF EXISTS per_mile_rate,
  DROP COLUMN IF EXISTS waiting_charge;
```

Regenerate `types.ts`. Rollback: `ALTER TABLE ... ADD COLUMN base_fare numeric` + `UPDATE ... FROM vehicles_legacy_pricing_snapshot`.

### M5 — Validation queries (post-drop)

```sql
-- No rows should reference the dropped columns.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'vehicles'
  AND column_name IN ('base_fare', 'per_mile_rate', 'waiting_charge');
-- expect: 0 rows

-- Quote engine still returns results.
SELECT count(*) FROM public.quote_calculations WHERE created_at > now() - interval '1 day';
```

### M6 — Snapshot cleanup

After one more release with no incidents:

```sql
DROP TABLE public.vehicles_legacy_pricing_snapshot;
```

## Hourly rates — separate decision

`hourly_rates.price_per_hour` is the row itself, not a legacy column. The public hourly booking tab has **no server pricing branch** (confirmed via grep on `pricing.functions.ts`). Recommendation:

1. Hide the Hourly tab from the public booking widget (see Phase 1 UI change).
2. Keep the `hourly_rates` table + admin page.
3. When re-enabling, add an `hourly` branch to `calculateQuotes` that reads `hourly_rates` by vehicle + duration.

No schema migration required for hourly.
