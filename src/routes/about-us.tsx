/** Legacy path — permanent redirect to the canonical /about page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/about-us")({
  loader: () => {
    throw redirect({ to: "/about", statusCode: 301, throw: true });
  },
  head: () => normalizeHead({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
