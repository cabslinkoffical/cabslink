/** Legacy standalone tracker — permanent redirect to the unified Manage Booking page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/track-booking")({
  beforeLoad: () => {
    throw redirect({ to: "/manage-booking", statusCode: 301, throw: true });
  },
  component: () => null,
});
