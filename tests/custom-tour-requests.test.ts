import { describe, it, expect, vi, beforeEach } from "vitest";
import { normaliseCustomTourRef, quoteRequestReason, customTourLookupSchema } from "@/lib/custom-tour-requests";

// ---- mocks for the server handlers -------------------------------------
const inserted: any[] = [];
const state = { row: null as any, notes: [] as any[] };

function table(name: string) {
  if (name === "custom_tour_requests") {
    return {
      insert: (payload: any) => {
        inserted.push(payload);
        return { select: () => ({ single: async () => ({ data: { id: "r1", reference_code: "CL-CT-2026-00007" }, error: null }) }) };
      },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }),
    };
  }
  // notes
  return {
    select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: state.notes, error: null }) }) }) }) }),
  };
}
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (n: string) => table(n) } }));
vi.mock("@/lib/notifications.server", () => ({
  sendAndLog: vi.fn(async () => ({ ok: true, configured: true, logId: null, providerMessageId: null })),
  getAdminNotificationEmail: vi.fn(async () => null),
}));
const quoteTourImpl = vi.fn();
vi.mock("@/lib/tour-quote.server", () => ({
  loadTourConfig: async () => ({
    tiers: [],
    rules: { minimum_stop_minutes: 10 },
    classes: [{ id: "11111111-1111-4111-8111-111111111111", name: "Executive Saloon", max_passengers: 4 }],
  }),
  quoteTourImpl: (...a: any[]) => quoteTourImpl(...a),
  quoteTourGroupImpl: (...a: any[]) => quoteTourImpl(...a),
  measureLoop: async () => ({ miles: 120, driveMinutes: 180, estimated: false }),
}));

const base = {
  startPlaceId: "ChIJstart0000",
  startLabel: "Waverley Station, Edinburgh",
  hours: 8,
  vehicleClassId: "11111111-1111-4111-8111-111111111111",
  passengers: 3,
  luggage: 2,
  stops: [{ placeId: "ChIJstop00001", name: "Stirling Castle", dwellMinutes: 90 }],
  date: "2099-06-01",
  time: "09:00",
  name: "Jane Test",
  email: "Jane@Example.com",
  phone: "07700900123",
  website: "",
};

beforeEach(() => {
  inserted.length = 0;
  quoteTourImpl.mockReset();
});

describe("custom tour reference", () => {
  it("tidies typed references into CL-CT-YYYY-NNNNN", () => {
    expect(normaliseCustomTourRef(" cl ct 2026 00482 ")).toBe("CL-CT-2026-00482");
    expect(normaliseCustomTourRef("cl-ct-2026-00482")).toBe("CL-CT-2026-00482");
  });

  it("status lookup needs both a CL-CT reference and an email", () => {
    expect(customTourLookupSchema.safeParse({ reference: "CL-CT-2026-00482", email: "a@b.co" }).success).toBe(true);
    expect(customTourLookupSchema.safeParse({ reference: "ABC123", email: "a@b.co" }).success).toBe(false);
    expect(customTourLookupSchema.safeParse({ reference: "CL-CT-2026-00482", email: "" }).success).toBe(false);
  });
});

describe("when the wizard offers Request a quote", () => {
  it("offers it when the price check fails", () => {
    expect(quoteRequestReason({ priceError: "boom", vehicleFits: true })).not.toBeNull();
  });
  it("offers it when no single vehicle seats the group", () => {
    expect(quoteRequestReason({ vehicleFits: false })).not.toBeNull();
  });
  it("offers it when the day is blocked", () => {
    expect(quoteRequestReason({ blockedReason: "Too long", total: 300, vehicleFits: true })).toBe("Too long");
  });
  it("offers it when the vehicle has no tour price (zero total)", () => {
    expect(quoteRequestReason({ total: 0, vehicleFits: true })).not.toBeNull();
  });
  it("does not push it when a reliable price exists", () => {
    expect(quoteRequestReason({ total: 420, vehicleFits: true })).toBeNull();
  });
});

describe("saving a custom tour request", () => {
  it("still saves the request when the instant price fails, with no estimate", async () => {
    quoteTourImpl.mockRejectedValue(new Error("We couldn't route every stop on this tour."));
    const { createCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
    const res = await createCustomTourRequestImpl(base as any, { skipChecks: true });
    expect(res.reference).toBe("CL-CT-2026-00007");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].estimated_total).toBeNull();
    expect(inserted[0].price_note).toContain("couldn't route");
    expect(inserted[0].route_miles).toBe(120);
    expect(inserted[0].email).toBe("jane@example.com");
  });

  it("keeps a reliable instant price as the estimate", async () => {
    quoteTourImpl.mockResolvedValue({ quote: { total: 420, routeMiles: 95.44, driveMinutes: 150.2, dwellTotalMinutes: 90, blockedReason: null } });
    const { createCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
    await createCustomTourRequestImpl(base as any, { skipChecks: true });
    expect(inserted[0].estimated_total).toBe(420);
    expect(inserted[0].route_miles).toBe(95.4);
    expect(inserted[0].price_note).toBeNull();
  });

  it("refuses a tour date in the past", async () => {
    const { createCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
    await expect(createCustomTourRequestImpl({ ...base, date: "2000-01-01" } as any, { skipChecks: true })).rejects.toThrow(/today/);
    expect(inserted).toHaveLength(0);
  });
});

describe("customer status lookup", () => {
  const row = {
    id: "r1", reference_code: "CL-CT-2026-00007", status: "reviewing", email: "jane@example.com",
    tour_date: "2099-06-01", start_time: "09:00", hours: 8, passengers: 3, luggage: 2,
    start_label: "Waverley", end_label: null, vehicle_name: null, stops: [{ name: "Stirling Castle", dwellMinutes: 90 }],
    quoted_total: 450, created_at: "2026-11-03T10:00:00Z",
  };

  it("rejects a wrong email without revealing the request", async () => {
    state.row = row;
    const { lookupCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
    await expect(lookupCustomTourRequestImpl({ reference: row.reference_code, email: "other@example.com" })).rejects.toThrow(/couldn't find/);
  });

  it("hides the price until the request is quoted", async () => {
    state.row = row;
    const { lookupCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
    const v = await lookupCustomTourRequestImpl({ reference: row.reference_code, email: "jane@example.com" });
    expect(v.price).toBeNull();
    expect(v).not.toHaveProperty("email");
    expect(v).not.toHaveProperty("phone");
    state.row = { ...row, status: "quoted" };
    const q = await lookupCustomTourRequestImpl({ reference: row.reference_code, email: "jane@example.com" });
    expect(q.price).toBe(450);
  });
});
