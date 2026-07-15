import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, AdminTodo } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Cabslink" },
      { name: "description", content: "The terms that apply when you use Cabslink to book chauffeur and transfer services." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <LegalPage eyebrow="Terms" title="Terms & Conditions" updated="15 July 2026">
      <AdminTodo note="Confirm operating entity, licence numbers (PHV operator licence), insurance details and jurisdiction clause." />
      <h2>1. Using the service</h2>
      <p>By requesting a booking you agree to these terms. You must be 18+ to make a booking.</p>
      <h2>2. Bookings and quotes</h2>
      <p>Quotes shown at time of booking are based on the information you provide. Final fare may adjust for waiting time, additional stops, tolls, congestion charges, or route changes agreed in advance.</p>
      <h2>3. Your responsibilities</h2>
      <ul>
        <li>Provide accurate pickup, contact and flight information.</li>
        <li>Be ready at the agreed time and location.</li>
        <li>Behave respectfully to the chauffeur. Damage caused by passengers is chargeable.</li>
      </ul>
      <h2>4. Our responsibilities</h2>
      <p>We operate with fully licensed and insured chauffeurs. We aim for on-time arrival but are not liable for delays caused by circumstances outside our reasonable control (traffic, weather, road closures, force majeure).</p>
      <h2>5. Payment</h2>
      <p>Payment terms are shown at booking. Where card capture is not offered on the website, payment is arranged directly.</p>
      <h2>6. Cancellation</h2>
      <p>See the <a href="/booking-policy">Booking &amp; Cancellation Policy</a>.</p>
      <h2>7. Liability</h2>
      <p>Our total liability for any booking is capped at the fare paid, except where liability cannot be limited under UK consumer law.</p>
      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of England &amp; Wales (or Scotland, where applicable).</p>
      <AdminTodo note="Confirm which UK jurisdiction applies as primary." />
    </LegalPage>
  ),
});
