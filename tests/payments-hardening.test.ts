import { describe, it, expect, vi } from "vitest";
import { checkoutInputSchema, confirmInputSchema } from "@/lib/payments.functions";
import {
  applyPaidSession,
  bookingUpdateForPayment,
  checkoutRefusal,
  createCheckoutForBooking,
  resolveStripeEnvForHost,
  verifyPaidSession,
  type BookingForPayment,
} from "@/lib/stripe-payments.server";

/** Minimal chainable fake of the Supabase query builder, recording writes. */
function fakeDb(booking: BookingForPayment | null) {
  const writes: Array<{ table: string; op: string; payload?: any }> = [];
  const db = {
    writes,
    from(table: string) {
      let op = "select";
      let payload: any;
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        is: () => builder,
        neq: () => builder,
        insert: (p: any) => { writes.push({ table, op: "insert", payload: p }); return Promise.resolve({ error: null }); },
        upsert: (p: any) => { writes.push({ table, op: "upsert", payload: p }); return Promise.resolve({ error: null }); },
        update: (p: any) => { op = "update"; payload = p; writes.push({ table, op, payload: p }); return builder; },
        delete: () => { writes.push({ table, op: "delete" }); return builder; },
        maybeSingle: () =>
          Promise.resolve(
            op === "update"
              ? { data: { status: payload.status ?? booking?.status, payment_status: payload.payment_status ?? booking?.payment_status }, error: null }
              : { data: table === "bookings" ? booking : null, error: null },
          ),
        then: (r: any) => r({ data: null, error: null }),
      };
      return builder;
    },
  };
  return db;
}

const booking = (over: Partial<BookingForPayment> = {}): BookingForPayment => ({
  id: "b1",
  booking_ref: "CL-261004-ABCD",
  price: 85,
  quoted_total: null,
  quote_expires_at: null,
  email: "a@example.com",
  status: "new",
  payment_status: "unpaid",
  ...over,
});

const session = (over: any = {}) => ({
  id: "cs_test_1234567890",
  payment_status: "paid",
  currency: "gbp",
  amount_total: 8500,
  metadata: { booking_ref: "CL-261004-ABCD" },
  created: 1_790_000_000,
  ...over,
});

describe("public checkout inputs", () => {
  it("strips amount, email and environment sent by the client", () => {
    const parsed = checkoutInputSchema.parse({
      bookingRef: "CL-261004-ABCD",
      returnUrl: "https://cabslink.com/booking/x",
      amountPence: 100,
      email: "attacker@example.com",
      environment: "sandbox",
    });
    expect(parsed).toEqual({ bookingRef: "CL-261004-ABCD", returnUrl: "https://cabslink.com/booking/x" });
    expect(Object.keys(confirmInputSchema.parse({ sessionId: "cs_test_1234567890", bookingRef: "CL-1", environment: "sandbox" } as any)))
      .toEqual(["sessionId", "bookingRef"]);
  });

  it("charges the saved fare, not anything from the browser", async () => {
    const create = vi.fn().mockResolvedValue({ client_secret: "sec" });
    const res = await createCheckoutForBooking(
      { bookingRef: "cl-261004-abcd", returnUrl: "https://cabslink.com/x", env: "live", stripe: { checkout: { sessions: { create } } } as any },
      { db: fakeDb(booking({ price: 85 })) },
    );
    expect(res).toEqual({ clientSecret: "sec", environment: "live" });
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(8500);
    expect(create.mock.calls[0][0].customer_email).toBe("a@example.com");
  });

  it.each(["cancelled", "rejected", "completed", "expired"])("refuses checkout for %s bookings", (status) => {
    expect(checkoutRefusal(booking({ status }))).not.toBeNull();
  });

  it("refuses paid bookings and expired quotes", () => {
    expect(checkoutRefusal(booking({ payment_status: "paid" }))).toMatch(/already paid/);
    expect(checkoutRefusal(booking({ price: null, quoted_total: 120, quote_expires_at: "2020-01-01T00:00:00Z" }))).toMatch(/expired/);
    expect(checkoutRefusal(booking({ price: null, quoted_total: 120 }))).toBeNull();
  });
});

