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
  Ship,
  GraduationCap,
  Stethoscope,
  Timer,
  Accessibility,
  Users,
  Heart,
  Route as RouteIcon,
  Landmark,
  Wine,
  Briefcase,
  BookOpen,
  Trophy,
  Target,
  Circle,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import airportImg from "@/assets/services/airport.jpg.asset.json";
import corporateImg from "@/assets/services/corporate.jpg.asset.json";
import toursImg from "@/assets/services/tours.jpg.asset.json";
import stationImg from "@/assets/services/station.jpg.asset.json";
import eventsImg from "@/assets/services/events.jpg.asset.json";
import vipImg from "@/assets/services/vip.jpg.asset.json";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Cabslink UK Airport Transfers, Golf & Sports Travel" },
      { name: "description", content: "Every Cabslink service: airport, station and cruise transfers, golf and football travel, day tours, hourly hire, corporate accounts and group travel." },
      { property: "og:title", content: "Cabslink Services — UK Airport Transfers, Golf & Sports Travel" },
      { property: "og:description", content: "Airport, station and cruise transfers, golf and football travel, sports events, day tours, hourly hire, corporate accounts, VIP and group travel across the UK." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://cabslink.com/services" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/services" }],
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
    title: "Private Day Tours",
    desc: "Bespoke driver-led days out across Scotland and the wider UK — castles, distilleries, coastlines and film locations, entirely at your pace.",
    to: "/tours",
    img: toursImg.url,
    tag: "Signature",
    points: ["Full-day itineraries", "Local expert drivers", "Price on request"],
  },
];

const showcase = [
  { icon: Crown, title: "VIP Transfers", desc: "Discreet, high-end travel for dignitaries and discerning clients.", to: "/vip-transfers", img: vipImg.url },
  { icon: Building2, title: "Corporate Travel", desc: "Account-managed, invoiced business travel with priority support.", to: "/corporate-travel", img: corporateImg.url },
  { icon: Train, title: "Station Transfers", desc: "Reliable transfers to and from UK rail terminals, on your schedule.", to: "/stations", img: stationImg.url },
  { icon: Trophy, title: "Events & Sports", desc: "Weddings, premieres, golf days and football fixtures — arrive in style, on time.", to: "/event-transport", img: eventsImg.url },
];

type Item = { icon: typeof Plane; title: string; desc: string; to: string };

