/**
 * First-party analytics client. Sends anonymous page views and conversion
 * events to /api/public/collect.
 *
 * Accuracy rules:
 * - Every event carries a unique event_id; the server ignores repeats, so a
 *   double-fired effect or a beacon retry can never create a duplicate.
 * - A session ends after 30 minutes of inactivity (GA4 definition) and is
 *   shared across tabs. Referrer and UTM are recorded on the landing page only.
 * - Visitor/session ids are only stored when analytics consent allows it.
 * SSR-safe and never throws.
 */
import { analyticsAllowed } from "./consent";

type Evt = {
  kind: "pageview" | "event";
  name: string;
  path: string;
  event_id: string;
  visitor_id?: string | null;
  session_id?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  props?: Record<string, string | number | boolean>;
};

const SESSION_TIMEOUT_MS = 30 * 60_000;
const SKEY = "cl_session_v2";
let allowedPromise: Promise<boolean> | null = null;
let lastView = { path: "", at: 0 };

function rid() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

function consent(): Promise<boolean> {
  if (!allowedPromise) allowedPromise = analyticsAllowed().catch(() => false);
  return allowedPromise;
}

/** Returns ids and whether this hit starts a new session. */
function ids(allowed: boolean): { session: string | null; visitor: string | null; isNew: boolean } {
  if (!allowed) return { session: null, visitor: null, isNew: false };
  try {
    let visitor = localStorage.getItem("cl_vid");
    if (!visitor) { visitor = rid(); localStorage.setItem("cl_vid", visitor); }
    const now = Date.now();
    const raw = localStorage.getItem(SKEY);
    const cur = raw ? (JSON.parse(raw) as { id: string; last: number }) : null;
    const isNew = !cur || now - cur.last > SESSION_TIMEOUT_MS;
    const id = isNew ? rid() : cur!.id;
    localStorage.setItem(SKEY, JSON.stringify({ id, last: now }));
    return { session: id, visitor, isNew };
  } catch { return { session: null, visitor: null, isNew: false }; }
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

export function excludedPath(path: string) {
  return path.startsWith("/cabs-booking-pannel") || path.startsWith("/auth") || path.startsWith("/api/");
}

let firstView = true;

export async function ownPageView(path: string) {
  if (typeof window === "undefined" || excludedPath(path)) return;
  const now = Date.now();
  // Same page reported twice within 2s = a double render, not a real view.
  if (path === lastView.path && now - lastView.at < 2000) return;
  lastView = { path, at: now };
  const allowed = await consent();
  const { session, visitor, isNew } = ids(allowed);
  // External referrer/UTM only describe how the visit started.
  const landing = allowed ? isNew : firstView;
  firstView = false;
  send({
    kind: "pageview", name: "page_view", path, event_id: rid(),
    session_id: session, visitor_id: visitor,
    ...(landing ? { referrer: document.referrer || null, ...utm() } : {}),
    props: landing ? { landing: true } : {},
  });
}

export function ownEvent(name: string, props: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (excludedPath(path)) return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) if (v !== undefined) clean[k.slice(0, 40)] = typeof v === "string" ? v.slice(0, 300) : v;
  void consent().then(allowed => {
    const { session, visitor } = ids(allowed);
    send({ kind: "event", name, path, event_id: rid(), session_id: session, visitor_id: visitor, props: clean });
  });
}

/** Re-evaluate consent (e.g. after the banner is answered). */
export function refreshOwnConsent() { allowedPromise = null; }
