/**
 * First-party analytics collector. Receives anonymous page views and events
 * from the public site (via sendBeacon) and stores them in `site_events`.
 * Input is validated, rate limited per IP and never echoed back.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";

const str = (n: number) => z.string().max(n).optional().nullable();
const eventSchema = z.object({
  kind: z.enum(["pageview", "event"]),
  name: z.string().min(1).max(64).regex(/^[a-z0-9_:-]+$/i),
  path: z.string().min(1).max(300),
  visitor_id: str(64),
  session_id: str(64),
  referrer: str(500),
  utm_source: str(100),
  utm_medium: str(100),
  utm_campaign: str(150),
  props: z.record(z.union([z.string().max(300), z.number(), z.boolean()])).optional(),
});
const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(20) });

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor/i;

function parseUa(ua: string) {
  const device = /ipad|tablet/i.test(ua) ? "Tablet" : /mobi|android|iphone/i.test(ua) ? "Mobile" : "Desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung Internet"
    : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Other";
  const os = /windows/i.test(ua) ? "Windows" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android"
    : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  return { device, browser, os };
}

function hostOf(ref: string | null | undefined, selfHost: string) {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h && h !== selfHost.replace(/^www\./, "") ? h : null;
  } catch { return null; }
}

export const Route = createFileRoute("/api/public/collect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ua = request.headers.get("user-agent") ?? "";
        if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        if (!checkLimit({ name: "collect", windowMs: 60_000, max: 120 }, ip).ok) return new Response(null, { status: 429 });

        let parsed;
        try {
          const text = await request.text();
          if (text.length > 30_000) return new Response(null, { status: 413 });
          parsed = bodySchema.safeParse(JSON.parse(text));
        } catch { return new Response(null, { status: 400 }); }
        if (!parsed.success) return new Response(null, { status: 400 });

        const selfHost = new URL(request.url).hostname;
        const { device, browser, os } = parseUa(ua);
        const country = request.headers.get("cf-ipcountry") || null;
        const rows = parsed.data.events
          .filter(e => !e.path.startsWith("/cabs-booking-pannel") && !e.path.startsWith("/auth"))
          .map(e => ({
            kind: e.kind, name: e.name, path: e.path.split("?")[0]!.slice(0, 300),
            visitor_id: e.visitor_id ?? null, session_id: e.session_id ?? null,
            referrer_host: hostOf(e.referrer, selfHost),
            utm_source: e.utm_source ?? null, utm_medium: e.utm_medium ?? null, utm_campaign: e.utm_campaign ?? null,
            device, browser, os, country: country && country !== "XX" ? country : null,
            props: e.props ?? {},
          }));
        if (!rows.length) return new Response(null, { status: 204 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("site_events").insert(rows);
        if (error) console.error("collect insert failed", error.message);
        return new Response(null, { status: 204 });
      },
    },
  },
});
