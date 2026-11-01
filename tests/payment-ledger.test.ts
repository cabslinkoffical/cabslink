import { describe, it, expect, vi } from "vitest";
import { allocateCardRefund, derivePaymentStatus, netCollectedPence } from "@/lib/payment-ledger";
import { applyPaidSession, handleChargeRefunded, payableBookingPence } from "@/lib/stripe-payments.server";
import { issueCancellationRefund } from "@/lib/cancellation-refunds.server";
import { settleAmendmentPayment } from "@/lib/amendment-settlement.server";

/** Stateful in-memory Supabase fake: tables of rows, filters applied for real. */
function memoryDb(tables: Record<string, any[]>) {
  let seq = 0;
  const db: any = {
    tables,
    from(table: string) {
      tables[table] ??= [];
      const filters: Array<(r: any) => boolean> = [];
      let op: "select" | "update" | "insert" = "select";
      let patch: any = null;
      let range: [number, number] | null = null;
      const rows = () => tables[table].filter((r) => filters.every((f) => f(r)));
      const run = () => {
        if (op === "update") {
          const hit = rows();
          hit.forEach((r) => Object.assign(r, patch));
          return { data: hit.map((r) => ({ ...r })), error: null };
        }
        const all = rows().map((r) => ({ ...r }));
        return { data: range ? all.slice(range[0], range[1] + 1) : all, error: null };
      };
      const b: any = {
        select: () => b,
        eq: (c: string, v: any) => { filters.push((r) => r[c] === v); return b; },
        is: (c: string, v: any) => { filters.push((r) => (r[c] ?? null) === v); return b; },
        in: (c: string, v: any[]) => { filters.push((r) => v.includes(r[c])); return b; },
        order: () => b,
        range: (a: number, z: number) => { range = [a, z]; return Promise.resolve(run()); },
        update: (p: any) => { op = "update"; patch = p; return b; },
        insert: (p: any) => {
          for (const row of Array.isArray(p) ? p : [p]) tables[table].push({ id: `${table}-${++seq}`, ...row });
          return Promise.resolve({ error: null });
        },
        upsert: (p: any) => { tables[table].push({ id: `${table}-${++seq}`, ...p }); return Promise.resolve({ error: null }); },
        maybeSingle: () => { const r = run(); return Promise.resolve({ data: r.data[0] ?? null, error: null }); },
        then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
      };
      return b;
    },
  };
  return db;
}

const booking = (over: any = {}) => ({
  id: "b1", booking_ref: "CL-261004-ABCD", price: 120, quoted_total: null, quote_expires_at: null,
  email: "a@example.com", customer_name: "A", status: "confirmed", payment_status: "paid", ...over,
});
const card = (id: string, amount: number, over: any = {}) => ({
  id, booking_id: "b1", amount, refunded_amount: 0, status: "paid", method: "card",
  payment_intent_id: `pi_${id}`, reference: `cs_${id}`, environment: "live", created_at: `2026-10-0${id.length}T00:00:00Z`, ...over,
});

