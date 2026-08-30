import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cabslink" },
      { name: "description", content: "How Cabslink collects, uses, stores and protects your personal information when you book UK airport transfers, tours or hourly hire." },
      { property: "og:title", content: "Privacy Policy — Cabslink" },
      { property: "og:description", content: "How Cabslink collects, uses, stores and protects your personal information when you book UK airport transfers, tours or hourly hire." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/privacy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Privacy Policy" title="Privacy Policy" updated="30 August 2026"
      subtitle="How we collect, use and protect your personal information.">
      <h2>1. Who we are</h2>
      <p>
        Cabslink is a UK private-hire and driver booking service operating from {SITE.address}. For any privacy
        question, or to exercise your data rights, contact us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or
        call <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a>. Privacy requests are handled by our
        data protection contact at the same email address, marked "Data protection request".
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>Booking details: pickup and dropoff locations, stops, date, time, flight number, passenger and luggage counts, vehicle class.</li>
        <li>Contact details: name, email address, phone number.</li>
        <li>Communications: messages you send through our forms, email or phone.</li>
        <li>Technical data: IP address, browser type and pages visited, used for security, fraud prevention and analytics.</li>
      </ul>
      <p>We do not collect special category data, and we do not store full card numbers on our systems.</p>

      <h2>3. How we use it</h2>
      <ul>
        <li>To quote, confirm and deliver your bookings.</li>
        <li>To contact you about your journey, including driver and pickup updates.</li>
        <li>To improve the service, prevent abuse and protect our platform.</li>
        <li>To meet UK legal, licensing and tax obligations.</li>
      </ul>

      <h2>4. Legal basis</h2>
      <p>We rely on <em>contract performance</em> for bookings, <em>legitimate interests</em> for security and service improvement, <em>legal obligation</em> for tax and licensing records, and <em>consent</em> for optional marketing (which you can withdraw at any time).</p>

      <h2>5. Who we share it with</h2>
      <p>We share only what is needed to deliver your journey, with the driver assigned to your booking and with the service providers that run our platform:</p>
      <ul>
        <li><strong>Hosting and database</strong> — our cloud application and database platform (EU/UK regions).</li>
        <li><strong>Mapping and distance</strong> — Google Maps Platform, for address lookup, routing and journey distance.</li>
        <li><strong>Email delivery</strong> — Resend, for booking confirmations and enquiry notifications.</li>
        <li><strong>Bot protection</strong> — Cloudflare Turnstile, to protect our forms from automated abuse.</li>
      </ul>
      <p>We never sell your personal information, and we do not share it for third-party advertising.</p>

      <h2>6. Retention</h2>
      <p>Booking and payment records are kept for seven years to meet UK tax requirements. Enquiry and contact messages are kept for 24 months. Website technical logs are kept for up to 12 months. After these periods, records are deleted or anonymised.</p>

      <h2>7. Your rights</h2>
      <p>You may request access, correction, deletion, restriction or portability of your data, and object to processing based on legitimate interests. Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we will respond within one month. If you are unhappy with our response, you can complain to the UK Information Commissioner's Office (ICO) at ico.org.uk.</p>

      <h2>8. International transfers</h2>
      <p>Where a provider processes data outside the UK/EEA, we rely on UK adequacy regulations or the UK International Data Transfer Addendum to the Standard Contractual Clauses.</p>

      <h2>9. Cookies</h2>
      <p>See our <a href="/cookies">Cookie Policy</a> for the cookies and similar technologies we use.</p>

      <h2>10. Contact</h2>
      <p>
        Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a><br />
        Phone: <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a><br />
        Address: {SITE.address}
      </p>
    </LegalPage>
  ),
});
