import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";
import { FACT_TEXT } from "@/lib/site-facts";

export const Route = createFileRoute("/refund-policy")({
  head: () => normalizeHead({
    meta: [
      { title: "Refund & Cancellation Policy | Cabslink Edinburgh" },
      { name: "description", content: "How Cabslink handles refunds for airport transfers, private tours and hourly hire, including cancellations, no-shows and payment reversals." },
      { property: "og:title", content: "Refund & Cancellation Policy | Cabslink Edinburgh" },
      { property: "og:description", content: "How Cabslink handles refunds for airport transfers, private tours and hourly hire, including cancellations, no-shows and payment reversals." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/refund-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/refund-policy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Refunds" title="Refund Policy" updated="30 August 2026">
      <p>{FACT_TEXT.transferCancellation} Standard bookings also qualify for a full refund within the first 24 hours after booking where cancellation is still available. Later cancellations are reviewed as partial-refund claims; our team confirms the amount.</p>
      <p>Contact us if an earlier confirmation quotes different cancellation terms, so we can review the terms recorded for your booking.</p>
      <h2>1. Transfers — when we refund in full</h2>
      <ul>
        <li>Bookings we are unable to fulfil.</li>
        <li>Cancellations eligible for a full refund under the booking's chosen cover or booking grace period (see the <a href="/booking-policy">Booking &amp; Cancellation Policy</a>).</li>
        <li>Duplicate charges for the same journey.</li>
        <li>Journeys cancelled because your flight was cancelled or significantly delayed, where you notify us promptly.</li>
      </ul>

      <h2>2. Transfers — partial refunds</h2>
      <p>Where Manage Booking shows a partial-refund claim, our team reviews driver and allocation costs already committed and confirms the amount. Where a journey is shortened at your request after it has begun, the fare already reserved for the booked route remains payable.</p>

      <h2>3. Transfers — when we do not refund</h2>
      <ul>
        <li>Paid non-refundable bookings cancelled after confirmation, and no-shows.</li>
        <li>Delays caused by circumstances outside our reasonable control, where the journey was still completed.</li>
        <li>Extra waiting time, extra stops or cleaning charges already incurred.</li>
      </ul>

      <h2>4. Tours</h2>
      <p>{FACT_TEXT.tourCancellation} Manage Booking shows whether cancellation is available and the refund eligibility for your booking.</p>

      <h2>5. How refunds are processed</h2>
      <p>Refunds are returned to the original payment method. We approve eligible refunds within 3 working days of agreeing them; funds typically appear within 5–10 working days, depending on your card issuer or bank.</p>

      <h2>6. Disputes</h2>
      <p>
        Please contact us first with your booking reference at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or{" "}
        <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a> so we can resolve the issue directly. We
        acknowledge refund requests within 2 working days and aim to conclude them within 14 days. Nothing here affects
        your statutory rights under UK consumer law.
      </p>
    </LegalPage>
  ),
});
