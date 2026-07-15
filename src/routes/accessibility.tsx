import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, AdminTodo } from "@/components/site/LegalPage";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Cabslink" },
      { name: "description", content: "Cabslink's commitment to an accessible website and inclusive chauffeur service." },
    ],
    links: [{ rel: "canonical", href: "/accessibility" }],
  }),
  component: () => (
    <LegalPage eyebrow="Accessibility" title="Accessibility Statement" updated="15 July 2026">
      <h2>Our commitment</h2>
      <p>We want everyone to be able to book with confidence. The site is built with semantic HTML, keyboard-navigable controls, sufficient colour contrast and descriptive image alt text.</p>
      <h2>Booking accessibility</h2>
      <p>Please let our team know in advance if you require step-free access, an accessible vehicle, or assistance with luggage — we will match your booking to a suitable chauffeur and vehicle.</p>
      <AdminTodo note="Confirm which vehicles support wheelchair access and any partner arrangements for WAV bookings." />
      <h2>Reporting an issue</h2>
      <p>If you encounter an accessibility barrier, please contact us via the Contact page and we will do our best to resolve it.</p>
    </LegalPage>
  ),
});
