import { createFileRoute, notFound } from "@tanstack/react-router";
import { SolutionPage, solutionSchema } from "@/components/site/SolutionPage";
import { TRAVEL_SOLUTIONS } from "@/lib/seo/travel-solutions";

export const Route = createFileRoute("/travel-solutions/$slug")({
  loader: ({ params }) => {
    const content = TRAVEL_SOLUTIONS[params.slug];
    if (!content) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
    const content = TRAVEL_SOLUTIONS[params.slug];
    if (!content) {
      return {
        meta: [
          { title: "Travel solution unavailable | Cabslink" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const url = `https://cabslink.com/travel-solutions/${content.slug}`;
    return {
      meta: [
        { title: content.metaTitle },
        { name: "description", content: content.metaDescription },
        { property: "og:title", content: content.metaTitle },
        { property: "og:description", content: content.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(solutionSchema(content, url)) },
      ],
    };
  },
  component: SolutionRoute,
});

function SolutionRoute() {
  const { slug } = Route.useLoaderData();
  const content = TRAVEL_SOLUTIONS[slug]!;
  return <SolutionPage content={content} />;
}
