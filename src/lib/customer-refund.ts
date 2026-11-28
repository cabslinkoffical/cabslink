import type { LedgerRow } from "@/lib/payment-ledger";

export type CustomerRefund = { status: string; requestedAt: string | null; updatedAt: string | null; refundedPence: number; approvedPence: number | null };
export function customerRefund(request: { status: string; created_at?: string | null; handled_at?: string | null; refund_amount?: number | string | null } | null, payments: LedgerRow[]): CustomerRefund | null {
  const refundedPence = payments.reduce((sum, p) => sum + Math.max(0, Math.round(Number(p.refunded_amount ?? 0) * 100) || 0), 0);
  if (!request && !refundedPence) return null;
  return {
    status: request?.status ?? "recorded",
    requestedAt: request?.created_at ?? null,
    updatedAt: request?.handled_at ?? null,
    refundedPence,
    approvedPence: request?.refund_amount == null ? null : Math.round(Number(request.refund_amount) * 100),
  };
}
export function refundProgressLabel(r: CustomerRefund): string {
  if (r.status === "pending") return "Cancellation request received";
  if (r.status === "in_review") return "Cancellation under review";
  if (r.status === "declined") return "Cancellation request declined";
  if (r.status === "refunded" && r.approvedPence != null && r.refundedPence < r.approvedPence) return "Refund requires follow-up";
  if (r.refundedPence > 0) return "Refund recorded";
  return "Cancellation request closed";
}