describe("P05 — balances use money actually held", () => {
  it("a £100 payment with £20 refunded still counts £80", () => {
    expect(netCollectedPence([{ amount: 100, refunded_amount: 20, status: "partial" }])).toBe(8000);
  });

  it("derives paid / partial / refunded / unpaid from the ledger", () => {
    expect(derivePaymentStatus(12000, [{ amount: 85, status: "paid" }, { amount: 35, status: "paid" }])).toBe("paid");
    expect(derivePaymentStatus(12000, [{ amount: 85, status: "paid" }])).toBe("partial");
    expect(derivePaymentStatus(12000, [{ amount: 85, refunded_amount: 85, status: "refunded" }])).toBe("refunded");
    expect(derivePaymentStatus(12000, [])).toBe("unpaid");
  });

  it("checkout for a partly refunded booking charges only the real remaining balance", async () => {
    const db = memoryDb({ payments: [card("a", 100, { refunded_amount: 20, status: "partial" })] });
    expect(await payableBookingPence(db, booking({ price: 100, payment_status: "partial" }) as any)).toBe(2000);
  });

  it("fully refunding one of two charges leaves the booking partly paid, not refunded", async () => {
    const db = memoryDb({ bookings: [booking()], payments: [card("a", 85), card("bb", 35)], activity_logs: [] });
    await handleChargeRefunded({ id: "ch", payment_intent: "pi_bb", amount: 3500, amount_refunded: 3500 } as any, "live", { db });
    expect(db.tables.payments.find((p: any) => p.id === "bb")).toMatchObject({ status: "refunded", refunded_amount: 35 });
    expect(db.tables.bookings[0].payment_status).toBe("partial");
  });

  it("a partial refund webhook records the refunded amount and an older replay never lowers it", async () => {
    const db = memoryDb({ bookings: [booking({ price: 100 })], payments: [card("a", 100)], activity_logs: [] });
    await handleChargeRefunded({ id: "ch", payment_intent: "pi_a", amount: 10000, amount_refunded: 3000 } as any, "live", { db });
    await handleChargeRefunded({ id: "ch", payment_intent: "pi_a", amount: 10000, amount_refunded: 2000 } as any, "live", { db });
    expect(db.tables.payments[0]).toMatchObject({ status: "partial", refunded_amount: 30 });
    expect(db.tables.bookings[0].payment_status).toBe("partial");
  });

  it("a full single-charge refund marks the booking refunded", async () => {
    const db = memoryDb({ bookings: [booking({ price: 85 })], payments: [card("a", 85)], activity_logs: [] });
    await handleChargeRefunded({ id: "ch", payment_intent: "pi_a", amount: 8500, amount_refunded: 8500 } as any, "live", { db });
    expect(db.tables.bookings[0].payment_status).toBe("refunded");
  });
});

describe("P01 — replaying a refunded checkout session", () => {
  const session = { id: "cs_a", payment_status: "paid", currency: "gbp", amount_total: 8500, metadata: { booking_ref: "CL-261004-ABCD" }, created: 1_790_000_000 } as any;

  it.each([
    ["fully", { status: "refunded", refunded_amount: 85 }, "refunded"],
    ["partly", { status: "partial", refunded_amount: 20 }, "partial"],
  ])("a %s refunded session replay leaves the ledger and booking untouched", async (_l, over, bookingState) => {
    const db = memoryDb({ bookings: [booking({ price: 85, payment_status: bookingState })], payments: [card("a", 85, over)], activity_logs: [] });
    const before = JSON.stringify(db.tables.payments);
    const res = await applyPaidSession({ session, env: "live" }, { db });
    expect(res).toMatchObject({ applied: false, reason: "already_recorded" });
    expect(JSON.stringify(db.tables.payments)).toBe(before);
    expect(db.tables.bookings[0].payment_status).toBe(bookingState);
  });
});

