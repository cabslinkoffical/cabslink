/** Legacy path — permanent redirect to the canonical /services page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/our-services")({
  loader: () => {
    throw redirect({ to: "/services", statusCode: 301, throw: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
