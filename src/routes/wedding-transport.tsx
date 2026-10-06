/** Legacy path — permanent redirect to the canonical event transport service page. */
import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wedding-transport")({
  loader: () => {
    throw redirect({ to: "/event-transport", statusCode: 301, throw: true });
  },
  head: () => normalizeHead({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
