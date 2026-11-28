import { customerRefund } from "@/lib/customer-refund";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import type { LedgerRow } from "@/lib/payment-ledger";

/** Called only after the customer's booking identity or confirmation token has been verified. */
export async function loadCustomerRefund(db: any, bookingId: string, bookingRef: string) {
  const [request, payments] = await Promise.all([
    db.from("cancellation_requests").select("status, created_at, handled_at, refund_amount").eq("booking_ref", bookingRef).order("created_at", { ascending: false }).limit(1),
    fetchAllPages<LedgerRow>((from, to) => db.from("payments").select("id, amount, refunded_amount, status").eq("booking_id", bookingId).in("status", ["paid", "partial", "refunded"]).order("id").range(from, to)),
  ]);
  if (request.error) throw new Error("We couldn't check cancellation progress. Please try again.");
  return customerRefund(request.data?.[0] ?? null, payments);
}