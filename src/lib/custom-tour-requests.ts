/**
 * Browser-safe rules for custom tour requests (CL-CT references): statuses,
 * reference format and when the tour wizard offers "Request a quote" instead
 * of an instant price. Shared by the wizard, the status page, the server and
 * the staff console so they never disagree.
 */
import { z } from "zod";

export const CUSTOM_TOUR_STATUSES = ["new", "reviewing", "quoted", "accepted", "rejected", "completed"] as const;
export type CustomTourStatus = (typeof CUSTOM_TOUR_STATUSES)[number];

export const CUSTOM_TOUR_STATUS_LABEL: Record<CustomTourStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  quoted: "Quoted",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
};

/** What the customer sees on the status page for each stage. */
export const CUSTOM_TOUR_STATUS_CUSTOMER: Record<CustomTourStatus, string> = {
  new: "Request received. Our tour team will look at your day shortly.",
  reviewing: "Our tour team is checking your route, timings and vehicle.",
  quoted: "We've sent you a price for this tour. Reply or call us to go ahead.",
  accepted: "You've accepted the price. We'll confirm the booking and payment with you.",
  rejected: "We're sorry, we can't run this tour as requested. Please get in touch and we'll suggest an alternative.",
  completed: "This tour has been completed. Thank you for travelling with us.",
};

/** Statuses where the agreed price is shown to the customer. */
export const PRICE_VISIBLE_STATUSES: readonly CustomTourStatus[] = ["quoted", "accepted", "completed"];

export const CUSTOM_TOUR_REF_PATTERN = /^CL-CT-\d{4}-\d{5,}$/;

/** Upper-cases and tidies a typed reference ("cl ct 2026 00482" → "CL-CT-2026-00482"). */
export function normaliseCustomTourRef(raw: string): string {
  const compact = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^CLCT(\d{4})(\d{5,})$/.exec(compact);
  return m ? `CL-CT-${m[1]}-${m[2]}` : String(raw ?? "").trim().toUpperCase();
}

export function isCustomTourRef(raw: string): boolean {
  return CUSTOM_TOUR_REF_PATTERN.test(normaliseCustomTourRef(raw));
}

export const customTourLookupSchema = z.object({
  reference: z.string().trim().min(6).max(40).transform(normaliseCustomTourRef)
    .refine((v) => CUSTOM_TOUR_REF_PATTERN.test(v), "Enter your reference, for example CL-CT-2026-00001."),
  email: z.string().trim().email("Enter the email you used for the request.").max(255).transform((v) => v.toLowerCase()),
});

/**
 * The wizard offers a quote request instead of an instant price when the
 * price can't be worked out reliably: the price check failed, the day is
 * blocked (too long, unroutable), no single vehicle seats the group, or the
 * chosen vehicle has no tour price set.
 */
export function quoteRequestReason(input: {
  priceError?: string | null;
  blockedReason?: string | null;
  total?: number | null;
  vehicleFits: boolean;
}): string | null {
  if (!input.vehicleFits) return "No single vehicle seats your whole group, so our team will plan the vehicles and price for you.";
  if (input.priceError) return "We couldn't work out an instant price for this day.";
  if (input.blockedReason) return input.blockedReason;
  if (input.total != null && !(input.total > 0)) return "This vehicle doesn't have an online tour price yet.";
  return null;
}
