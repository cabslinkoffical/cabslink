/** Legacy path — permanent redirect to the canonical quote page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/get-a-quote")({
  loader: () => {
    throw redirect({ to: "/distance", statusCode: 301, throw: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
