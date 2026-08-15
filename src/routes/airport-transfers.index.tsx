import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, ShieldCheck, Clock, MapPin, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FaqSection, LongFormSections, faqJsonLd } from "@/components/site/ContentSections";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { BookingWidget } from "@/components/site/BookingWidget";
import { InternalLinkHub } from "@/components/seo/InternalLinkHub";

export const Route = createFileRoute("/airport-transfers/")({
  head: () => ({
    meta: [
      { title: "Airport Transfers — Cabslink UK" },
      { name: "description", content: "Reliable UK airport transfers with flight tracking, meet & greet and fixed transparent fares. Edinburgh, Heathrow, Gatwick, Manchester and more." },
      { property: "og:title", content: "UK Airport Transfers — Cabslink" },
      { property: "og:description", content: "Reliable UK airport transfers with flight tracking, meet & greet and fixed transparent fares. Edinburgh, Heathrow, Gatwick, Manchester and more." },
      { property: "og:url", content: "https://cabslink.com/airport-transfers" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/airport-transfers" }],
    scripts: [faqJsonLd(AT_FAQS)],
  }),
  component: AirportPage,
});

const airports = ["Edinburgh (EDI)", "Glasgow (GLA)", "Aberdeen (ABZ)", "London Heathrow (LHR)", "London Gatwick (LGW)", "London Stansted (STN)", "London Luton (LTN)", "London City (LCY)", "Manchester (MAN)", "Birmingham (BHX)", "Newcastle (NCL)", "Liverpool (LPL)"];


const AT_SECTIONS = [
  {
    title: "How airport timing is planned",
    paragraphs: [
      "We plan an airport run backwards from your check-in window rather than quoting a bare driving time. That means adding margin for the approaches that reliably congest — the M8 into Edinburgh and Glasgow at commuter hours, the M25 around Heathrow and Gatwick, and the tunnel approaches into Manchester.",
      "For departures we confirm the collection time with the quote, and we would rather build in twenty spare minutes at the terminal than shave them off the road.",
    ],
  },
  {
    title: "Arrivals, flight tracking and waiting time",
    paragraphs: [
      "Give us your flight number and we track it. If you land early the driver is brought forward; if the inbound slips, the booking moves with it rather than being treated as a missed pick-up.",
      "Airport pick-ups include 60 minutes of free waiting after landing, which covers normal immigration and baggage reclaim. Waiting beyond that is charged at the vehicle's published rate and is shown as a separate line, never folded silently into the fare.",
    ],
  },
  {
    title: "Meet and greet, or kerbside",
    paragraphs: [
      "On a meet and greet the driver parks and waits inside arrivals with a name board, which is the sensible option on a first visit, with children, or when several passengers arrive on different bags.",
      "If you would rather walk out, we agree a specific pick-up bay in advance. Either way you know before you fly where the car will be, instead of following signs to a rank.",
    ],
  },
  {
    title: "Vehicle class, luggage and child seats",
    paragraphs: [
      "You book a class, not a registration: an executive saloon for one or two passengers with cabin bags, an estate or SUV where hold cases are larger, a people carrier for four to seven, and minibus or coach classes above that.",
      "Give us the large-case count as well as the passenger count — luggage usually decides the class before seats do. Child and booster seats are requested at booking and fitted before the driver sets off.",
    ],
  },
  {
    title: "Fares, extras and what is included",
    paragraphs: [
      "The quote covers the vehicle, the driver and the route you enter, including motorway tolls and standard airport drop-off charges. There is no meter running in the car and the figure does not change because traffic was heavy.",
      "Extras that do change the price — additional stops, extended waiting, extra luggage capacity, child seats — are listed separately in the quote so you can see exactly what each one adds before you confirm.",
    ],
  },
  {
    title: "Early mornings, late landings and delays",
    paragraphs: [
      "A large share of UK airport work runs outside normal hours: 4am departures and landings after the last train. Both are ordinary bookings for us, and the price does not spike because of the hour.",
      "If a flight is cancelled or diverted, contact us with the booking reference. We move the journey to the revised arrival rather than charging for a journey nobody could have made.",
    ],
  },
];

const AT_FAQS = [
  { q: "How much free waiting time do I get at the airport?", a: "Airport pick-ups include 60 minutes of free waiting after landing, measured from touchdown rather than your scheduled arrival. Additional waiting is charged at the vehicle's published rate and shown separately." },
  { q: "What happens if my flight is delayed?", a: "We track the flight you give us and adjust the pick-up automatically, whether it lands early or late. If it is cancelled, contact us and we will move the booking to your revised arrival." },
  { q: "Is the fare fixed?", a: "Yes. The quote covers the vehicle, driver and route including tolls and standard airport charges. Only extras you choose — additional stops, extended waiting, child seats — change the total, and each is listed before you confirm." },
  { q: "Do you meet me inside arrivals?", a: "If you book meet and greet, the driver parks and waits in the arrivals hall with a name board. Otherwise we agree a specific kerbside pick-up bay in advance." },
  { q: "Which UK airports do you cover?", a: "All major UK airports, including Edinburgh, Glasgow, Aberdeen, Heathrow, Gatwick, Stansted, Luton, London City, Manchester, Birmingham, Newcastle and Liverpool, plus regional airfields on request." },
  { q: "How do I pay?", a: "Our team confirms the booking and sends you the payment arrangement for your journey. We do not take card details on the website, so nothing is charged when you submit the form." },
];

function AirportPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Airport Transfers"
        title="On-time airport transfers across the UK."
        subtitle="Flight-tracked pickups, meet & greet at arrivals and a fixed, transparent fare — Cabslink takes the stress out of every airport run."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services", to: "/services" }, { label: "Airport Transfers" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionHeader eyebrow="What's included" title="Smooth from booking to arrival" subtitle="Every airport transfer comes with what should be standard — and rarely is." />
            <ul className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                { i: Plane, t: "Live flight tracking", d: "We adjust to delays automatically." },
                { i: ShieldCheck, t: "Meet & greet", d: "Personal welcome with a name board at arrivals." },
                { i: Clock, t: "Free wait time", d: "60 minutes after landing — at no extra cost." },
                { i: MapPin, t: "Door-to-door", d: "From home, hotel or office to your terminal." },
              ].map(f => (
                <li key={f.t} className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><f.i className="size-5" /></div>
                  <div><h4 className="font-semibold">{f.t}</h4><p className="text-sm text-muted-foreground mt-1">{f.d}</p></div>
                </li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><a href="/#booking">Book your transfer <ArrowRight className="size-4" /></a></Button>
          </div>
          <BookingWidget tone="light" />
        </div>
      </section>
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="UK coverage" title="We cover every major UK airport" center />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {airports.map(a => (
              <div key={a} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-[var(--gold)]/50 transition">
                <Plane className="size-4 text-[var(--gold-ink)]" />
                <span className="text-sm font-medium">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <LongFormSections sections={AT_SECTIONS} heading="How Cabslink airport transfers work" />
      <FaqSection faqs={AT_FAQS} />

      {/* Automated services ↔ airports ↔ locations cross-links */}
      <section className="section-y">
        <div className="container-x">
          <InternalLinkHub kind="service" slug="airport-transfers" className="" heading="Airport transfers — where to next" />
        </div>
      </section>
    </SiteLayout>
  );
}
