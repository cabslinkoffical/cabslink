import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane,
  Train,
  Hotel,
  PartyPopper,
  Crown,
  Building2,
  ShoppingBag,
  Award,
  Map,
  Gem,
  Car,
  ArrowRight,
  ShieldCheck,
  Clock,
  BadgePoundSterling,
  PlaneLanding,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import airportImg from "@/assets/services/airport.jpg.asset.json";
import corporateImg from "@/assets/services/corporate.jpg.asset.json";
import toursImg from "@/assets/services/tours.jpg.asset.json";
import stationImg from "@/assets/services/station.jpg.asset.json";
import eventsImg from "@/assets/services/events.jpg.asset.json";
import vipImg from "@/assets/services/vip.jpg.asset.json";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Cabslink UK Airport Transfers & Private Travel" },
      { name: "description", content: "Airport transfers, VIP travel, corporate accounts, private tours, event and station transfers. Premium UK transport from Cabslink." },
      { property: "og:title", content: "Cabslink Services — UK Airport Transfers & Private Travel" },
      { property: "og:description", content: "Airport transfers, VIP travel, corporate accounts, private tours, event and station transfers across the UK." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://cabslink.lovable.app/services" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/services" }],
  }),
  component: ServicesPage,
});

const featured = [
  {
    icon: Plane,
    title: "Airport Transfers",
    desc: "On-time transfers to and from every major UK airport, with live flight tracking, free waiting time and meet & greet inside the terminal.",
    to: "/airport-transfers",
    img: airportImg.url,
    tag: "Most booked",
    points: ["Flight tracking included", "Meet & greet at arrivals", "Fixed, all-in pricing"],
  },
  {
    icon: Gem,
    title: "Private Tours",
    desc: "Bespoke chauffeured days out across Scotland and the wider UK — castles, distilleries, coastlines and film locations, at your pace.",
    to: "/tours",
    img: toursImg.url,
    tag: "Signature",
    points: ["Full-day itineraries", "Local expert drivers", "Price on request"],
  },
];

const services = [
  { icon: Crown, title: "VIP Transfers", desc: "Discreet, high-end travel for dignitaries and discerning clients.", to: "/vip-transfers", img: vipImg.url },
  { icon: Building2, title: "Corporate Transportation", desc: "Account-managed, invoiced business travel with priority support.", to: "/corporate-travel", img: corporateImg.url },
  { icon: Train, title: "Train Station Transfers", desc: "Reliable transfers to and from UK rail terminals, on your schedule.", to: "/services", img: stationImg.url },
  { icon: PartyPopper, title: "Event Transfers", desc: "Weddings, premieres and sporting events — arrive in style, on time.", to: "/services", img: eventsImg.url },
];

const more = [
  { icon: Hotel, title: "Hotel to City Transfers", desc: "Seamless travel between hotels, venues and city destinations.", to: "/services" },
  { icon: Car, title: "Local Travel Services", desc: "Day-hire drivers for meetings, errands and dining.", to: "/services" },
  { icon: Map, title: "Long Distance Travel", desc: "City-to-city UK drives in modern, comfortable vehicles.", to: "/services" },
  { icon: ShoppingBag, title: "Luxury Shopping Trips", desc: "Private driver for premium retail districts and boutiques.", to: "/services" },
  { icon: Award, title: "Award Ceremonies", desc: "Red-carpet arrivals with discreet, well-presented drivers.", to: "/services" },
  { icon: Gem, title: "Tours & Travel Guide", desc: "Bespoke private tours of Scotland, England and the UK.", to: "/tours" },
];

const promises = [
  { icon: ShieldCheck, label: "Licensed & insured", copy: "Fully licensed operators and vetted professional drivers." },
  { icon: Clock, label: "24/7 availability", copy: "Early flights, late finishes — we run around the clock." },
  { icon: BadgePoundSterling, label: "Fixed pricing", copy: "Quoted up front. No meters, no surge, no surprises." },
  { icon: PlaneLanding, label: "Flight tracking", copy: "We adjust to delays automatically at no extra cost." },
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

      {/* Promises strip */}
      <section className="bg-[var(--navy)]">
        <div className="container-x grid grid-cols-2 gap-x-6 gap-y-7 py-8 lg:grid-cols-4">
          {promises.map((p) => (
            <div key={p.label} className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                <p.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{p.label}</p>
                <p className="mt-1 hidden text-xs leading-relaxed text-white/60 sm:block">{p.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured services */}
      <section className="section-y">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">Where we shine</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Signature services</h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {featured.map((f) => (
              <Link
                key={f.title}
                to={f.to}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-raised transition-all hover:-translate-y-1 hover:shadow-raised-hover"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.title}
                    width={1280}
                    height={960}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/25 to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full bg-[var(--gold)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--navy)]">
                    {f.tag}
                  </span>
                  <div className="absolute inset-x-5 bottom-5 flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--gold)] backdrop-blur-sm">
                      <f.icon className="size-5" />
                    </span>
                    <h3 className="font-display text-2xl font-semibold text-white">{f.title}</h3>
                  </div>
                </div>
                <div className="p-6 sm:p-7">
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  <ul className="mt-5 grid gap-2">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-foreground/80">
                        <span className="size-1.5 rounded-full bg-[var(--gold)]" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gold)] transition-all group-hover:gap-3">
                    Explore service <ArrowRight className="size-4" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Image card grid */}
      <section className="section-y bg-muted/40">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">Tailored travel</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Built around the occasion</h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                className="group relative flex h-72 flex-col justify-end overflow-hidden rounded-2xl shadow-raised transition-all hover:-translate-y-1 hover:shadow-raised-hover"
              >
                <img
                  src={s.img}
                  alt={s.title}
                  width={1280}
                  height={960}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/55 to-[var(--navy)]/5" />
                <div className="relative p-5">
                  <span className="grid size-10 place-items-center rounded-lg bg-[var(--gold)]/20 text-[var(--gold)]">
                    <s.icon className="size-5" />
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">{s.desc}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--gold)] transition-all group-hover:gap-3">
                    Learn more <ArrowRight className="size-3.5" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* More services */}
      <section className="section-y">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">Also available</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Every other journey, covered</h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {more.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/40 hover:shadow-raised-hover"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold)] transition-colors group-hover:bg-[var(--gold)] group-hover:text-[var(--navy)]">
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--gold)] opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--navy)] px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">Ready when you are</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70">
              Get an instant fixed quote for any journey, or speak to our team about tailored and account travel.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-semibold text-[var(--navy)] transition-transform hover:scale-[1.03]"
              >
                Book a journey <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                Talk to our team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
