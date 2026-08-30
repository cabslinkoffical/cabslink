import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Cabslink" },
      { name: "description", content: "The terms that apply when you use Cabslink to book driver and transfer services." },
      { property: "og:title", content: "Terms & Conditions — Cabslink" },
      { property: "og:description", content: "The terms that apply when you use Cabslink to book driver and transfer services." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/terms" }],
  }),
  component: () => (
    <LegalPage eyebrow="Terms" title="Terms & Conditions" updated="30 August 2026">
      <h2>1. Who you are contracting with</h2>
      <p>
        These terms apply between you and Cabslink, a UK private-hire booking service based at {SITE.address}. Journeys
        are fulfilled by licensed private-hire operators and drivers working with us, each holding a valid private-hire
        vehicle and driver licence from their local licensing authority together with public liability and hire-and-reward
        insurance. Licence details for the operator serving your booking are available on request via{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2>2. Using the service</h2>
      <p>By requesting a booking you agree to these terms. You must be 18 or over to make a booking, and responsible for any passengers travelling with you.</p>

      <h2>3. Bookings and quotes</h2>
      <p>Quotes shown at time of booking are based on the information you provide and include VAT where applicable. The final fare may adjust for extra waiting time, additional stops, tolls, congestion or clean-air charges, airport fees, or route changes agreed in advance. A booking is confirmed only when you receive a booking reference.</p>

      <h2>4. Your responsibilities</h2>
      <ul>
        <li>Provide accurate pickup, dropoff, contact and flight information.</li>
        <li>Be ready at the agreed time and location.</li>
        <li>Keep luggage and passenger numbers within the booked vehicle class.</li>
        <li>Wear seatbelts and follow the driver's reasonable safety instructions.</li>
        <li>Behave respectfully towards the driver. Soiling or damage caused by passengers is chargeable at the cost of cleaning or repair.</li>
      </ul>
      <p>Smoking and vaping are not permitted in our vehicles. Assistance dogs are always welcome; please tell us about other animals in advance.</p>

      <h2>5. Our responsibilities</h2>
      <p>We arrange fully licensed and insured drivers and aim for on-time arrival. We are not liable for delays caused by circumstances outside our reasonable control, including traffic, weather, road closures, flight changes and force majeure. If we cannot fulfil a confirmed booking, we will offer a suitable alternative or a full refund.</p>

      <h2>6. Payment</h2>
      <p>Payment terms are shown at booking. Where online card payment is not offered for your journey, payment is arranged directly with our team before or at the time of travel. Charges for extra waiting time, additional stops or damage are invoiced after the journey.</p>

      <h2>7. Changes and cancellation</h2>
      <p>See the <a href="/booking-policy">Booking &amp; Cancellation Policy</a> and the <a href="/refund-policy">Refund Policy</a>.</p>

      <h2>8. Lost property</h2>
      <p>Items left in a vehicle are held for 28 days. Contact us with your booking reference and we will arrange collection or delivery at cost.</p>

      <h2>9. Complaints</h2>
      <p>Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your booking reference. We acknowledge complaints within 2 working days and aim to resolve them within 14 days.</p>

      <h2>10. Liability</h2>
      <p>Our total liability for any booking is capped at the fare paid, except where liability cannot be limited or excluded under UK law, including for death or personal injury caused by negligence, fraud, and your statutory rights under the Consumer Rights Act 2015.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the law of Scotland, and the Scottish courts have jurisdiction. If you live elsewhere in the UK, you may also bring proceedings in your local courts.</p>

      <h2>12. Contact</h2>
      <p>
        Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> · Phone:{" "}
        <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a>
      </p>
    </LegalPage>
  ),
});
