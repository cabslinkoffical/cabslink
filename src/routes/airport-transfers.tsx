import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, ShieldCheck, Clock, MapPin, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { BookingWidget } from "@/components/site/BookingWidget";

export const Route = createFileRoute("/airport-transfers")({
  head: () => ({
    meta: [
      { title: "Airport Transfers — Cabslink UK" },
      { name: "description", content: "Reliable UK airport transfers with flight tracking, meet & greet and fixed transparent fares. Edinburgh, Heathrow, Gatwick, Manchester and more." },
      { property: "og:title", content: "UK Airport Transfers — Cabslink" },
      { property: "og:url", content: "/airport-transfers" },
    ],
    links: [{ rel: "canonical", href: "/airport-transfers" }],
  }),
  component: AirportPage,
});

const airports = ["Edinburgh (EDI)", "Glasgow (GLA)", "Aberdeen (ABZ)", "London Heathrow (LHR)", "London Gatwick (LGW)", "London Stansted (STN)", "London Luton (LTN)", "London City (LCY)", "Manchester (MAN)", "Birmingham (BHX)", "Newcastle (NCL)", "Liverpool (LPL)"];

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
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]"><f.i className="size-5" /></div>
                  <div><h4 className="font-semibold">{f.t}</h4><p className="text-sm text-muted-foreground mt-1">{f.d}</p></div>
                </li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><a href="/#booking">Book your transfer <ArrowRight className="size-4" /></a></Button>
          </div>
          <BookingWidget />
        </div>
      </section>
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="UK coverage" title="We cover every major UK airport" center />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {airports.map(a => (
              <div key={a} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-[var(--gold)]/50 transition">
                <Plane className="size-4 text-[var(--gold)]" />
                <span className="text-sm font-medium">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
