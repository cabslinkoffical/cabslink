/**
 * Browser-safe rules for offer-email automation: the ready-made template
 * library, automatic triggers, quiet-day spacing and pre-send checks.
 * Used by the admin page and by the server sender so both agree.
 */
import { addDays, ukDate } from "@/lib/uk-time";
import type { MyCustomer } from "@/lib/my-customers";

export type TemplateKind = "event" | "coupon" | "seasonal" | "come_back" | "thank_you" | "promotion";
export type EmailTemplate = { id: string; kind: TemplateKind; label: string; name: string; subject: string; body: string; needsCoupon: boolean };

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  event: "Event offer", coupon: "Coupon / discount", seasonal: "Seasonal offer",
  come_back: "Come back offer", thank_you: "Thank you after a trip", promotion: "General promotion",
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: "festival", kind: "event", label: "Edinburgh Festival", name: "Edinburgh Festival travel", needsCoupon: true,
    subject: "{{name}}, beat the Festival crowds with {{coupon_offer}}",
    body: "Hi {{name}},\n\nAugust in Edinburgh is busy, and taxis are hard to find when the shows finish. Book your airport transfer or evening pickup with us ahead of time and your driver will be waiting.\n\nUse code {{coupon_code}} for {{coupon_offer}} your booking. The code is valid until {{coupon_expiry}}.\n\nWe look forward to driving you again." },
  { id: "christmas", kind: "event", label: "Christmas markets", name: "Christmas markets offer", needsCoupon: true,
    subject: "Christmas markets without the parking, {{name}}",
    body: "Hi {{name}},\n\nThe Christmas markets are open. Leave the car at home and let us take you there and back, warm and on time.\n\nUse code {{coupon_code}} for {{coupon_offer}} any December booking. Valid until {{coupon_expiry}}.\n\nHave a lovely festive season." },
  { id: "hogmanay", kind: "event", label: "Hogmanay", name: "Hogmanay travel", needsCoupon: false,
    subject: "Your Hogmanay ride home, sorted",
    body: "Hi {{name}},\n\nHogmanay is one of the busiest nights of the year. Book your ride now and you will not be queuing in the cold after midnight.\n\nPrebooked journeys have a fixed price agreed when you book.\n\nHappy New Year from all of us." },
  { id: "coupon", kind: "coupon", label: "Discount code", name: "Discount code", needsCoupon: true,
    subject: "{{name}}, here is {{coupon_offer}} your next journey",
    body: "Hi {{name}},\n\nThank you for travelling with us. Here is a code for your next airport transfer, tour or hourly hire.\n\nUse {{coupon_code}} at checkout for {{coupon_offer}}. It is valid until {{coupon_expiry}}.\n\nSee you soon." },
  { id: "summer", kind: "seasonal", label: "Summer tours", name: "Summer tours", needsCoupon: true,
    subject: "Long summer days are perfect for a Highlands tour",
    body: "Hi {{name}},\n\nThe days are long and the glens are green. It is the best time of year for a private day tour with your own driver, at your own pace.\n\nUse code {{coupon_code}} for {{coupon_offer}} a summer tour. Valid until {{coupon_expiry}}.\n\nWe would love to show you more of Scotland." },
  { id: "winter", kind: "seasonal", label: "Winter airport runs", name: "Winter airport runs", needsCoupon: false,
    subject: "Early flight this winter? Book your pickup now",
    body: "Hi {{name}},\n\nDark mornings and cold weather make early flights harder. Book your airport transfer now and your driver will collect you from your door.\n\nYou can manage or change your booking online at any time.\n\nSafe travels." },
  { id: "come_back", kind: "come_back", label: "We miss you", name: "Come back offer", needsCoupon: true,
    subject: "It has been a while, {{name}}",
    body: "Hi {{name}},\n\nWe have not seen you for a while and wanted to say hello. If you have a trip coming up, we would be glad to drive you again.\n\nUse code {{coupon_code}} for {{coupon_offer}} your next booking. Valid until {{coupon_expiry}}.\n\nHope to see you soon." },
  { id: "thank_you", kind: "thank_you", label: "Thank you after a trip", name: "Thank you after a trip", needsCoupon: true,
    subject: "Thank you for travelling with us, {{name}}",
    body: "Hi {{name}},\n\nThank you for choosing us for your recent journey. We hope everything went smoothly.\n\nAs a thank you, here is {{coupon_offer}} your next trip with code {{coupon_code}}. It is valid until {{coupon_expiry}}.\n\nWe look forward to your next journey with us." },
  { id: "promotion", kind: "promotion", label: "General update", name: "General promotion", needsCoupon: false,
    subject: "Airport transfers, tours and hourly hire across Scotland",
    body: "Hi {{name}},\n\nA quick reminder that we cover airport transfers, private day tours and hourly hire across Scotland, for one to sixteen passengers.\n\nYou get a fixed price when you book, and you can manage your booking online.\n\nThank you for being a customer." },
];

