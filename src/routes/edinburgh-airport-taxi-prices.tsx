import { createFileRoute, Link } from "@tanstack/react-router";
import { normalizeHead } from "@/lib/seo/page-head";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { PageBand, FaqBand } from "@/components/site/PageBand";
import { Button } from "@/components/ui/button";
import { getJourney } from "@/lib/seo/journeys";
import { getRouteFares } from "@/lib/seo/route-fares.functions";
import { FACT_TEXT } from "@/lib/site-facts";

const URL = "https://cabslink.com/edinburgh-airport-taxi-prices";
const TITLE = "Edinburgh Airport Taxi Prices & Costs | Cabslink";
const DESC = "Compare Edinburgh Airport taxi prices for the city centre and other destinations. View live starting fares per vehicle and get your exact fixed quote online.";
const SLUGS = ["city-centre", "edinburgh-waverley", "glasgow", "stirling", "perth", "dundee", "st-andrews", "gleneagles", "aberdeen", "inverness", "fort-william", "glencoe"].map((s) => `edinburgh-airport-to-${s}`);

const FAQS = [
  { q: "How much is a taxi from Edinburgh Airport?", a: "It depends on the destination and the vehicle. The table on this page shows the current starting price for each popular route, taken from our booking system. Enter your exact pickup and drop-off to get your fixed price before you pay." },
  { q: "Is the price fixed?", a: "Yes. The price is fixed when you book, so traffic on the day does not change what you pay. " + FACT_TEXT.feesIncluded },
  { q: "Is the price per person?", a: "No. Prices are per vehicle, not per passenger." },
  { q: "What if my flight is late?", a: FACT_TEXT.flightTracking + " " + FACT_TEXT.airportWait },
  { q: "Can I cancel?", a: FACT_TEXT.transferCancellation },
];

export const Route = createFileRoute("/edinburgh-airport-taxi-prices")({
  loader: async () => {
    const rows = await Promise.all(SLUGS.map(async (slug) => {
      const j = getJourney(slug);
      if (!j || j.review) return null;
      const f = await getRouteFares({ data: { slug, miles: j.miles, minutes: j.mins } }).catch(() => null);
      const prices = f?.fares.map((x) => x.price) ?? [];
      return { slug, to: j.to.name, miles: j.miles, mins: j.mins, from: prices.length ? Math.min(...prices) : null, sym: f?.currencySymbol ?? "£" };
    }));
    return { rows: rows.filter((r) => r !== null) };
  },
  head: () => normalizeHead({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }],
  }),
  component: PricesPage,
});

function PricesPage() {
  const { rows } = Route.useLoaderData();
  const cityCentre = rows.find((r) => r.slug === "edinburgh-airport-to-city-centre");
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Edinburgh Airport"
        title="Edinburgh Airport taxi prices"
        subtitle="Starting prices for popular destinations from Edinburgh Airport, per vehicle and fixed before you pay."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Edinburgh Airport taxi prices" }]}
      />
      <PageBand eyebrow="Prices" title="Popular routes from Edinburgh Airport" subtitle="Prices come from our live booking system for the smallest suitable vehicle. Larger vehicles cost more; your exact price is shown when you enter your journey.">
        <div className="mb-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">{cityCentre?.from != null
            ? `A Cabslink private transfer from Edinburgh Airport to Edinburgh city centre starts from ${cityCentre.sym}${cityCentre.from.toFixed(2)} per vehicle. The journey is approximately ${cityCentre.miles} miles and takes about ${cityCentre.mins} minutes, depending on traffic and your destination.`
            : "Enter your Edinburgh Airport pickup and exact destination to get a fixed private-transfer price per vehicle before you pay."}</p>
          <p>This is a starting fare, not an exact quote for every hotel or street. Your destination address, vehicle, passenger and luggage requirements, and selected extras determine the final quote. Optional Meet &amp; Greet and child seats are priced separately when selected.</p>
          <p><Link to="/routes/$slug" params={{ slug: "edinburgh-airport-to-city-centre" }} className="font-semibold text-gold-ink underline underline-offset-4">Edinburgh Airport to city centre transfer</Link>{" · "}<Link to="/guides/$slug" params={{ slug: "edinburgh-airport-to-city-centre" }} className="font-semibold text-gold-ink underline underline-offset-4">Compare tram, bus and private transfer</Link></p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--navy)] text-[var(--navy-foreground)]">
              <tr><th scope="col" className="px-5 py-3.5">Destination</th><th scope="col" className="px-5 py-3.5">Distance</th><th scope="col" className="px-5 py-3.5">Drive time</th><th scope="col" className="px-5 py-3.5 text-right">From</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug} className="border-t border-border">
                  <th scope="row" className="px-5 py-3.5 font-semibold text-[var(--navy)]">
                    <Link to="/routes/$slug" params={{ slug: r.slug }} className="underline-offset-4 hover:underline">{r.to}</Link>
                  </th>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.miles} miles</td>
                  <td className="px-5 py-3.5 text-muted-foreground">about {r.mins >= 60 ? `${Math.floor(r.mins / 60)}h ${r.mins % 60 ? `${r.mins % 60}m` : ""}` : `${r.mins} min`}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">{r.from !== null ? `${r.sym}${r.from.toFixed(2)}` : "Get a quote"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8"><Button asChild variant="gold" className="rounded-lg"><Link to="/book">Get a fixed price</Link></Button></div>
      </PageBand>
      <PageBand eyebrow="What's included" title="What the price covers">
        <ul className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          {[FACT_TEXT.feesIncluded, FACT_TEXT.flightTracking, FACT_TEXT.airportWait, FACT_TEXT.meetGreet].map((t) => <li key={t} className="rounded-2xl border border-border bg-card p-5">{t}</li>)}
        </ul>
      </PageBand>
      <FaqBand title="Edinburgh Airport taxi prices — questions" items={FAQS} />
    </SiteLayout>
  );
}
