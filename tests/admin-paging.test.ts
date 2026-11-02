import { describe, it, expect } from "vitest";
import { applyBookingFilters } from "@/lib/admin-bookings";
import { clampPage, ilikeAny, sanitizeSearch, slicePage, pageCount } from "@/lib/admin-paging";

function recorder() {
  const calls: string[] = [];
  const q: any = new Proxy({}, { get: (_t, op: string) => (...args: unknown[]) => { calls.push(`${op}:${JSON.stringify(args)}`); return q; } });
  return { q, calls };
}

describe("admin paging", () => {
  it("page 3 of 25 covers rows 50-74", () => {
    expect(clampPage(3, 25)).toEqual({ page: 3, pageSize: 25, from: 50, to: 74 });
  });
  it("caps page size at 100 and page at least 1", () => {
    expect(clampPage(0, 5000)).toMatchObject({ page: 1, pageSize: 100, from: 0, to: 99 });
  });
  it("counts pages", () => {
    expect(pageCount(51, 25)).toBe(3);
    expect(pageCount(0, 25)).toBe(1);
  });
  it("slices an in-memory list into the requested page with the full total", () => {
    const r = slicePage(Array.from({ length: 30 }, (_, i) => i), { page: 2, pageSize: 25 });
    expect(r.rows).toEqual([25, 26, 27, 28, 29]);
    expect(r.total).toBe(30);
  });
  it("search text cannot inject filter syntax", () => {
    expect(sanitizeSearch("a,b),status.eq.x*%")).toBe("a b status eq x");
    expect(ilikeAny(["email"], "  ")).toBeNull();
    expect(ilikeAny(["email", "phone"], "jo")).toBe("email.ilike.*jo*,phone.ilike.*jo*");
  });
});

describe("booking tabs as database filters", () => {
  it("every tab excludes tour enquiries", () => {
    for (const tab of ["all", "deleted", "history", "upcoming"]) {
      const { q, calls } = recorder();
      applyBookingFilters(q, tab, "", "2026-11-02");
      expect(calls[0]).toBe('neq:["service_type","private_tour"]');
    }
  });
  it("deleted tab only shows deleted bookings; others hide them", () => {
    const d = recorder(); applyBookingFilters(d.q, "deleted", "", "2026-11-02");
    expect(d.calls).toContain('not:["deleted_at","is",null]');
    const a = recorder(); applyBookingFilters(a.q, "all", "", "2026-11-02");
    expect(a.calls).toContain('is:["deleted_at",null]');
    expect(a.calls).toContain('not:["status","in","(cancelled,rejected)"]');
  });
  it("upcoming = pickup today or later and not completed", () => {
    const r = recorder(); applyBookingFilters(r.q, "upcoming", "", "2026-11-02");
    expect(r.calls).toContain('gte:["pickup_date","2026-11-02"]');
    expect(r.calls).toContain('neq:["status","completed"]');
  });
  it("history = past pickup OR finished, combined with search in one expression", () => {
    const r = recorder(); applyBookingFilters(r.q, "history", "smith", "2026-11-02");
    const or = r.calls.find((c) => c.startsWith("or:"))!;
    expect(or).toContain("and(or(pickup_date.lt.2026-11-02,status.in.(completed,cancelled,rejected)),or(customer_name.ilike.*smith*");
    expect(r.calls.filter((c) => c.startsWith("or:"))).toHaveLength(1);
  });
  it("cancelled tab includes cancelled and rejected", () => {
    const r = recorder(); applyBookingFilters(r.q, "cancelled", "", "2026-11-02");
    expect(r.calls).toContain('in:["status",["cancelled","rejected"]]');
  });
  it("unknown tab falls back to all", () => {
    const r = recorder(); applyBookingFilters(r.q, "nonsense", "", "2026-11-02");
    expect(r.calls).toEqual(['neq:["service_type","private_tour"]', 'is:["deleted_at",null]', 'not:["status","in","(cancelled,rejected)"]']);
  });
});
