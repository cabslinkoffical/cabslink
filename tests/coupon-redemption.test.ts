import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  redeemCouponOrRollback,
  COUPON_LIMIT_MESSAGE,
  COUPON_RETRY_MESSAGE,
  type RedemptionClient,
} from "@/lib/coupon-redemption";

function makeClient(rpcResult: { data: unknown; error: unknown } | Error) {
  const deleted: string[] = [];
  const client: RedemptionClient = {
    rpc: async () => {
      if (rpcResult instanceof Error) throw rpcResult;
      return rpcResult;
    },
    from: () => ({
      delete: () => ({
        eq: async (_col: string, val: string) => {
          deleted.push(val);
          return { error: null };
        },
      }),
    }),
  };
  return { client, deleted };
}

describe("coupon redemption semantics", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const input = { couponId: "c1", bookingId: "b1", email: " Foo@Bar.com ", discount: 10 };

  it("accepts a booking when redemption succeeds", async () => {
    const { client, deleted } = makeClient({ data: true, error: null });
    const out = await redeemCouponOrRollback(client, input);
    expect(out.ok).toBe(true);
    expect(deleted).toEqual([]);
  });

  it("rolls the discounted booking back when redemption is rejected (limit reached)", async () => {
    const { client, deleted } = makeClient({ data: false, error: null });
    const out = await redeemCouponOrRollback(client, input);
    expect(out).toMatchObject({ ok: false, message: COUPON_LIMIT_MESSAGE, rolledBack: true });
    expect(deleted).toEqual(["b1"]);
  });

  it("rolls back when the redemption routine errors", async () => {
    const { client, deleted } = makeClient({ data: null, error: { message: "deadlock" } });
    const out = await redeemCouponOrRollback(client, input);
    expect(out).toMatchObject({ ok: false, message: COUPON_RETRY_MESSAGE, rolledBack: true });
    expect(deleted).toEqual(["b1"]);
  });

  it("rolls back when the redemption call throws", async () => {
    const { client, deleted } = makeClient(new Error("network"));
    const out = await redeemCouponOrRollback(client, input);
    expect(out.ok).toBe(false);
    expect(deleted).toEqual(["b1"]);
  });

  it("normalises the email before recording the redemption", async () => {
    const seen: Record<string, unknown>[] = [];
    const client: RedemptionClient = {
      rpc: async (_n, args) => {
        seen.push(args);
        return { data: true, error: null };
      },
      from: () => ({ delete: () => ({ eq: async () => ({ error: null }) }) }),
    };
    await redeemCouponOrRollback(client, input);
    expect(seen[0]!["_email"]).toBe("foo@bar.com");
    expect(seen[0]!["_amount"]).toBe(10);
  });
});
