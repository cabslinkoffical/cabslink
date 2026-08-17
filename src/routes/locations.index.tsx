/**
 * `/locations` is a legacy index that no longer renders content. It serves a
 * single-hop permanent redirect to the canonical location hub at `/areas`.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/locations/")({
  loader: () => {
    throw redirect({ to: "/areas", statusCode: 301, throw: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
