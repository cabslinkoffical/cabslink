import { createFileRoute, redirect } from "@tanstack/react-router";

// Refunds now live as a tab inside Cancellation requests.
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/refunds")({
  beforeLoad: () => { throw redirect({ to: "/cabs-booking-pannel/cancellations", search: { section: "refunds" } }); },
});
