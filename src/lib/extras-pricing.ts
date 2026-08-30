/**
 * Canonical Extras resolution (pure — shared by the quote engine, the booking
 * engine and tests).
 *
 * The admin `extras` catalogue is the single source of truth for add-on
 * prices. Each extra either applies to every vehicle class, or only to the
 * classes linked through `extra_vehicle_classes` — and each link may override
 * the price for that class.
 *
 * Legacy `site_settings` fees remain ONLY as a migration fallback: they are
 * used when no active canonical extra with that key exists. An active
 * canonical extra always wins.
 */

export type ExtraCatalogueEntry = {
  key: string;
  active: boolean;
  price_pence: number;
  applies_to_all_classes: boolean;
  /** How the price multiplies against the chosen quantity. */
  price_basis?: "per_unit" | "per_booking" | "per_hour";
  /** classId → override pence (null = use the extra's own price). */
  class_prices: Record<string, number | null>;
};

export type ExtrasCatalogue = ExtraCatalogueEntry[];

export type ResolvedExtra = {
  /** Effective price in pence for this class (0 when not bookable). */
  pence: number;
  /** False when a canonical extra exists but is not offered for this class. */
  available: boolean;
  source: "canonical" | "legacy";
};

/**
 * Effective price of one extra for one vehicle class.
 * `legacyPence` is the site_settings fallback (pre-Extras compatibility).
 */
export function resolveExtra(
  catalogue: ExtrasCatalogue,
  key: string,
  classId: string | null | undefined,
  legacyPence: number,
): ResolvedExtra {
  const entry = catalogue.find((e) => e.key === key && e.active);
  if (!entry) {
    return { pence: Math.max(0, Math.round(Number(legacyPence) || 0)), available: true, source: "legacy" };
  }

  const linkedClassIds = Object.keys(entry.class_prices);
  const base = Math.max(0, Math.round(Number(entry.price_pence) || 0));

  if (!entry.applies_to_all_classes) {
    if (!classId || !linkedClassIds.includes(classId)) {
      return { pence: 0, available: false, source: "canonical" };
    }
  }

  const override = classId ? entry.class_prices[classId] : undefined;
  const pence = override === null || override === undefined ? base : Math.max(0, Math.round(Number(override) || 0));
  return { pence, available: true, source: "canonical" };
}

/** Convenience: effective pence only (0 when the extra isn't offered). */
export function extraPence(
  catalogue: ExtrasCatalogue,
  key: string,
  classId: string | null | undefined,
  legacyPence: number,
): number {
  return resolveExtra(catalogue, key, classId, legacyPence).pence;
}