describe("server-chosen Stripe environment", () => {
  it("uses live on production and unknown hosts, sandbox only on preview/dev", () => {
    expect(resolveStripeEnvForHost("cabslink.com")).toBe("live");
    expect(resolveStripeEnvForHost("www.cabslink.com")).toBe("live");
    expect(resolveStripeEnvForHost("cabslink.lovable.app")).toBe("live");
    expect(resolveStripeEnvForHost("some-new-domain.co.uk")).toBe("live");
    expect(resolveStripeEnvForHost("")).toBe("live");
    expect(resolveStripeEnvForHost("id-preview--e2d845db.lovable.app")).toBe("sandbox");
    expect(resolveStripeEnvForHost("project--e2d845db-dev.lovable.app")).toBe("sandbox");
    expect(resolveStripeEnvForHost("localhost:8080")).toBe("sandbox");
  });
});

describe("webhook verification", () => {
  it("accepts only paid GBP sessions for the exact fare and booking", () => {
    expect(verifyPaidSession(session(), booking())).toEqual({ ok: true, pence: 8500 });
    expect(verifyPaidSession(session({ amount_total: 100 }), booking())).toEqual({ ok: false, reason: "amount_mismatch" });
    expect(verifyPaidSession(session({ currency: "usd" }), booking())).toEqual({ ok: false, reason: "wrong_currency" });
    expect(verifyPaidSession(session({ payment_status: "unpaid" }), booking())).toEqual({ ok: false, reason: "not_paid" });
    expect(verifyPaidSession(session({ metadata: { booking_ref: "CL-OTHER" } }), booking())).toEqual({ ok: false, reason: "ref_mismatch" });
  });

  it("an amount mismatch changes nothing and logs payment_amount_mismatch", async () => {
    const db = fakeDb(booking());
    const notifyAdmin = vi.fn().mockResolvedValue(undefined);
    const res = await applyPaidSession({ session: session({ amount_total: 100 }) as any, env: "live" }, { db, notifyAdmin });
    expect(res.applied).toBe(false);
    expect(db.writes.filter((w) => w.table !== "activity_logs")).toEqual([]);
    expect(db.writes).toHaveLength(1);
    expect(db.writes[0].payload.action).toBe("payment_amount_mismatch");
    expect(notifyAdmin).toHaveBeenCalled();
  });

  it("a valid payment confirms a new booking and upserts the payment with Stripe's timestamp", async () => {
    const db = fakeDb(booking());
    const res = await applyPaidSession({ session: session() as any, env: "live", eventCreated: 1_790_000_100 }, { db });
    expect(res).toMatchObject({ applied: true, status: "confirmed", paymentStatus: "paid" });
    const upsert = db.writes.find((w) => w.op === "upsert")!;
    expect(upsert.payload.reference).toBe("cs_test_1234567890");
    expect(upsert.payload.paid_at).toBe(new Date(1_790_000_100 * 1000).toISOString());
  });
});

describe("late or repeated events", () => {
  it("never moves a completed or later-stage booking back to confirmed", () => {
    for (const status of ["completed", "assigned", "driver_en_route", "passenger_on_board", "in_progress", "cancelled"]) {
      const upd = bookingUpdateForPayment(booking({ status, payment_status: "paid" }), 8500);
      expect(upd?.status).toBeUndefined();
    }
    expect(bookingUpdateForPayment(booking({ status: "completed", payment_status: "paid" }), 8500)).toBeNull();
    expect(bookingUpdateForPayment(booking({ status: "pending_payment" }), 8500)?.status).toBe("confirmed");
  });

  it("a repeated webhook for a completed booking writes no booking update", async () => {
    const db = fakeDb(booking({ status: "completed", payment_status: "paid" }));
    const res = await applyPaidSession({ session: session() as any, env: "live" }, { db });
    expect(res).toMatchObject({ applied: true, status: "completed" });
    expect(db.writes.some((w) => w.table === "bookings")).toBe(false);
  });

  it("a refunded booking is not flipped back to paid", () => {
    expect(bookingUpdateForPayment(booking({ status: "confirmed", payment_status: "refunded" }), 8500)).toBeNull();
  });
});