export type TriggerType = "after_trip" | "lapsed" | "enquiry_no_booking";
export const TRIGGER_LABELS: Record<TriggerType, string> = {
  after_trip: "Days after a completed trip",
  lapsed: "Days since their last trip (no new booking)",
  enquiry_no_booking: "Days after an enquiry with no booking",
};
export const TRIGGER_TEMPLATE: Record<TriggerType, string> = { after_trip: "thank_you", lapsed: "come_back", enquiry_no_booking: "coupon" };

/** How far back a trigger may fire, so switching a rule on never emails people about very old trips. */
export const CATCH_UP_DAYS = 14;

/**
 * Returns a key identifying the event this person is due an email for
 * (so each event emails them once), or null if the rule does not apply today.
 */
export function ruleTriggerKey(c: MyCustomer, rule: { trigger_type: TriggerType; delay_days: number }, today: string = ukDate()): string | null {
  if (c.basis === null) return null;
  const due = addDays(today, -rule.delay_days);
  const oldest = addDays(due, -CATCH_UP_DAYS);
  const inWindow = (d: string | null) => !!d && d.slice(0, 10) <= due && d.slice(0, 10) > oldest;
  if (rule.trigger_type === "after_trip") return inWindow(c.lastCompletedPickup) ? `trip:${c.lastCompletedPickup}` : null;
  if (rule.trigger_type === "lapsed") {
    const last = c.lastPickup;
    return c.bookings > 0 && last && last <= today && inWindow(last) ? `lapsed:${last}` : null;
  }
  if (rule.trigger_type === "enquiry_no_booking") {
    const seen = ukDate(c.lastSeen);
    return c.bookings === 0 && c.enquiries > 0 && inWindow(seen) ? `enquiry:${seen}` : null;
  }
  return null;
}

/** True when enough quiet days have passed since this person's last offer email. */
export function quietOk(lastMarketingAt: string | null, quietDays: number, now: Date = new Date()): boolean {
  if (!lastMarketingAt || quietDays <= 0) return true;
  return now.getTime() - new Date(lastMarketingAt).getTime() >= quietDays * 86_400_000;
}

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/gi;
const KNOWN = new Set(["name", "coupon_code", "coupon_offer", "coupon_expiry"]);

/** Warnings shown before a campaign or rule is saved or sent. */
export function campaignWarnings(input: {
  subject: string; body: string; audienceSize?: number | null;
  coupon?: { active: boolean; expires_at: string | null } | null;
}, today: string = ukDate()): string[] {
  const text = `${input.subject}\n${input.body}`;
  const out: string[] = [];
  const used = [...text.matchAll(PLACEHOLDER)].map((m) => m[1].toLowerCase());
  const unknown = [...new Set(used.filter((u) => !KNOWN.has(u)))];
  if (unknown.length) out.push(`Unknown placeholder${unknown.length > 1 ? "s" : ""}: ${unknown.map((u) => `{{${u}}}`).join(", ")}. They would be left blank.`);
  const needsCoupon = used.some((u) => u.startsWith("coupon_")) || /\b(code|coupon|discount)\b/i.test(text);
  if (needsCoupon && !input.coupon) out.push("The text mentions a code or coupon, but no coupon is attached.");
  if (input.coupon && !input.coupon.active) out.push("The attached coupon is switched off, so no code would be shown.");
  if (input.coupon?.expires_at && input.coupon.expires_at.slice(0, 10) < today) out.push("The attached coupon has expired.");
  if (input.coupon && used.includes("coupon_expiry") && !input.coupon.expires_at) out.push("The text uses {{coupon_expiry}}, but this coupon has no end date, so it would be blank.");
  if (input.audienceSize === 0) out.push("Nobody in this audience can receive offers yet.");
  return out;
}

// ---------------- Sending queue rules ----------------
export const QUEUE_BATCH_SIZE = 50;
export const QUEUE_MAX_ATTEMPTS = 3;

/** Minutes to wait before retrying after a failed attempt: 5, then 15, then 45. */
export function retryDelayMinutes(attemptsSoFar: number): number {
  return 5 * 3 ** Math.max(0, attemptsSoFar - 1);
}

/** What happens to a queued email after a failed attempt. */
export function afterFailure(attemptsSoFar: number, now: Date = new Date()): { status: "pending" | "failed"; nextAttemptAt: string | null } {
  if (attemptsSoFar >= QUEUE_MAX_ATTEMPTS) return { status: "failed", nextAttemptAt: null };
  return { status: "pending", nextAttemptAt: new Date(now.getTime() + retryDelayMinutes(attemptsSoFar) * 60_000).toISOString() };
}

export type QueueContact = { marketing_consent: boolean | null; unsubscribed_at: string | null; suppression_reason: string | null } | null;

/** Why a queued email must not be sent right now, or null when it may go. Checked again just before sending. */
export function queueSkipReason(contact: QueueContact, opts: { lastMarketingAt: string | null; quietDays: number; sourceActive: boolean }, now: Date = new Date()): string | null {
  if (!contact) return "not_a_customer";
  if (contact.suppression_reason) return `suppressed_${contact.suppression_reason}`;
  if (contact.unsubscribed_at) return "unsubscribed";
  if (!contact.marketing_consent) return "no_consent";
  if (!opts.sourceActive) return "campaign_stopped";
  if (!quietOk(opts.lastMarketingAt, opts.quietDays, now)) return "quiet_days";
  return null;
}
