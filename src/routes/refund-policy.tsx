import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Cabslink" },
      { name: "description", content: "How Cabslink handles refunds for airport transfers, private tours and hourly hire, including cancellations, no-shows and payment reversals." },
      { property: "og:title", content: "Refund Policy — Cabslink" },
      { property: "og:description", content: "How Cabslink handles refunds for airport transfers, private tours and hourly hire, including cancellations, no-shows and payment reversals." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/refund-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/refund-policy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Refunds" title="Refund Policy" updated="30 August 2026">
      <h2>1. When we refund in full</h2>
      <ul>
        <li>Bookings we are unable to fulfil.</li>
        <li>Cancellations made more than 12 hours before pickup (see the <a href="/booking-policy">Booking &amp; Cancellation Policy</a>).</li>
        <li>Duplicate charges for the same journey.</li>
        <li>Journeys cancelled because your flight was cancelled or significantly delayed, where you notify us promptly.</li>
      </ul>

      <h2>2. Partial refunds</h2>
      <p>Cancellations between 12 and 3 hours before pickup are refunded at 50% of the fare. Where a journey is shortened at your request after it has begun, the fare already reserved for the booked route remains payable.</p>

      <h2>3. When we do not refund</h2>
      <ul>
        <li>No-shows, and cancellations less than 3 hours before pickup or after the driver has been dispatched.</li>
        <li>Delays caused by circumstances outside our reasonable control, where the journey was still completed.</li>
        <li>Waiting time, extra stops, tolls, airport fees or cleaning charges already incurred.</li>
      </ul>

      <h2>4. How refunds are processed</h2>
      <p>Refunds are returned to the original payment method. We approve eligible refunds within 3 working days of agreeing them; funds typically appear within 5–10 working days, depending on your card issuer or bank.</p>

      <h2>5. Disputes</h2>
      <p>
        Please contact us first with your booking reference at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or{" "}
        <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a> so we can resolve the issue directly. We
        acknowledge refund requests within 2 working days and aim to conclude them within 14 days. Nothing here affects
        your statutory rights under UK consumer law.
      </p>
    </LegalPage>
  ),
});
