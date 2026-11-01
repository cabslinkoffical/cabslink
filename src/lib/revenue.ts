/**
 * One revenue policy for Dashboard, Reports and Analytics: money is counted
 * when it was settled (paid_at), falling back to created_at for older rows
 * that have no paid_at. Amounts are net of refunds. Filtering, totals and
 * chart buckets all use this same timestamp, so buckets always add up to the
 * period total.
 */
import { SETTLED_PAYMENT_STATUSES, retainedPence } from "@/lib/payment-ledger";

export type RevenueRow = {
  amount: number | string | null;
  refunded_amount?: number | string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at: string;
};

export { SETTLED_PAYMENT_STATUSES };

/** When the money was settled. */
export function settlementTime(p: Pick<RevenueRow, "paid_at" | "created_at">): string {
  return p.paid_at ?? p.created_at;
}

/** Net settled amount of one payment in pounds (refunds deducted). */
export function netRevenue(p: RevenueRow): number {
  return retainedPence({ amount: p.amount ?? 0, refunded_amount: p.refunded_amount, status: p.status ?? "paid" }) / 100;
}

/** True when the payment was settled inside [startIso, endIso] (inclusive). */
export function settledWithin(p: RevenueRow, startIso: string, endIso: string): boolean {
  const t = new Date(settlementTime(p)).getTime();
  return t >= new Date(startIso).getTime() && t <= new Date(endIso).getTime();
}

/**
 * PostgREST `or` filter selecting rows settled in the window under the same
 * policy: paid_at in range, or no paid_at and created_at in range.
 */
export function settlementWindowFilter(startIso: string, endIso: string): string {
  return `and(paid_at.gte.${startIso},paid_at.lte.${endIso}),and(paid_at.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`;
}

/** Total net revenue for rows settled in the window. */
export function revenueInWindow(rows: RevenueRow[], startIso: string, endIso: string): number {
  return round2(rows.filter((p) => settledWithin(p, startIso, endIso)).reduce((s, p) => s + netRevenue(p), 0));
}

/** Net revenue grouped by a bucket key derived from the settlement time. */
export function revenueByBucket(rows: RevenueRow[], bucket: (iso: string) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of rows) {
    const k = bucket(settlementTime(p));
    m.set(k, round2((m.get(k) ?? 0) + netRevenue(p)));
  }
  return m;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