const groups: { eyebrow: string; heading: string; blurb: string; items: Item[] }[] = [
  {
    eyebrow: "Travel hubs",
    heading: "Airports, stations & ports",
    blurb: "Every arrival and departure point in the UK, with tracked schedules and fixed fares.",
    items: [
      { icon: Plane, title: "Airport Transfers", desc: "All major UK airports with flight tracking and meet & greet.", to: "/airport-transfers" },
      { icon: PlaneLanding, title: "Airport Directory", desc: "Terminal guides, pickup points and fares for each airport.", to: "/airports" },
      { icon: Train, title: "Train Station Transfers", desc: "Kerbside pickup at UK rail terminals, timed to your train.", to: "/stations" },
      { icon: Ship, title: "Cruise Port Transfers", desc: "Embarkation and disembarkation transfers with luggage space.", to: "/cruise-transfers" },
      { icon: Hotel, title: "Minibus Hire", desc: "8, 16 and 24-seat minibuses with a professional driver.", to: "/minibus-hire" },
      { icon: RouteIcon, title: "Long Distance Travel", desc: "City-to-city UK drives in modern, comfortable vehicles.", to: "/long-distance-transfers" },
    ],
  },
  {
    eyebrow: "Business",
    heading: "Corporate & professional travel",
    blurb: "Invoiced accounts, dedicated support and drivers who understand a schedule.",
    items: [
      { icon: Building2, title: "Corporate Transportation", desc: "Managed business travel with monthly invoicing.", to: "/corporate-travel" },
      { icon: Briefcase, title: "Open a Corporate Account", desc: "Set up billing, cost centres and approved travellers.", to: "/corporate-booking" },
      { icon: Landmark, title: "Business Park Transfers", desc: "Recurring runs to offices, campuses and business parks.", to: "/corporate" },
      { icon: Timer, title: "Hourly Hire", desc: "A driver and vehicle on standby for meetings and multi-stop days.", to: "/book/hourly" },
      { icon: Crown, title: "Executive Transfers", desc: "Premium saloons and MPVs with our most experienced drivers.", to: "/executive-transfers" },
      { icon: Award, title: "Event Transport", desc: "Conference, concert and festival movements on a written schedule.", to: "/event-transport" },
    ],
  },
  {
    eyebrow: "Leisure",
    heading: "Tours, days out & experiences",
    blurb: "Curated Scottish itineraries, or build your own route from scratch.",
    items: [
      { icon: Gem, title: "Private Tours", desc: "Full-day and multi-day driver-led tours, price on request.", to: "/tours" },
      { icon: Wine, title: "Distillery Tours", desc: "Whisky trails across Speyside, Islay and the Highlands.", to: "/distilleries" },
      { icon: Landmark, title: "Attraction Transfers", desc: "Castles, lochs and landmarks with waiting time included.", to: "/attractions" },
      { icon: BookOpen, title: "Travel Guides", desc: "Route notes, timings and tips before you book.", to: "/guides" },
      { icon: Map, title: "Scenic Routes", desc: "NC500, Glencoe and Loch Ness drives with photo stops.", to: "/tours" },
      { icon: ShoppingBag, title: "Coach Hire", desc: "25 to 55-seat coaches with driver, luggage holds included.", to: "/coach-hire" },
    ],
  },
  {
    eyebrow: "Specialist",
    heading: "Group, accessible & occasion travel",
    blurb: "Larger parties and sensitive journeys, handled with the same care.",
    items: [
      { icon: Users, title: "Group Transfers", desc: "MPVs, minibuses and coaches for 5–55 passengers, planned as one job.", to: "/group-transfers" },
      { icon: Accessibility, title: "Wheelchair Accessible", desc: "Ramp-equipped vehicles with trained drivers.", to: "/accessibility" },
      { icon: Stethoscope, title: "Hospital Transfers", desc: "Appointment and discharge travel with door-to-door assistance.", to: "/hospital-transfers" },
      { icon: GraduationCap, title: "University Transfers", desc: "Term-start, campus and student arrival transfers.", to: "/university-transfers" },
      { icon: Heart, title: "Wedding Transport", desc: "Bridal cars and guest shuttles on a written timing plan.", to: "/wedding-transport" },
      { icon: Car, title: "Private Hire", desc: "Licensed pre-booked cars for any point-to-point journey.", to: "/private-hire" },
    ],
  },
  {
    eyebrow: "Sporting events",
    heading: "Golf, football & sports travel",
    blurb: "Dedicated transport for golfers, fans, teams and VIP hospitality — across Scotland and the UK.",
    items: [
      { icon: Target, title: "Golf Transfers", desc: "Door-to-door transfers to St Andrews, Carnoustie, Turnberry and top courses.", to: "/golf-transfers" },
      { icon: Circle, title: "Football Transfers", desc: "Match-day transport to stadiums and away fixtures for fans and groups.", to: "/football-transfers" },
      { icon: Car, title: "Stadium Transfers", desc: "Reliable drop-off and pickup at Hampden, Murrayfield and UK grounds.", to: "/stadium-transfers" },
      { icon: Trophy, title: "Major Sporting Events", desc: "The Open, Six Nations, cup finals and race days — travel arranged end to end.", to: "/vip-sports-hospitality" },
      { icon: Users, title: "Team Sports Travel", desc: "Minibuses and coaches for squads, kit and supporters travelling together.", to: "/team-sports-travel" },
      { icon: Crown, title: "VIP Sports Hospitality", desc: "Premium vehicles and discreet drivers for corporate hospitality days.", to: "/vip-sports-hospitality" },
    ],
  },
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Where we shine</p>
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
                  <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gold-ink)] transition-all group-hover:gap-3">
                    Explore service <ArrowRight className="size-4" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Any service, one booking"
        title="Need a driver for one of these services?"
        subtitle="Get a fixed price in under two minutes — or call our 24/7 reservations team."
        tone="navy"
      />



      {/* Image showcase grid */}
      <section className="section-y bg-muted/40">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Tailored travel</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Built around the occasion</h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {showcase.map((s) => (
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
                    View {s.title} <ArrowRight className="size-3.5" />
                  </p>

                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Full service catalogue */}
      <section className="section-y">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Full catalogue</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Every service we operate</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Thirty services across five travel categories. If your journey isn't listed, we'll still quote it — just ask.
            </p>
          </div>

          <div className="mt-12 space-y-14">
            {groups.map((g) => (
              <div key={g.heading}>
                <div className="flex flex-col gap-2 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--gold-ink)]">{g.eyebrow}</p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-[var(--navy)]">{g.heading}</h3>
                  </div>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{g.blurb}</p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((s) => (
                    <Link
                      key={g.heading + s.title}
                      to={s.to}
                      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-raised transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/40 hover:shadow-raised-hover"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold-ink)] transition-colors group-hover:bg-[var(--gold)] group-hover:text-[var(--navy)]">
                        <s.icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-semibold">{s.title}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--gold-ink)] opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl border border-[var(--gold)]/25 bg-[var(--navy)] p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-semibold text-white">Not sure which service fits?</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Tell us the journey and we'll recommend the right vehicle class and quote a fixed fare.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/book" search={{ q: "" }}>Get a fixed quote</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/contact">Talk to our team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