describe("P02 — cancellation refunds over several card charges", () => {
  const stripe = () => {
    const create = vi.fn(async (args: any) => ({ id: `re_${args.payment_intent}_${args.amount}` }));
    return { create, stripeFor: () => ({ refunds: { create } }) };
  };

  it("allocates newest first by what each charge still holds", () => {
    const { allocations, manualPence } = allocateCardRefund(
      [card("a", 85, { created_at: "2026-10-01" }), card("bb", 35, { created_at: "2026-10-05" })], 12000);
    expect(allocations.map((a) => [a.row.id, a.pence])).toEqual([["bb", 3500], ["a", 8500]]);
    expect(manualPence).toBe(0);
  });

  it("refunds £120 as £35 + £85 across the original payment and top-up", async () => {
    const s = stripe();
    const db = memoryDb({ bookings: [booking()], payments: [card("a", 85, { created_at: "2026-10-01" }), card("bb", 35, { created_at: "2026-10-05" })], activity_logs: [] });
    const res = await issueCancellationRefund({ db, requestId: "r1", bookingId: "b1", refundPence: 12000, actorId: "u", stripeFor: s.stripeFor });
    expect(s.create.mock.calls.map((c) => [c[0].payment_intent, c[0].amount])).toEqual([["pi_bb", 3500], ["pi_a", 8500]]);
    expect(res).toMatchObject({ refundedToCardPence: 12000, manualPence: 0 });
    expect(db.tables.bookings[0].payment_status).toBe("refunded");
  });

  it("respects an earlier partial refund and leaves cash for manual repayment", async () => {
    const s = stripe();
    const db = memoryDb({
      bookings: [booking()],
      payments: [card("a", 85, { refunded_amount: 10, status: "partial" }), { id: "cash", booking_id: "b1", amount: 35, refunded_amount: 0, status: "paid", method: "cash", reference: null }],
      activity_logs: [],
    });
    const res = await issueCancellationRefund({ db, requestId: "r1", bookingId: "b1", refundPence: 11000, actorId: "u", stripeFor: s.stripeFor });
    expect(s.create).toHaveBeenCalledTimes(1);
    expect(s.create.mock.calls[0][0]).toMatchObject({ payment_intent: "pi_a", amount: 7500 });
    expect(res.manualPence).toBe(3500);
    expect(res.note).toMatch(/£35\.00 to pay back manually/);
    expect(db.tables.payments.find((p: any) => p.id === "cash")).toMatchObject({ status: "paid", refunded_amount: 0 });
  });

  it("a retry after a failed second refund only refunds the remainder", async () => {
    const db = memoryDb({ bookings: [booking()], payments: [card("a", 85, { created_at: "2026-10-01" }), card("bb", 35, { created_at: "2026-10-05" })], activity_logs: [] });
    const failing = vi.fn()
      .mockResolvedValueOnce({ id: "re_1" })
      .mockRejectedValueOnce(new Error("card_declined"));
    await expect(issueCancellationRefund({ db, requestId: "r1", bookingId: "b1", refundPence: 12000, actorId: "u", stripeFor: () => ({ refunds: { create: failing } }) }))
      .rejects.toThrow(/Retrying will refund only the remainder/);
    const s = stripe();
    await issueCancellationRefund({ db, requestId: "r1", bookingId: "b1", refundPence: 12000, actorId: "u", stripeFor: s.stripeFor });
    expect(s.create.mock.calls.map((c) => [c[0].payment_intent, c[0].amount])).toEqual([["pi_a", 8500]]);
  });
});

describe("P03 — applying a change request does not invent payment", () => {
  it("marking an old amendment paid keeps a newer top-up due", async () => {
    // Fare £150 after two amendments: £85 original paid; old +£35 marked paid by staff; newer +£30 still due.
    const db = memoryDb({
      bookings: [booking({ price: 150, payment_status: "partial" })],
      payments: [card("a", 85)],
      booking_amendments: [{ id: "old", booking_id: "b1", booking_ref: "CL-261004-ABCD", delta: 35, top_up_paid_at: null }],
      activity_logs: [],
    });
    const res = await settleAmendmentPayment({ db, amendmentId: "old", markPaid: true, actorId: "u" });
    expect(res.recordedPence).toBe(3500);
    expect(db.tables.bookings[0].payment_status).toBe("partial");
    expect(await payableBookingPence(db, db.tables.bookings[0])).toBe(3000);
    // A second click records nothing more.
    await settleAmendmentPayment({ db, amendmentId: "old", markPaid: true, actorId: "u" });
    expect(db.tables.payments).toHaveLength(2);
  });

  it("applying without marking paid leaves the booking partial", async () => {
    const db = memoryDb({
      bookings: [booking({ price: 120, payment_status: "partial" })],
      payments: [card("a", 85)],
      booking_amendments: [{ id: "x", booking_id: "b1", delta: 35, top_up_paid_at: null }],
    });
    await settleAmendmentPayment({ db, amendmentId: "x", markPaid: false, actorId: "u" });
    expect(db.tables.bookings[0].payment_status).toBe("partial");
    expect(db.tables.payments).toHaveLength(1);
  });
});
