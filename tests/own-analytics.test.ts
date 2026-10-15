import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/consent", () => ({ analyticsAllowed: vi.fn().mockResolvedValue(true) }));

const sent: any[] = [];
beforeEach(() => {
  vi.resetModules();
  sent.length = 0;
  localStorage.clear();
  (navigator as any).sendBeacon = (_u: string, b: Blob) => { void b.text().then(t => sent.push(JSON.parse(t).events[0])); return true; };
});
const flush = () => new Promise(r => setTimeout(r, 20));

describe("own analytics", () => {
  it("ignores a double-fired view of the same page and gives each event a unique id", async () => {
    const m = await import("@/lib/own-analytics");
    await m.ownPageView("/a"); await m.ownPageView("/a"); await m.ownPageView("/b");
    await flush();
    expect(sent.map(e => e.path)).toEqual(["/a", "/b"]);
    expect(new Set(sent.map(e => e.event_id)).size).toBe(2);
    expect(sent[0].session_id).toBe(sent[1].session_id);
    expect(sent[0].props.landing).toBe(true);
    expect(sent[1].referrer).toBeUndefined();
  });

  it("starts a new session after 30 minutes idle", async () => {
    const m = await import("@/lib/own-analytics");
    await m.ownPageView("/a"); await flush();
    const s = JSON.parse(localStorage.getItem("cl_session_v2")!);
    localStorage.setItem("cl_session_v2", JSON.stringify({ ...s, last: Date.now() - 31 * 60_000 }));
    await m.ownPageView("/b"); await flush();
    expect(sent[1].session_id).not.toBe(sent[0].session_id);
  });
});
