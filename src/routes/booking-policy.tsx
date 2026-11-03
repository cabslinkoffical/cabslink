import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";
import { FACTS, FACT_TEXT } from "@/lib/site-facts";

const T = FACTS.transferCancellation;
const TT = FACTS.tourCancellation;
const W = FACTS.airportWait;

export const Route = createFileRoute("/booking-policy")({
  head: () => normalizeHead({
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
      <p>When you finish booking you receive an on-screen booking reference and an email. This means we have received your booking request. {FACT_TEXT.confirmationRule} If you do not receive a reference, the booking has not been placed — please contact us before travelling.</p>
      <p><strong>What your fare includes:</strong> {FACT_TEXT.feesIncluded}</p>

      <h2>2. Changes</h2>
      <p>You can change the pickup time, route, stops or vehicle class up to 6 hours before pickup with no admin fee. If the new journey costs more or less, we show you the new price before you confirm. Later changes are accommodated where possible; a change that increases distance, duration or vehicle class may increase the fare.</p>

      <h2>3. Cancelling a transfer</h2>
      <ul>
        <li><strong>More than {T.freeOverHours} hours before pickup</strong> — free cancellation, full refund of anything paid.</li>
        <li><strong>Between {T.halfToHours} and {T.halfFromHours} hours before pickup</strong> — 50% of the fare is payable.</li>
        <li><strong>Less than {T.halfFromHours} hours before pickup, or after the driver has been dispatched</strong> — the full fare is payable.</li>
        <li><strong>Cancelled by us</strong> — full refund, or an alternative vehicle at no extra cost.</li>
      </ul>
      <p>Cancellations caused by a cancelled or heavily delayed flight are not charged where you tell us as soon as you know.</p>

      <h2>4. Waiting time</h2>
      <ul>
        <li><strong>Airport pickups</strong> — {W.freeMinutes} minutes of free waiting from the actual landing time. Add your flight number when you book and our team will track your flight and adjust your pickup if it lands early or late. Meet and greet is available on every booking for a small extra charge, shown in your quote: your driver waits in arrivals with a name board.</li>
        <li><strong>Cruise ports and rail stations</strong> — 30 minutes of free waiting.</li>
        <li><strong>All other pickups</strong> — 15 minutes of free waiting from the booked time.</li>
      </ul>
      <p>After the free period, waiting time is charged by the hour; the rate depends on the vehicle and is shown when you book.</p>
      {/* TODO(owner): confirm which vehicle classes count as "larger vehicles" and the free waiting at cruise ports, stations and other pickups. */}

      <h2>4a. Cancelling a tour</h2>
      <ul>
        <li><strong>More than {TT.freeOverHours} hours before the tour starts</strong> — free cancellation, full refund of anything paid.</li>
        <li><strong>Between {TT.halfToHours} and {TT.halfFromHours} hours before the start</strong> — 50% of the price is payable.</li>
        <li><strong>Less than {TT.halfFromHours} hours before the start, or a no-show</strong> — the full price is payable.</li>
      </ul>

      <h2>4b. Ways to pay</h2>
      <ul>
        <li><strong>Card</strong> — pay online through Stripe on the payment page. Your booking is confirmed as soon as the payment succeeds.</li>
        <li><strong>Bank transfer</strong> — choose “Pay another way”, then message us on WhatsApp or email with your booking reference. We send payment details privately.</li>
        <li><strong>Cash</strong> — paid to us or to the driver, as agreed with our team.</li>
        <li><strong>Other methods</strong> — agreed with our team when you contact us.</li>
      </ul>
      <p>For bank transfer, cash or other methods, our team confirms your booking after talking to you. Most replies are quick, but some can take up to 12–24 hours. No card details are stored on cabslink.com.</p>

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
