import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Plane, ShieldCheck, Clock3, Star, CalendarCheck, Phone, MapPin,
  Briefcase, Users, Award, BadgePoundSterling, Headset, HandshakeIcon, Car, Building2, GraduationCap, Gem, Route as RouteIcon
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BookingWidget } from "@/components/site/BookingWidget";
import { SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import heroImg from "@/assets/hero.jpg";
import chauffeurImg from "@/assets/chauffeur.jpg";
import edinburghImg from "@/assets/edinburgh.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cabslink — Premium UK Airport Transfers & Chauffeur Services" },
      { name: "description", content: "Reliable, on-time UK airport transfers and luxury chauffeur services. 24/7 booking, flight tracking, meet & greet and a premium fleet across the UK." },
      { property: "og:title", content: "Cabslink — Premium UK Airport Transfers & Chauffeur Services" },
      { property: "og:description", content: "Reliable, on-time UK airport transfers and luxury chauffeur services across the UK." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const benefits = [
  { icon: CalendarCheck, title: "Easy Booking", desc: "Book your transfer online in seconds — confirmation arrives instantly." },
  { icon: BadgePoundSterling, title: "Flexible Rates", desc: "Transparent pricing with no surge fees, no hidden charges." },
  { icon: Plane, title: "Flight Monitoring", desc: "Live flight tracking — your chauffeur is always there on time." },
  { icon: Headset, title: "24/7 Availability", desc: "Round-the-clock support and bookings, every day of the year." },
];

const services = [
  { icon: Plane, title: "Airport Transfers", desc: "Punctual, stress-free transfers to and from every major UK airport.", to: "/airport-transfers" },
  { icon: Building2, title: "Corporate Travel", desc: "Account-managed business travel with professional chauffeurs.", to: "/corporate-travel" },
  { icon: Award, title: "Event Transportation", desc: "Award ceremonies, weddings and red-carpet arrivals in style.", to: "/services" },
  { icon: RouteIcon, title: "Private Tours", desc: "Bespoke Scotland and UK tours with knowledgeable local drivers.", to: "/tours" },
  { icon: Gem, title: "VIP & Executive Transfers", desc: "Discreet, refined chauffeur service for VIPs and dignitaries.", to: "/vip-transfers" },
  { icon: Car, title: "Long Distance Chauffeur", desc: "City-to-city UK chauffeur drives with total comfort.", to: "/services" },
];

const features = [
  { icon: HandshakeIcon, title: "Meet & Greet", desc: "Personal welcome at arrivals with a name board." },
  { icon: Plane, title: "Flight Tracking", desc: "We adjust to delays so you never wait alone." },
  { icon: MapPin, title: "Door-to-Door", desc: "From your front door to your final destination." },
  { icon: Briefcase, title: "Key Account Management", desc: "Dedicated account manager for business clients." },
  { icon: Users, title: "Professional Drivers", desc: "Vetted, local, smartly-dressed chauffeurs." },
  { icon: ShieldCheck, title: "Luxury Fleet", desc: "Modern, immaculate, fully insured vehicles." },
];

const fleet = [
  { name: "Saloon", desc: "Up to 4 passengers · 2 luggage", note: "Everyday comfort" },
  { name: "Executive", desc: "Up to 4 passengers · 3 luggage", note: "Business class" },
  { name: "SUV", desc: "Up to 6 passengers · 4 luggage", note: "Space & style" },
  { name: "MPV", desc: "Up to 7 passengers · 6 luggage", note: "Family travel" },
  { name: "Minibus", desc: "Up to 16 passengers · 16 luggage", note: "Groups & tours" },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden isolate">
        <div className="absolute inset-0 z-0">
          <img src={heroImg} alt="Luxury chauffeur car at UK airport at dusk" width={1920} height={1280} className="size-full object-cover" />
          <div className="absolute inset-0" style={{background:"linear-gradient(90deg, var(--navy) 0%, color-mix(in oklab, var(--navy) 88%, transparent) 60%, color-mix(in oklab, var(--navy) 70%, transparent) 100%)"}} />
        </div>
        <div className="container-x relative z-10 py-16 md:py-28 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-white">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-5">
              <Star className="size-3 fill-current" /> {SITE.tagline}
            </p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.02]">
              Premium UK Airport <span className="text-[var(--gold)]">Transfers</span> & Chauffeur Services
            </h1>
            <p className="mt-6 max-w-xl text-base md:text-lg text-white/80">
              Experience the best of the UK with Cabslink. Reliable, on-time arrivals,
              effortless booking and a team dedicated to making every journey calm,
              professional and refined — around the clock.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero">
                <Link to="/book">Book Your Ride <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="heroGhost">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "10+", v: "Years on the road" },
                { k: "50k+", v: "Journeys delivered" },
                { k: "24/7", v: "Always available" },
              ].map(s => (
                <div key={s.v}>
                  <p className="font-display text-3xl text-[var(--gold)]">{s.k}</p>
                  <p className="text-xs text-white/70 mt-1">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:pl-6">
            <BookingWidget />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Why Cabslink" title="The trusted choice for premium UK travel" subtitle="Every booking is built around punctuality, comfort and professionalism — the standard you should expect from a chauffeur service." center />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(b => (
              <div key={b.title} className="group rounded-2xl border border-border bg-card p-6 hover:border-[var(--gold)]/50 transition shadow-sm">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)] transition">
                  <b.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <SectionHeader eyebrow="Our Services" title="A complete chauffeur & transfer service" subtitle="From airport pickups to multi-day private tours, Cabslink covers every journey with the same uncompromising standard." />
            <Button asChild variant="outline" className="rounded-full self-start"><Link to="/services">All services <ArrowRight className="size-4" /></Link></Button>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map(s => (
              <Link key={s.title} to={s.to} className="group rounded-2xl border border-border bg-card p-7 hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 transition">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--navy)] text-[var(--gold)]">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] group-hover:gap-2 transition-all">Learn more <ArrowRight className="size-4" /></p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AIRPORT TRANSFER COPY */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <img src={chauffeurImg} alt="Cabslink chauffeur opening rear door of luxury sedan" width={1280} height={1600} loading="lazy" className="rounded-3xl object-cover w-full aspect-[4/5] shadow-[var(--shadow-elegant)]" />
            <div className="absolute -bottom-6 -right-4 sm:right-6 glass-card rounded-2xl p-5 max-w-[260px]">
              <div className="flex items-center gap-2 text-[var(--gold)]">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <p className="mt-2 text-sm font-medium">Driver arrived right on time, immaculate car and a calm, professional welcome.</p>
              <p className="mt-2 text-xs text-muted-foreground">— Cabslink passenger</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Airport Transfers</p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">Arrive relaxed.<br />Leave on time. Every time.</h2>
            <p className="mt-5 text-muted-foreground">
              Cabslink delivers reliable, on-time airport transfers across the UK.
              From the moment you land, our chauffeur is waiting — flight tracked,
              terminal known and your luggage handled. No queues, no surge pricing,
              no surprises. Just a smooth ride to your door.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {["Meet & greet at arrivals", "Free 60-minute wait time", "Door-to-door service", "Fixed transparent fare", "Child seats on request", "24/7 live support"].map(item => (
                <li key={item} className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--gold)]" />{item}</li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/airport-transfers">Explore airport transfers <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="What's included" title="Every Cabslink ride, by default" center />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="flex gap-4 rounded-2xl bg-card border border-border p-6">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]"><f.icon className="size-5" /></div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET */}
      <section className="section-y">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <SectionHeader eyebrow="Our Fleet" title="A vehicle for every journey" subtitle="A modern, fully-insured fleet maintained to the highest standards." />
            <Button asChild variant="outline" className="rounded-full self-start"><Link to="/fleet">View full fleet <ArrowRight className="size-4" /></Link></Button>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {fleet.map(f => (
              <div key={f.name} className="rounded-2xl border border-border bg-card p-6 hover:border-[var(--gold)]/50 hover:shadow-md transition">
                <Car className="size-8 text-[var(--gold)]" />
                <h3 className="mt-4 font-display text-xl font-semibold">{f.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--gold)]">{f.note}</p>
                <p className="mt-3 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORPORATE + TOURS SPLIT */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-[var(--navy)] text-white p-8 md:p-12 relative overflow-hidden">
            <Building2 className="size-10 text-[var(--gold)]" />
            <h3 className="mt-5 font-display text-3xl md:text-4xl">Corporate Travel, Effortless</h3>
            <p className="mt-4 text-white/75 max-w-md">
              Account-managed business travel for boards, executives and visiting clients.
              Punctual chauffeurs, monthly invoicing, dedicated support and full reporting.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/80">
              {["Dedicated account manager", "Consolidated monthly invoicing", "Priority 24/7 booking line", "Discreet, vetted chauffeurs"].map(i => <li key={i} className="flex gap-2"><ShieldCheck className="size-4 text-[var(--gold)] shrink-0 mt-0.5" />{i}</li>)}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/corporate-booking">Open corporate account <ArrowRight className="size-4" /></Link></Button>
          </div>
          <div className="rounded-3xl bg-card border border-border p-8 md:p-12 relative overflow-hidden">
            <img src={edinburghImg} alt="Edinburgh skyline" width={1600} height={1024} loading="lazy" className="absolute inset-0 size-full object-cover opacity-15" />
            <div className="relative">
              <GraduationCap className="size-10 text-[var(--gold)]" />
              <h3 className="mt-5 font-display text-3xl md:text-4xl">Private Tours & Trips</h3>
              <p className="mt-4 text-muted-foreground max-w-md">
                Discover Scotland and the UK with a private chauffeur and a tailored itinerary —
                Edinburgh, the Highlands, the Lake District, Cotswolds and beyond.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {["Bespoke routes & multi-day trips", "Knowledgeable local drivers", "Hotel & restaurant arrangements", "Family & group-friendly vehicles"].map(i => <li key={i} className="flex gap-2"><ShieldCheck className="size-4 text-[var(--gold)] shrink-0 mt-0.5" />{i}</li>)}
              </ul>
              <Button asChild variant="outline" className="mt-8 rounded-full"><Link to="/tours">Browse tours <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* DRIVE WITH US CTA */}
      <section className="section-y">
        <div className="container-x">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 shadow-sm">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Drive With Us</p>
              <h3 className="font-display text-3xl md:text-4xl font-semibold leading-tight">Partner with Cabslink as a chauffeur or fleet operator</h3>
              <p className="mt-4 text-muted-foreground max-w-2xl">
                We work with professional drivers and licensed fleet partners across the UK.
                Join a respected brand, get steady premium work, and grow your business with us.
              </p>
            </div>
            <Button asChild variant="gold" size="lg" className="rounded-full"><Link to="/drive-with-us">Apply to drive <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x grid lg:grid-cols-3 gap-6">
          {[
            { icon: Phone, title: "Call us 24/7", lines: [SITE.phoneUK, SITE.phoneUS], href: `tel:${SITE.phoneUK.replace(/\s/g,"")}` },
            { icon: MapPin, title: "Visit our office", lines: [SITE.address], href: "#" },
            { icon: Clock3, title: "Always available", lines: ["365 days a year, 24/7 dispatch and support"], href: "/contact" },
          ].map(c => (
            <a key={c.title} href={c.href} className="group rounded-2xl border border-border bg-card p-7 hover:border-[var(--gold)]/50 transition">
              <c.icon className="size-7 text-[var(--gold)]" />
              <h4 className="mt-5 font-display text-2xl">{c.title}</h4>
              {c.lines.map(l => <p key={l} className="text-sm text-muted-foreground mt-1">{l}</p>)}
            </a>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
