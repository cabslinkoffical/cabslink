import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, AdminTodo } from "@/components/site/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Cabslink" },
      { name: "description", content: "How Cabslink handles refunds for driver and transfer bookings." },
      { property: "og:title", content: "Refund Policy — Cabslink" },
      { property: "og:description", content: "How Cabslink handles refunds for driver and transfer bookings." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/refund-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/refund-policy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Refunds" title="Refund Policy" updated="15 July 2026">
      <h2>1. When we refund</h2>
      <ul>
        <li>Bookings we are unable to fulfil.</li>
        <li>Cancellations made within the free-cancellation window.</li>
        <li>Genuine duplicate charges.</li>
      </ul>
      <h2>2. How refunds are processed</h2>
      <p>Refunds are returned to the original payment method where a payment was captured. Processing time depends on the card network.</p>
      <h2>3. Disputes</h2>
      <p>Please contact us first with your booking reference so we can resolve the issue directly.</p>
      <AdminTodo note="Confirm exact refund processing times and any non-refundable fees." />
    </LegalPage>
  ),
});
