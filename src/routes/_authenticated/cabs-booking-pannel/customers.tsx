import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old bookings-only list now lives in My Customers. */
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/customers")({
  beforeLoad: () => { throw redirect({ to: "/cabs-booking-pannel/my-customers" }); },
});
