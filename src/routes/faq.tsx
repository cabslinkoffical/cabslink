import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { FaqBand } from "@/components/site/PageBand";
import { faqSchema } from "@/components/seo/schema";
import { listPublicVehicleClasses } from "@/lib/vehicle-classes.functions";
import { FAQ_GROUPS, vehicleFaqs } from "@/content/faq-bank";

const TITLE = "Cabslink FAQs — Booking, Prices, Payment & Airport Pickups";
const DESCRIPTION =
  "Answers to common questions about booking a Cabslink private transfer: fixed prices, payment, cancellations, airport waiting, meet and greet, luggage and child seats.";
const URL = "https://cabslink.com/faq";

const classesQuery = queryOptions({
  queryKey: ["public-vehicle-classes"],
  queryFn: () => listPublicVehicleClasses(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/faq")({
  loader: async ({ context }) => {
    const classes = await context.queryClient.ensureQueryData(classesQuery).catch(() => []);
    return { vehicle: vehicleFaqs(classes) };
  },
  head: ({ loaderData }) =>
    normalizeHead({
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: URL },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            faqSchema([...FAQ_GROUPS.flatMap((g) => g.items), ...(loaderData?.vehicle ?? [])]),
          ),
        },
      ],
    }),
  component: FaqPage,
});

function FaqPage() {
  const { vehicle } = Route.useLoaderData();
  // Keep the live fleet sizes in sync after hydration too.
  useSuspenseQuery(classesQuery);
  return (
    <SiteLayout
      cta={{
        heading: <>Ready to <span className="text-gold">book</span>?</>,
        label: "Get a fixed price",
        trackAs: "final_cta_faq",
        subtitle: "See your fixed price for every vehicle before you pay, or call our team.",
      }}
    >
      <PageHero
        eyebrow="Help"
        title="Frequently asked questions"
        subtitle="Short answers about booking, prices, payment, airport pickups and vehicles. Policy details match our Booking & Cancellation page."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "FAQs", to: "/faq" }]}
      />
      {FAQ_GROUPS.map((g) => (
        <FaqBand key={g.id} id={g.id} eyebrow="FAQs" title={g.title} items={g.items} />
      ))}
      <FaqBand id="vehicles" eyebrow="FAQs" title="Vehicles and luggage" items={vehicle}>
        <p className="mt-8 text-sm text-muted-foreground">
          See every vehicle class on our <Link to="/fleet" className="underline">Fleet page</Link>, or read the full{" "}
          <Link to="/booking-policy" className="underline">Booking & Cancellation policy</Link>.
        </p>
      </FaqBand>
    </SiteLayout>
  );
}
