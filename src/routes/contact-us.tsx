/** Legacy path — permanent redirect to the canonical /contact page. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/contact-us")({
  loader: () => {
    throw redirect({ to: "/contact", statusCode: 301, throw: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
