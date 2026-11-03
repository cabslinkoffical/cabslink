// Cancellation cover chosen at checkout. One place for its price change,
// label and refund promise, so the form, saved booking, emails, Manage
// Booking and admin all say the same thing. Browser-safe (no server imports).

export type CancellationCover = "standard" | "non_refundable" | "flexible";

export type CoverSettings = {
  nonRefundablePercent: number;
  nonRefundableMinPence: number;
  flexiblePercent: number;
  flexibleMinPence: number;
};

export function parseCover(v: unknown): CancellationCover | null {
  return v === "standard" || v === "non_refundable" || v === "flexible" ? v : null;
}

/** Price change in GBP for a cover on a given fare: negative saving or positive charge. */
export function coverDelta(cover: CancellationCover, fare: number, cfg: CoverSettings): number {
  if (cover === "non_refundable") {
    return -Math.max(cfg.nonRefundableMinPence / 100, Math.round(fare * (cfg.nonRefundablePercent / 100) * 100) / 100);
  }
  if (cover === "flexible") {
    return Math.max(cfg.flexibleMinPence / 100, Math.round(fare * (cfg.flexiblePercent / 100) * 100) / 100);
  }
  return 0;
}

export function coverName(cover: CancellationCover): string {
  return cover === "non_refundable" ? "Non-refundable" : cover === "flexible" ? "Flexible" : "Standard";
}

/** What the customer was promised when choosing the cover (matches checkout). */
export function coverPromise(cover: CancellationCover): string {
  return cover === "non_refundable"
    ? "No refund if you cancel after confirmation"
    : cover === "flexible"
    ? "Full refund if you cancel up to 1 hour before pickup"
    : "Full refund if you cancel up to 24 hours before pickup";
}

/** e.g. "Flexible (+£4.20)", "Non-refundable (−£2.00)", "Standard". Null when not recorded. */
export function coverLabel(coverRaw: unknown, amountRaw?: unknown): string | null {
  const cover = parseCover(coverRaw);
  if (!cover) return null;
  const amount = amountRaw == null || amountRaw === "" ? null : Number(amountRaw);
  if (amount == null || !Number.isFinite(amount) || amount === 0) return coverName(cover);
  const sign = amount < 0 ? "−" : "+";
  return `${coverName(cover)} (${sign}£${Math.abs(amount).toFixed(2)})`;
}
