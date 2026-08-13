import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane,
  Train,
  Hotel,
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
  Route as RouteIcon,
  Landmark,
  Wine,
  Briefcase,
  BookOpen,
  Trophy,
  Target,
  Circle,
  Plus,
  Minus,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import airportImg from "@/assets/services/airport.jpg.asset.json";
import corporateImg from "@/assets/services/corporate.jpg.asset.json";
import toursImg from "@/assets/services/tours.jpg.asset.json";
import groupImg from "@/assets/services/group.jpg";
import sportsImg from "@/assets/services/sports.jpg";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — UK Airport, Golf & Sports Travel | Cabslink" },
      { name: "description", content: "Every Cabslink service: airport, station and cruise transfers, golf and football travel, day tours, hourly hire, corporate accounts and group travel." },
      { property: "og:title", content: "Services — UK Airport, Golf & Sports Travel | Cabslink" },
      { property: "og:description", content: "Airport, station and cruise transfers, golf and football travel, day tours, hourly hire, corporate accounts and group travel across the UK." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://cabslink.com/services" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/services" }],
  }),
  component: ServicesPage,
});

type Sub = { icon: typeof Plane; title: string; desc: string; to: string };

type MainService = {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  img: string;
  icon: typeof Plane;
  to: string;
  highlights: string[];
  subs: Sub[];
};

