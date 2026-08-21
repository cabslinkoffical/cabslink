/** Legacy path — permanent redirect to the canonical event transport service page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wedding-transport")({
  loader: () => {
    throw redirect({ to: "/event-transport", statusCode: 301, throw: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
