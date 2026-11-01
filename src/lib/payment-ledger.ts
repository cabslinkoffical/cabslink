/**
 * Pure payment-ledger rules shared by checkout, webhooks, cancellations and
 * change requests. The booking's payment state is always derived from the
 * money actually held (payments minus refunds) against the current fare —
 * never copied from a single charge or workflow step.
 */

/** Payment rows whose money was collected at some point (some may be refunded). */
export const SETTLED_PAYMENT_STATUSES = ["paid", "partial", "refunded"] as const;

export type LedgerRow = {
  id?: string;
  amount: number | string;
  refunded_amount?: number | string | null;
  status?: string | null;
  reference?: string | null;
  method?: string | null;
  payment_intent_id?: string | null;
  environment?: string | null;
  created_at?: string | null;
};

export type DerivedPaymentStatus = "paid" | "partial" | "refunded" | "unpaid";

const pence = (v: number | string | null | undefined) => {
  const n = Math.round(Number(v ?? 0) * 100);
  return Number.isFinite(n) ? n : 0;
};

/** Pence still held from one payment row (amount minus what was refunded). */
export function retainedPence(row: LedgerRow): number {
  if (row.status && !(SETTLED_PAYMENT_STATUSES as readonly string[]).includes(row.status)) return 0;
  return Math.max(0, pence(row.amount) - Math.max(0, pence(row.refunded_amount)));
}

/** Total pence held across the ledger. */
export function netCollectedPence(rows: LedgerRow[]): number {
  return rows.reduce((sum, r) => sum + retainedPence(r), 0);
}

/** Booking payment state from the ledger and the current fare (in pence). */
export function derivePaymentStatus(farePence: number | null, rows: LedgerRow[]): DerivedPaymentStatus {
  const net = netCollectedPence(rows);
  const anyRefund = rows.some((r) => pence(r.refunded_amount) > 0 || r.status === "refunded");
  if (farePence != null && farePence > 0 && net >= farePence) return "paid";
  if (net > 0) return farePence == null ? "paid" : "partial";
  return anyRefund ? "refunded" : "unpaid";
}

export type RefundAllocation = { row: LedgerRow; pence: number; fullyRefunded: boolean };

/**
 * Spread a refund over card charges, newest first, never exceeding what each
 * charge still holds. Whatever cannot be refunded to a card (cash, or more
 * than the cards hold) is returned as `manualPence` for staff to pay back.
 */
export function allocateCardRefund(rows: LedgerRow[], refundPence: number): { allocations: RefundAllocation[]; manualPence: number } {
  const cards = rows
    .filter((r) => r.method === "card" && r.payment_intent_id && retainedPence(r) > 0)
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  let left = Math.max(0, Math.round(refundPence));
  const allocations: RefundAllocation[] = [];
  for (const row of cards) {
    if (left <= 0) break;
    const available = retainedPence(row);
    const take = Math.min(available, left);
    allocations.push({ row, pence: take, fullyRefunded: take === available });
    left -= take;
  }
  return { allocations, manualPence: left };
}