const MAIN_SERVICES: MainService[] = [
  {
    id: "airport",
    eyebrow: "Most booked",
    title: "Airport & travel hub transfers",
    blurb:
      "Every arrival and departure point in the UK — airports, rail terminals and cruise ports — with tracked schedules, free waiting time and fixed all-in fares.",
    img: airportImg.url,
    icon: Plane,
    to: "/airport-transfers",
    highlights: ["Live flight tracking", "Meet & greet at arrivals", "Fixed, all-in pricing"],
    subs: [
      { icon: Plane, title: "Airport Transfers", desc: "All major UK airports with flight tracking and meet & greet.", to: "/airport-transfers" },
      { icon: PlaneLanding, title: "Airport Directory", desc: "Terminal guides, pickup points and fares for each airport.", to: "/airports" },
      { icon: Train, title: "Train Station Transfers", desc: "Kerbside pickup at UK rail terminals, timed to your train.", to: "/stations" },
      { icon: Ship, title: "Cruise Port Transfers", desc: "Embarkation and disembarkation transfers with luggage space.", to: "/cruise-transfers" },
      { icon: RouteIcon, title: "Long Distance Travel", desc: "City-to-city UK drives in modern, comfortable vehicles.", to: "/long-distance-transfers" },
      { icon: Car, title: "Private Hire", desc: "Licensed pre-booked cars for any point-to-point journey.", to: "/private-hire" },
    ],
  },
  {
    id: "corporate",
    eyebrow: "Business",
    title: "Corporate & executive travel",
    blurb:
      "Account-managed business travel with monthly invoicing, cost centres and drivers who understand how a schedule works.",
    img: corporateImg.url,
    icon: Building2,
    to: "/corporate-travel",
    highlights: ["Invoiced accounts", "Priority 24/7 support", "Executive vehicle classes"],
    subs: [
      { icon: Building2, title: "Corporate Transportation", desc: "Managed business travel with monthly invoicing.", to: "/corporate-travel" },
      { icon: Briefcase, title: "Open a Corporate Account", desc: "Set up billing, cost centres and approved travellers.", to: "/corporate-booking" },
      { icon: Landmark, title: "Business Park Transfers", desc: "Recurring runs to offices, campuses and business parks.", to: "/corporate" },
      { icon: Timer, title: "Hourly Hire", desc: "A driver and vehicle on standby for meetings and multi-stop days.", to: "/book/hourly" },
      { icon: Crown, title: "Executive Transfers", desc: "Premium saloons and MPVs with our most experienced drivers.", to: "/executive-transfers" },
      { icon: Award, title: "Event Transport", desc: "Conference, concert and festival movements on a written schedule.", to: "/event-transport" },
    ],
  },
  {
    id: "tours",
    eyebrow: "Signature",
    title: "Private tours & days out",
    blurb:
      "Driver-led days across Scotland and the wider UK — castles, distilleries, coastlines and film locations, entirely at your pace.",
    img: toursImg.url,
    icon: Gem,
    to: "/tours",
    highlights: ["Full-day itineraries", "Local expert drivers", "Waiting time included"],
    subs: [
      { icon: Gem, title: "Private Tours", desc: "Full-day and multi-day driver-led tours, price on request.", to: "/tours" },
      { icon: Wine, title: "Distillery Tours", desc: "Whisky trails across Speyside, Islay and the Highlands.", to: "/distilleries" },
      { icon: Landmark, title: "Attraction Transfers", desc: "Castles, lochs and landmarks with waiting time included.", to: "/attractions" },
      { icon: Map, title: "Scenic Routes", desc: "NC500, Glencoe and Loch Ness drives with photo stops.", to: "/tours" },
      { icon: BookOpen, title: "Travel Guides", desc: "Route notes, timings and tips before you book.", to: "/guides" },
      { icon: Crown, title: "VIP Transfers", desc: "Discreet, high-end travel for dignitaries and private clients.", to: "/vip-transfers" },
    ],
  },
  {
    id: "sports",
    eyebrow: "Sporting events",
    title: "Golf, football & sports travel",
    blurb:
      "Dedicated transport for golfers, fans, squads and hospitality guests — from St Andrews tee times to match-day stadium runs.",
    img: sportsImg,
    icon: Trophy,
    to: "/golf-transfers",
    highlights: ["Clubs & kit space", "Match-day timing plans", "Hospitality-grade vehicles"],
    subs: [
      { icon: Target, title: "Golf Transfers", desc: "Door-to-door transfers to St Andrews, Carnoustie, Turnberry and top courses.", to: "/golf-transfers" },
      { icon: Circle, title: "Football Transfers", desc: "Match-day transport to stadiums and away fixtures for fans and groups.", to: "/football-transfers" },
      { icon: Car, title: "Stadium Transfers", desc: "Reliable drop-off and pickup at Hampden, Murrayfield and UK grounds.", to: "/stadium-transfers" },
      { icon: Trophy, title: "Major Sporting Events", desc: "The Open, Six Nations, cup finals and race days, arranged end to end.", to: "/vip-sports-hospitality" },
      { icon: Users, title: "Team Sports Travel", desc: "Minibuses and coaches for squads, kit and supporters travelling together.", to: "/team-sports-travel" },
      { icon: Crown, title: "VIP Sports Hospitality", desc: "Premium vehicles and discreet drivers for corporate hospitality days.", to: "/vip-sports-hospitality" },
    ],
  },
  {
    id: "group",
    eyebrow: "Specialist",
    title: "Group, accessible & care travel",
    blurb:
      "Larger parties and sensitive journeys handled with the same care — from 55-seat coaches to single hospital appointments.",
    img: groupImg,
    icon: Users,
    to: "/group-transfers",
    highlights: ["5–55 passengers", "Ramp-equipped vehicles", "Door-to-door assistance"],
    subs: [
      { icon: Users, title: "Group Transfers", desc: "MPVs, minibuses and coaches for 5–55 passengers, planned as one job.", to: "/group-transfers" },
      { icon: Hotel, title: "Minibus Hire", desc: "8, 16 and 24-seat minibuses with a professional driver.", to: "/minibus-hire" },
      { icon: ShoppingBag, title: "Coach Hire", desc: "25 to 55-seat coaches with driver, luggage holds included.", to: "/coach-hire" },
      { icon: Accessibility, title: "Wheelchair Accessible", desc: "Ramp-equipped vehicles with trained drivers.", to: "/accessibility" },
      { icon: Stethoscope, title: "Hospital Transfers", desc: "Appointment and discharge travel with door-to-door assistance.", to: "/hospital-transfers" },
      { icon: GraduationCap, title: "University Transfers", desc: "Term-start, campus and student arrival transfers.", to: "/university-transfers" },
    ],
  },
];

