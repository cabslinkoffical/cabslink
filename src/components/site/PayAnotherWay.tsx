import { Mail, MessageCircle } from "lucide-react";
import { SITE } from "@/lib/site";
import { whatsappBookingHref } from "@/lib/whatsapp";
import { trackClick } from "@/lib/tracking";

/**
 * WhatsApp + email contact block for customers paying by cash, bank transfer
 * or another agreed method. Never shows bank details — the team sends those
 * privately.
 */
export function PayAnotherWay({ bookingRef, lead, className }: {
  /** When omitted (before the booking is saved) the button links to a plain chat. */
  bookingRef?: string | null;
  lead?: string;
  className?: string;
}) {
  const href = bookingRef
    ? whatsappBookingHref(bookingRef)
    : whatsappBookingHref("(I'll send it once my booking is saved)");
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">
        {lead ?? "Message us on WhatsApp with your booking reference and we'll confirm your booking and arrange payment."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={href}
          target="_blank"
          rel="nofollow noopener noreferrer"
          data-analytics-location="pay_another_way"
          onClick={trackClick("whatsapp_click", { location: "pay_another_way" })}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--navy)] px-6 py-3 text-base font-bold text-[var(--navy-foreground)] shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2"
        >
          <MessageCircle className="size-5 text-[var(--gold)]" aria-hidden="true" />
          Message us on WhatsApp
        </a>
        <a
          href={`mailto:${SITE.email}${bookingRef ? `?subject=${encodeURIComponent(`Booking ${bookingRef}`)}` : ""}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          <Mail className="size-4 text-[var(--gold-ink)]" aria-hidden="true" />
          {SITE.email}
        </a>
      </div>
    </div>
  );
}
