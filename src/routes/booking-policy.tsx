import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/booking-policy")({
  head: () => ({
    meta: [
      { title: "Booking & Cancellation Policy — Cabslink" },
      { name: "description", content: "How Cabslink bookings are confirmed, how to change or cancel a journey, waiting-time allowances and no-show handling." },
      { property: "og:title", content: "Booking & Cancellation Policy — Cabslink" },
      { property: "og:description", content: "How Cabslink bookings are confirmed, how to change or cancel a journey, waiting-time allowances and no-show handling." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/booking-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/booking-policy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Booking" title="Booking & Cancellation Policy" updated="30 August 2026">
      <h2>1. Confirmation</h2>
      <p>A booking is confirmed once you receive an on-screen booking reference, followed by an email confirmation. If you do not receive a reference, the booking has not been placed — please contact us before travelling.</p>

      <h2>2. Changes</h2>
      <p>You can change the pickup time, route, stops or vehicle class free of charge up to 6 hours before pickup, subject to availability. Later changes are accommodated where possible; a change that increases distance, duration or vehicle class may increase the fare.</p>

      <h2>3. Cancellations</h2>
      <ul>
        <li><strong>More than 12 hours before pickup</strong> — free cancellation, full refund of anything paid.</li>
        <li><strong>Between 12 and 3 hours before pickup</strong> — 50% of the fare is payable.</li>
        <li><strong>Less than 3 hours before pickup, or after the driver has been dispatched</strong> — the full fare is payable.</li>
        <li><strong>Cancelled by us</strong> — full refund, or an alternative vehicle at no extra cost.</li>
      </ul>
      <p>Cancellations caused by a cancelled or heavily delayed flight are not charged where you tell us as soon as you know.</p>

      <h2>4. Waiting time</h2>
      <ul>
        <li><strong>Airport pickups</strong> — 60 minutes of free waiting from the actual landing time, so we track your flight.</li>
        <li><strong>Cruise ports and rail stations</strong> — 30 minutes of free waiting.</li>
        <li><strong>All other pickups</strong> — 15 minutes of free waiting from the booked time.</li>
      </ul>
      <p>After the free period, waiting is charged at £0.50 per minute (£30 per hour) for saloon and estate classes, and £0.75 per minute (£45 per hour) for MPV, executive, minibus and coach classes.</p>

      <h2>5. Extra stops and route changes</h2>
      <p>Stops added in advance are priced at booking. Stops requested during the journey are charged at the waiting rate above plus any additional mileage.</p>

      <h2>6. No-show</h2>
      <p>If we cannot locate you at the pickup point after the free waiting period and cannot reach you on the phone number provided, the booking is treated as a no-show and the full fare is payable. Please always keep your phone reachable on the day of travel.</p>

      <h2>7. Contact</h2>
      <p>
        To change or cancel, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call{" "}
        <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a> with your booking reference.
      </p>
    </LegalPage>
  ),
});
