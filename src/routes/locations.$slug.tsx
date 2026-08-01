/**
 * `/locations/:slug` is a legacy duplicate of the canonical `/areas/:slug`
 * city/town page. It now serves a single-hop permanent redirect and renders no
 * content of its own, so only one URL per location returns HTTP 200.
 *
 * Canonical mapping lives in SEO_REDIRECTS (src/lib/seo/service-registry.ts).
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/locations/$slug")({
  loader: ({ params }) => {
    throw redirect({
      to: "/areas/$slug",
      params: { slug: params.slug },
      statusCode: 301,
      throw: true,
    });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex,follow" }] }),
  component: () => null,
});
