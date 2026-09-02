import { z } from "zod";

const DRAFT_KEY = "cabslink:booking-draft:v2";
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const StopSchema = z.object({
  placeId: z.string().max(200).optional(),
  label: z.string().max(300).optional(),
  durationMin: z.number().int().min(0).max(24 * 60).optional(),
});

const StepSchema = z.enum(["vehicle", "details", "extras", "payment", "pay", "review"]);

const DraftSchema = z.object({
  pickupPlaceId: z.string().max(200).optional(),
  pickupLabel: z.string().max(300).optional(),
  dropoffPlaceId: z.string().max(200).optional(),
  dropoffLabel: z.string().max(300).optional(),
  date: z.string().max(20).optional(),
  time: z.string().max(10).optional(),
  passengers: z.number().int().min(1).max(64).optional(),
  luggage: z.number().int().min(0).max(64).optional(),
  vehicleSlug: z.string().max(100).optional(),
  step: StepSchema.optional(),
  stops: z.array(StopSchema).max(10).optional(),
  selectedStops: z.record(z.string().max(200), z.number().int().min(0).max(24 * 60)).optional(),
  meetGreet: z.boolean().optional(),
  childSeatCount: z.number().int().min(0).max(10).optional(),
  routeMode: z.enum(["direct", "scenic", "optimised"]).optional(),
  returnJourney: z.object({
    enabled: z.boolean().optional(),
    time: z.string().max(10).optional(),
    date: z.string().max(20).optional(),
  }).optional(),
});

export type BookingDraft = z.infer<typeof DraftSchema>;

// Explicit deny-list — never persist PII, notes, tokens, payment, contact.
const FORBIDDEN_KEYS = new Set([
  "name", "email", "phone", "whatsapp", "notes", "message", "token",
  "customer_name", "cardNumber", "card", "cvv", "flight_number", "payment",
]);

function stripForbidden<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out as T;
}

type Stored = { v: 2; t: number; d: BookingDraft };

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: BookingDraft | null = null;

function flush() {
  pendingTimer = null;
  if (!pendingPayload) return;
  const store = safeStorage();
  if (!store) return;
  const cleaned = stripForbidden(pendingPayload as Record<string, unknown>) as BookingDraft;
  const parsed = DraftSchema.safeParse(cleaned);
  if (!parsed.success) { pendingPayload = null; return; }
  const payload: Stored = { v: 2, t: Date.now(), d: parsed.data };
  try { store.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch { /* quota */ }
  pendingPayload = null;
}

/** Debounced write. Safe to call on every state change. */
export function saveDraft(partial: BookingDraft, debounceMs = 250): void {
  pendingPayload = partial;
  if (pendingTimer) clearTimeout(pendingTimer);
  if (debounceMs <= 0) { flush(); return; }
  pendingTimer = setTimeout(flush, debounceMs);
}

export function loadDraft(): BookingDraft | null {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || parsed.v !== 2) return null;
    if (Date.now() - parsed.t > DRAFT_TTL_MS) {
      store.removeItem(DRAFT_KEY);
      return null;
    }
    const validated = DraftSchema.safeParse(parsed.d);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  pendingPayload = null;
  const store = safeStorage();
  if (!store) return;
  try { store.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/**
 * Remove fields that no longer correspond to reality (unknown vehicle,
 * identical pickup/dropoff, empty labels).
 */
export function sanitizeDraft(d: BookingDraft, knownVehicleIds: readonly string[]): BookingDraft {
  const out: BookingDraft = { ...d };
  if (out.vehicleSlug && knownVehicleIds.length && !knownVehicleIds.includes(out.vehicleSlug)) {
    delete out.vehicleSlug;
    if (out.step && out.step !== "vehicle") out.step = "vehicle";
  }
  if (out.pickupPlaceId && out.dropoffPlaceId && out.pickupPlaceId === out.dropoffPlaceId) {
    delete out.pickupPlaceId; delete out.pickupLabel;
    delete out.dropoffPlaceId; delete out.dropoffLabel;
  }
  return out;
}
