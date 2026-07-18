import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, Train, Hotel, PartyPopper, Crown, Building2, ShoppingBag, Award, Map, Gem, Car, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Cabslink UK Airport Transfers & Driver" },
      { name: "description", content: "Airport transfers, VIP driver, corporate travel, private tours, event transfers and more. Premium UK transport from Cabslink." },
      { property: "og:title", content: "Cabslink Services" },
      { property: "og:description", content: "Airport transfers, VIP driver, corporate travel, private tours, event transfers and more. Premium UK transport from Cabslink." },
      { property: "og:url", content: "https://cabslink.lovable.app/services" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/services" }],
  }),
  component: ServicesPage,
});

const all = [
  { icon: Plane, title: "Airport Transfers", desc: "On-time transfers to and from every major UK airport, with flight tracking and meet & greet.", to: "/airport-transfers" },
  { icon: Crown, title: "VIP Transfers", desc: "Discreet, high-end airport travel service for dignitaries and discerning clients.", to: "/vip-transfers" },
  { icon: Train, title: "Train Station Transfers", desc: "Reliable transfers to and from UK rail terminals, on your schedule.", to: "/services" },
  { icon: Hotel, title: "Hotel to City Transfers", desc: "Seamless travel between hotels, venues and city destinations.", to: "/services" },
  { icon: PartyPopper, title: "Event Transfers", desc: "Weddings, premieres, sporting events — arrive in style, on time.", to: "/services" },
  { icon: Car, title: "Local Airport Travel Services", desc: "By-the-hour local drivers for meetings, errands and dining.", to: "/services" },
  { icon: Map, title: "Long Distance Driver", desc: "City-to-city UK drives in modern, comfortable vehicles.", to: "/services" },
  { icon: Building2, title: "Corporate Transportation", desc: "Account-managed, invoiced business travel with priority support.", to: "/corporate-travel" },
  { icon: ShoppingBag, title: "Luxurious Shopping Trips", desc: "Private driver for premium retail districts and boutique shopping.", to: "/services" },
  { icon: Award, title: "Award Ceremonies", desc: "Red-carpet arrivals with discreet, well-presented drivers.", to: "/services" },
  { icon: Gem, title: "Tours & Travel Guide", desc: "Bespoke private tours of Scotland, England and the UK at large.", to: "/tours" },
];

function ServicesPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Services"
        title="A complete premium transport service — wherever you're going."
        subtitle="From a quick airport transfer to multi-day private tours, every Cabslink service is built on punctuality, comfort and professionalism."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Services" }]}
      />
      <section className="section-y">
        <div className="container-x grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {all.map(s => (
            <Link key={s.title} to={s.to} className="group rounded-2xl border border-border bg-card p-7 hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 transition">
              <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]"><s.icon className="size-5" /></div>
              <h3 className="mt-5 font-display text-2xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] group-hover:gap-2 transition-all">Learn more <ArrowRight className="size-4" /></p>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
