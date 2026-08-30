import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Cabslink" },
      { name: "description", content: "Cabslink's commitment to an accessible website and inclusive airport travel service." },
      { property: "og:title", content: "Accessibility — Cabslink" },
      { property: "og:description", content: "Cabslink's commitment to an accessible website and inclusive airport travel service." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/accessibility" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/accessibility" }],
  }),
  component: () => (
    <LegalPage eyebrow="Accessibility" title="Accessibility Statement" updated="30 August 2026">
      <h2>Our commitment</h2>
      <p>We want everyone to be able to book with confidence. The site is built with semantic HTML, keyboard-navigable controls, a skip-to-content link, visible focus styles, sufficient colour contrast and descriptive image alt text. We aim to meet WCAG 2.1 level AA and review the site as we add features.</p>

      <h2>Booking accessibility</h2>
      <p>Tell our team in advance if you need step-free access, help with luggage, extra time at the pickup point, or space for a folding wheelchair, walker or mobility scooter. Our MPV and minibus classes carry folding mobility aids in the luggage area, and assistance dogs travel free on every journey.</p>
      <p>
        For a fully wheelchair-accessible vehicle (WAV), where the passenger travels seated in their wheelchair, please
        request it at least 24 hours ahead. We arrange these through partner operators in each city and will confirm
        availability before your booking is finalised.
      </p>

      <h2>Alternatives to booking online</h2>
      <p>
        If the online form is difficult to use, you can book directly by phone on{" "}
        <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>{SITE.phoneUK}</a> or by email at{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2>Reporting an issue</h2>
      <p>
        If you meet an accessibility barrier on this site or during a journey, email{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with the page or booking reference. We acknowledge reports
        within 2 working days and aim to fix confirmed issues within 30 days.
      </p>
    </LegalPage>
  ),
});