const promises = [
  { icon: ShieldCheck, label: "Licensed & insured", copy: "Fully licensed operators and vetted professional drivers." },
  { icon: Clock, label: "24/7 availability", copy: "Early flights, late finishes — we run around the clock." },
  { icon: BadgePoundSterling, label: "Fixed pricing", copy: "Quoted up front. No meters, no surge, no surprises." },
  { icon: PlaneLanding, label: "Flight tracking", copy: "We adjust to delays automatically at no extra cost." },
];

function MainServiceCard({ service, open, onToggle }: { service: MainService; open: boolean; onToggle: () => void }) {
  const Icon = service.icon;
  const panelId = `svc-panel-${service.id}`;

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-card shadow-raised transition-all ${
        open ? "border-[var(--gold)]/50 shadow-raised-hover" : "border-border"
      }`}
    >
      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Image */}
        <div className="relative min-h-56 overflow-hidden lg:min-h-full">
          <img
            src={service.img}
            alt={service.title}
            width={1280}
            height={960}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/85 via-[var(--navy)]/25 to-transparent lg:bg-gradient-to-r lg:from-[var(--navy)]/70 lg:via-[var(--navy)]/10 lg:to-transparent" />
          <span className="absolute left-5 top-5 rounded-full bg-[var(--gold)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--navy)]">
            {service.eyebrow}
          </span>
          <span className="absolute bottom-5 left-5 grid size-12 place-items-center rounded-2xl bg-white/10 text-[var(--gold)] backdrop-blur-sm">
            <Icon className="size-6" />
          </span>
        </div>

        {/* Copy */}
        <div className="p-6 sm:p-8">
          <h3 className="font-display text-2xl font-semibold text-[var(--navy)] sm:text-3xl">{service.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.blurb}</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {service.highlights.map((h) => (
              <li
                key={h}
                className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--gold-ink)]"
              >
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="rounded-full">
              <Link to={service.to}>
                Open service <ArrowRight className="size-4" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={panelId}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-[var(--navy)] transition-colors hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
            >
              {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
              {open ? "Hide" : "View"} {service.subs.length} sub-services
            </button>
          </div>
        </div>
      </div>

      {/* Sub-services */}
      <div
        id={panelId}
        hidden={!open}
        className="border-t border-border bg-muted/40 p-6 sm:p-8"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--gold-ink)]">
          Inside {service.title}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {service.subs.map((s) => (
            <Link
              key={service.id + s.title}
              to={s.to}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/50 hover:shadow-raised"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold-ink)] transition-colors group-hover:bg-[var(--gold)] group-hover:text-[var(--navy)]">
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">{s.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--gold-ink)] opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function ServicesPage() {
  const [openId, setOpenId] = useState<string | null>(MAIN_SERVICES[0]!.id);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Our Services"
        title="A complete premium transport service — wherever you're going."
        subtitle="Five main services, thirty specialist journeys. Open a service to see everything it covers."
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

      {/* Quick jump */}
      <section className="border-b border-border bg-background">
        <div className="container-x flex flex-wrap items-center gap-2 py-5">
          <span className="mr-1 text-xs font-bold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Jump to</span>
          {MAIN_SERVICES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setOpenId(s.id);
                document.getElementById(`svc-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-[var(--navy)] transition-colors hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
            >
              {s.title.split(" ")[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Main services with expandable sub-services */}
      <section className="section-y">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Main services</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Choose a main service, then the journey inside it
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Each main service groups the specialist journeys we run most. Open one to see every sub-service, or head
              straight to its landing page.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {MAIN_SERVICES.map((s) => (
              <div key={s.id} id={`svc-${s.id}`} className="scroll-mt-28">
                <MainServiceCard
                  service={s}
                  open={openId === s.id}
                  onToggle={() => setOpenId((cur) => (cur === s.id ? null : s.id))}
                />
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

      <CtaBand
        eyebrow="Any service, one booking"
        title="Need a driver for one of these services?"
        subtitle="Get a fixed price in under two minutes — or call our 24/7 reservations team."
        tone="navy"
      />
    </SiteLayout>
  );
}
