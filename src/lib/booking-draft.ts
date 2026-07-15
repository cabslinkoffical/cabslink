import { z } from "zod";

const DRAFT_KEY = "cabslink:booking-draft:v1";
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const StopSchema = z.object({
  placeId: z.string().max(200).optional(),
  label: z.string().max(300).optional(),
  durationMin: z.number().int().min(0).max(24 * 60).optional(),
});

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
  stops: z.array(StopSchema).max(10).optional(),
  extras: z.record(z.string(), z.union([z.boolean(), z.number(), z.string().max(200)])).optional(),
  returnJourney: z.object({
    enabled: z.boolean().optional(),
    time: z.string().max(10).optional(),
    date: z.string().max(20).optional(),
  }).optional(),
});

export type BookingDraft = z.infer<typeof DraftSchema>;

// Explicit deny-list — never persist PII, notes, tokens.
const FORBIDDEN_KEYS = new Set(["name", "email", "phone", "notes", "message", "token", "customer_name", "cardNumber"]);

function stripForbidden<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out as T;
}

type Stored = { v: 1; t: number; d: BookingDraft };

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveDraft(partial: BookingDraft): void {
  const store = safeStorage();
  if (!store) return;
  const cleaned = stripForbidden(partial as Record<string, unknown>) as BookingDraft;
  const parsed = DraftSchema.safeParse(cleaned);
  if (!parsed.success) return;
  const payload: Stored = { v: 1, t: Date.now(), d: parsed.data };
  try { store.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch { /* quota */ }
}

export function loadDraft(): BookingDraft | null {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || parsed.v !== 1) return null;
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
  const store = safeStorage();
  if (!store) return;
  try { store.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
