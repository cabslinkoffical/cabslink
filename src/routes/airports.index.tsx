import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Plane, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FaqSection, LongFormSections, faqJsonLd } from "@/components/site/ContentSections";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { listDestinationsByType, type Destination } from "@/lib/destinations.functions";

const airportsQuery = queryOptions({
  queryKey: ["destinations", "airports", "all"],
  queryFn: () => listDestinationsByType({ data: { type: "airport", tiers: [1, 2, 3] } }),
});

export const Route = createFileRoute("/airports/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(airportsQuery),
  head: () => ({
    meta: [
      { title: "UK Airport Transfers — Every Major Airport | Cabslink" },
      { name: "description", content: "Fixed-fare private transfers to every major UK airport. Meet & greet, flight tracking, 24/7 dispatch across England, Scotland, Wales and Northern Ireland." },
      { property: "og:title", content: "UK Airport Transfers — Every Major Airport" },
      { property: "og:description", content: "Private transfers to every major UK airport. Fixed fares, meet & greet, flight tracking." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/airports" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/airports" }],
    scripts: [faqJsonLd(AP_FAQS)],
  }),
  component: AirportsIndex,
});


const AP_SECTIONS = [
  {
    title: "What an airport page covers",
    paragraphs: [
      "Every airport below has its own page recording the terminals we serve, the arrivals meeting point our drivers use, the designated drop-off area for departures, and realistic driving times from the towns and cities passengers travel in from.",
      "Where an airport charges for terminal access or restricts kerbside stopping, the page says so, because that is what decides where you actually meet the car.",
    ],
  },
  {
    title: "Flight tracking and waiting allowance",
    paragraphs: [
      "Give us the flight number and we track it, so the driver is in position for the landing that happens rather than the one that was scheduled. Early arrivals are brought forward and delays move the booking with them.",
      "Pick-ups include 60 minutes of free waiting from touchdown, which covers normal immigration and reclaim. Anything beyond that is charged at the vehicle's published rate and shown as its own line.",
    ],
  },
  {
    title: "Departures: planning from check-in",
    paragraphs: [
      "For outbound journeys we work backwards from your check-in window and add margin for the approach roads at that time of day, instead of quoting the shortest possible drive.",
      "If you are connecting from a train, a hotel or another airport, tell us and we plan the leg against the flight rather than the departure point.",
    ],
  },
  {
    title: "Fixed fares and extras",
    paragraphs: [
      "Fares are quoted per journey and cover the vehicle, the driver, the route, motorway tolls and standard airport charges. There is no meter, and heavy traffic does not change what you pay.",
      "Additional stops, extra waiting, extra luggage capacity and child seats are optional and priced separately in the quote, so you can see what each adds before confirming.",
    ],
  },
  {
    title: "Groups, luggage and vehicle classes",
    paragraphs: [
      "You choose a vehicle class rather than a specific model: executive saloon, estate or SUV, people carrier for four to seven passengers, then minibus and coach classes for larger parties.",
      "Tell us the number of large cases as well as passengers — on airport work luggage capacity runs out before seating does, and it is the usual reason a booking needs a bigger class.",
    ],
  },
  {
    title: "Regional airports and unusual hours",
    paragraphs: [
      "Alongside the major hubs we cover regional airports and airfields, including business aviation terminals where access is arranged through the handling agent.",
      "Very early departures and landings after the last train are routine bookings, and the price is not inflated because of the hour.",
    ],
  },
];

const AP_FAQS = [
  { q: "Do you track my flight?", a: "Yes. Give us the flight number when booking and we monitor it, moving the pick-up earlier or later to match the actual landing time." },
  { q: "How long will the driver wait after landing?", a: "Airport pick-ups include 60 minutes of free waiting from touchdown. Additional waiting is charged at the vehicle's published rate and appears as a separate line." },
  { q: "Is the fare fixed before I travel?", a: "Yes. The quote covers the vehicle, driver, route, tolls and standard airport charges. Only extras you select change the total, and each one is itemised before you confirm." },
  { q: "Which airports do you cover?", a: "All major UK airports plus regional airports and business aviation terminals. Each published airport page lists the terminals served and the meeting point our drivers use." },
  { q: "Can you collect at 4am or after midnight?", a: "Yes. Early departures and late landings are routine, and we do not apply an out-of-hours surcharge to the quoted fare." },
];

function AirportsIndex() {
  const { data: airports } = useSuspenseQuery(airportsQuery);
  const grouped = new Map<string, Destination[]>();
  for (const a of airports) {
    const key = a.region ?? "United Kingdom";
    const list = grouped.get(key) ?? [];
    list.push(a);
    grouped.set(key, list);
  }
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Airport Transfers"
        title="Every major UK airport."
        subtitle="Fixed-fare private transfers with meet & greet, flight tracking and 24/7 dispatch."
      />
      <section className="section-y">
        <div className="container-x space-y-12">
          {[...grouped.entries()].map(([region, list]) => (
            <div key={region}>
              <h2 className="mb-4 font-display text-2xl font-semibold text-[var(--navy)]">{region}</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {list.map((a) => {
                  const iata = (a.meta?.iata as string | undefined) ?? "";
                  return (
                    <Link
                      key={a.id}
                      to="/airports/$iata"
                      params={{ iata: a.slug }}
                      className="group relative overflow-hidden rounded-[20px] border border-[var(--navy)]/10 bg-white p-6 hover:border-[var(--gold)] hover:-translate-y-1 transition-all shadow-raised hover:shadow-raised-hover"
                    >
                      <div className="flex items-start justify-between">
                        <Plane className="size-6 text-[var(--gold-ink)]" />
                        {iata && <span className="font-mono text-[10px] text-[var(--navy)]/40 tracking-widest">{iata}</span>}
                      </div>
                      <h3 className="mt-6 font-display text-lg font-semibold text-[var(--navy)]">
                        {a.short_name ?? a.name.replace(/ Airport$/, "")}
                      </h3>
                      <p className="text-xs text-[var(--navy)]/55">{a.town ?? a.council ?? a.region}</p>
                      <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)] group-hover:gap-2 transition-all">
                        Book transfer <ArrowRight className="size-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBand
        eyebrow="Airport transfers"
        title="Book a meet & greet airport transfer"
        subtitle="Flight tracking, free waiting time and fixed fares to every UK airport."
        tone="gold"
      />
      <LongFormSections sections={AP_SECTIONS} heading="Booking a UK airport transfer" />
      <FaqSection faqs={AP_FAQS} />
    </SiteLayout>
  );
}
