import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, AdminTodo } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cabslink" },
      { name: "description", content: "How Cabslink collects, uses and protects your personal information." },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/privacy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Privacy Policy" title="Privacy Policy" updated="15 July 2026"
      subtitle="How we collect, use and protect your personal information.">
      <h2>1. Who we are</h2>
      <p>Cabslink is a UK private-hire and chauffeur booking service.</p>
      <AdminTodo note="Add registered company name, company number, registered address, ICO registration number and Data Protection Officer contact." />

      <h2>2. Information we collect</h2>
      <ul>
        <li>Booking details: pickup and dropoff locations, date, time, passenger/luggage counts, vehicle preference.</li>
        <li>Contact details: name, email, phone number.</li>
        <li>Communications: messages you send us via forms or email.</li>
        <li>Technical: IP address, browser type, pages visited (for security and analytics).</li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To provide and confirm your bookings.</li>
        <li>To contact you about your journey.</li>
        <li>To improve the service and prevent abuse.</li>
        <li>To meet legal and tax obligations.</li>
      </ul>

      <h2>4. Legal basis</h2>
      <p>We rely on <em>contract performance</em> for bookings, <em>legitimate interests</em> for security and service improvements, and <em>consent</em> for optional marketing.</p>

      <h2>5. Sharing</h2>
      <p>We share information only with the chauffeur assigned to your booking and with service providers strictly required to operate the platform (hosting, mapping, payments).</p>
      <AdminTodo note="List sub-processors: hosting provider, mapping provider, payment provider, email/SMS provider." />

      <h2>6. Retention</h2>
      <p>Booking records are retained for the period required by UK tax and transport regulations, then deleted or anonymised.</p>

      <h2>7. Your rights</h2>
      <p>You may request access, correction, deletion, restriction or portability of your data, and object to certain processing. Contact us to exercise these rights.</p>

      <h2>8. International transfers</h2>
      <p>Where data is transferred outside the UK/EEA, we rely on adequacy decisions or Standard Contractual Clauses.</p>

      <h2>9. Contact</h2>
      <p>Email: support@cabslink.co.uk (or the address shown on our Contact page).</p>
    </LegalPage>
  ),
});
