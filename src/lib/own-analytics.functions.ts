/**
 * Admin read of first-party website analytics (site_events). Admin only.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const input = z.object({ from: z.string().min(8), to: z.string().min(8) });

type Row = {
  created_at: string; kind: string; name: string; path: string; visitor_id: string | null; session_id: string | null;
  referrer_host: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  device: string | null; browser: string | null; os: string | null; country: string | null;
};

const COLS = "created_at, kind, name, path, visitor_id, session_id, referrer_host, utm_source, utm_medium, utm_campaign, device, browser, os, country";
const MAX_ROWS = 60_000;

function top(rows: Row[], key: (r: Row) => string | null | undefined, n = 10) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r) || "(none)"; m.set(k, (m.get(k) ?? 0) + 1); }
  return Array.from(m, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, n);
}

export const getOwnAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: admin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!admin) throw new Error("Forbidden: admin access required");

    const start = `${data.from}T00:00:00.000Z`;
    const end = `${data.to}T23:59:59.999Z`;
    const rows: Row[] = [];
    for (let off = 0; off < MAX_ROWS; off += 1000) {
      const { data: page, error } = await supabase.from("site_events").select(COLS)
        .gte("created_at", start).lte("created_at", end)
        .order("created_at", { ascending: true }).range(off, off + 999);
      if (error) throw new Error(error.message);
      rows.push(...((page ?? []) as Row[]));
      if (!page || page.length < 1000) break;
    }

    const views = rows.filter(r => r.kind === "pageview");
    const events = rows.filter(r => r.kind === "event");
    const visitors = new Set(views.map(r => r.visitor_id).filter(Boolean));
    const anonViews = views.filter(r => !r.session_id).length;
    const sessions = new Map<string, number>();
    for (const v of views) if (v.session_id) sessions.set(v.session_id, (sessions.get(v.session_id) ?? 0) + 1);
    const bounces = Array.from(sessions.values()).filter(c => c === 1).length;

    const series = new Map<string, { date: string; views: number; visitors: Set<string>; events: number }>();
    const cur = new Date(start);
    while (cur.toISOString() <= end) {
      const k = cur.toISOString().slice(0, 10);
      series.set(k, { date: k, views: 0, visitors: new Set(), events: 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    for (const r of rows) {
      const b = series.get(r.created_at.slice(0, 10));
      if (!b) continue;
      if (r.kind === "pageview") { b.views++; if (r.visitor_id) b.visitors.add(r.visitor_id); } else b.events++;
    }

    const since = Date.now() - 5 * 60_000;
    const live = new Set(rows.filter(r => new Date(r.created_at).getTime() >= since).map(r => r.session_id ?? r.created_at)).size;

    return {
      truncated: rows.length >= MAX_ROWS,
      kpi: {
        pageViews: views.length,
        visitors: visitors.size,
        sessions: sessions.size,
        anonymousViews: anonViews,
        bounceRate: sessions.size ? (bounces / sessions.size) * 100 : 0,
        pagesPerSession: sessions.size ? (views.length - anonViews) / sessions.size : 0,
        events: events.length,
        liveNow: live,
      },
      series: Array.from(series.values()).map(s => ({ date: s.date, views: s.views, visitors: s.visitors.size, events: s.events })),
      topPages: top(views, r => r.path, 15),
      referrers: top(views, r => r.referrer_host ?? "Direct / none"),
      campaigns: top(views.filter(r => r.utm_source), r => [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" / ")),
      devices: top(views, r => r.device),
      browsers: top(views, r => r.browser),
      os: top(views, r => r.os),
      countries: top(views, r => r.country ?? "Unknown"),
      eventNames: top(events, r => r.name, 15),
      recent: rows.slice(-25).reverse().map(r => ({ at: r.created_at, kind: r.kind, name: r.name, path: r.path, device: r.device, country: r.country, referrer: r.referrer_host })),
    };
  });

export type OwnAnalytics = Awaited<ReturnType<typeof getOwnAnalytics>>;
