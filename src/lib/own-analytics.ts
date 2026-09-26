/**
 * First-party analytics client. Sends anonymous page views and conversion
 * events to /api/public/collect. A persistent visitor id is only stored when
 * analytics consent allows it; otherwise events are sent without one.
 * SSR-safe and never throws.
 */
import { analyticsAllowed } from "./consent";

type Evt = {
  kind: "pageview" | "event";
  name: string;
  path: string;
  visitor_id?: string | null;
  session_id?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  props?: Record<string, string | number | boolean>;
};

let allowed: boolean | null = null;
let lastPath = "";

function rid() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

function ids() {
  let session: string | null = null;
  let visitor: string | null = null;
  try {
    if (allowed) {
      session = sessionStorage.getItem("cl_sid") ?? (() => { const v = rid(); sessionStorage.setItem("cl_sid", v); return v; })();
      visitor = localStorage.getItem("cl_vid") ?? (() => { const v = rid(); localStorage.setItem("cl_vid", v); return v; })();
    }
  } catch { /* storage blocked */ }
  return { session, visitor };
}

function utm() {
  try {
    const q = new URLSearchParams(window.location.search);
    return { utm_source: q.get("utm_source"), utm_medium: q.get("utm_medium"), utm_campaign: q.get("utm_campaign") };
  } catch { return {}; }
}

function send(e: Evt) {
  try {
    const body = JSON.stringify({ events: [e] });
    if (navigator.sendBeacon?.("/api/public/collect", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/public/collect", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch { /* never break the site */ }
}

function excluded(path: string) {
  return path.startsWith("/cabs-booking-pannel") || path.startsWith("/auth") || path.startsWith("/api/");
}

export async function ownPageView(path: string) {
  if (typeof window === "undefined" || excluded(path) || path === lastPath) return;
  lastPath = path;
  if (allowed === null) allowed = await analyticsAllowed().catch(() => false);
  const { session, visitor } = ids();
  send({
    kind: "pageview", name: "page_view", path,
    session_id: session, visitor_id: visitor,
    referrer: document.referrer || null, ...utm(),
  });
}

export function ownEvent(name: string, props: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (excluded(path)) return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) if (v !== undefined) clean[k.slice(0, 40)] = typeof v === "string" ? v.slice(0, 300) : v;
  const { session, visitor } = ids();
  send({ kind: "event", name, path, session_id: session, visitor_id: visitor, props: clean });
}

/** Re-evaluate consent (e.g. after the banner is answered). */
export function refreshOwnConsent() { allowed = null; }
