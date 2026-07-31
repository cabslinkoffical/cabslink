import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, AdminTodo } from "@/components/site/LegalPage";

export const Route = createFileRoute("/booking-policy")({
  head: () => ({
    meta: [
      { title: "Booking & Cancellation Policy — Cabslink" },
      { name: "description", content: "How Cabslink bookings, changes and cancellations work." },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/booking-policy" }],
  }),
  component: () => (
    <LegalPage eyebrow="Booking" title="Booking & Cancellation Policy" updated="15 July 2026">
      <h2>1. Confirmation</h2>
      <p>A booking is confirmed once you receive an on-screen booking reference. Where email confirmation is enabled, it is sent separately.</p>
      <h2>2. Changes</h2>
      <p>Contact our team as early as possible to change pickup time, route or vehicle. We accommodate changes subject to availability.</p>
      <h2>3. Cancellations</h2>
      <AdminTodo note="Confirm exact cancellation windows and any fees (e.g. free cancellation up to X hours before pickup)." />
      <p>We aim to be flexible with cancellations. Late cancellations or no-shows may incur a charge to cover the reserved driver time.</p>
      <h2>4. Waiting time</h2>
      <p>Airport pickups include reasonable free waiting time after landing. Additional waiting may be charged at the vehicle's published rate.</p>
      <AdminTodo note="Confirm free-waiting minutes for airport and non-airport pickups, and per-minute rate thereafter." />
      <h2>5. No-show</h2>
      <p>If we cannot locate you at the pickup point and cannot reach you by phone, the booking may be treated as a no-show.</p>
    </LegalPage>
  ),
});
