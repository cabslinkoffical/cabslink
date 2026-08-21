/** Legacy path — permanent redirect to the canonical driver recruitment page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/become-a-driver")({
  loader: () => {
    throw redirect({ to: "/drive-with-us", statusCode: 301, throw: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
