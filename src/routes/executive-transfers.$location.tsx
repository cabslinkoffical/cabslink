import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  ServiceLocationPage,
  serviceLocationHead,
} from "@/components/site/ServiceLocationPage";
import { buildServiceLocation } from "@/lib/seo/service-locations";
import { SiteLayout } from "@/components/site/SiteLayout";

const SERVICE_ID = "executive-transfers";

export const Route = createFileRoute("/executive-transfers/$location")({
  loader: ({ params }) => {
    const content = buildServiceLocation(SERVICE_ID, params.location);
    if (!content) throw notFound();
    return content;
  },
  head: ({ loaderData }) =>
    loaderData
      ? serviceLocationHead(loaderData)
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: () => <ServiceLocationPage content={Route.useLoaderData()} />,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Area not covered yet</h1>
        <p className="mt-2 text-muted-foreground">
          We don't have a dedicated page for this area yet — book online and we'll quote it.
        </p>
      </div>
    </SiteLayout>
  ),
});
