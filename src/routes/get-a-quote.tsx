/** Legacy path — permanent redirect to the canonical quote page. */
import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/get-a-quote")({
  loader: () => {
    throw redirect({ to: "/distance", statusCode: 301, throw: true });
  },
  head: () => normalizeHead({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
