import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Plane, ShieldCheck, Clock3, Star, CalendarCheck, Phone, MapPin,
  Briefcase, Users, Award, BadgePoundSterling, Headset, Car, Building2, GraduationCap, Gem,
  Route as RouteIcon, CheckCircle2, Sparkles, MessageSquare, CreditCard
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BookingWidget } from "@/components/site/BookingWidget";
import { SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import heroImg from "@/assets/hero.jpg";
import chauffeurImg from "@/assets/chauffeur.jpg";
import edinburghImg from "@/assets/edinburgh.jpg";
import vClassImg from "@/assets/v-class.jpg";
import vClassInteriorImg from "@/assets/v-class-interior.jpg";
import airportImg from "@/assets/airport.jpg";
import corporateImg from "@/assets/corporate.jpg";
import fleetSuvImg from "@/assets/fleet-suv.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cabslink — Premium UK Airport Transfers & Chauffeur Services" },
      { name: "description", content: "Premium UK airport transfers and chauffeur services in our Mercedes-Benz V-Class fleet. Flight-tracked, meet & greet, fixed fares, 24/7." },
      { property: "og:title", content: "Cabslink — Premium UK Airport Transfers & Chauffeur Services" },
      { property: "og:description", content: "Premium UK airport transfers and chauffeur services across the UK — Mercedes V-Class fleet, fixed fares, 24/7." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const stats = [
  { value: "50k+", label: "Journeys delivered" },
  { value: "4.9★", label: "Avg. customer rating" },
  { value: "24/7", label: "Live dispatch & support" },
  { value: "100%", label: "Fixed transparent fares" },
];

const services = [
  { icon: Plane, title: "Airport Transfers", desc: "Punctual, stress-free transfers to and from every major UK airport.", to: "/airport-transfers", img: airportImg },
  { icon: Building2, title: "Corporate Travel", desc: "Account-managed business travel with professional chauffeurs.", to: "/corporate-travel", img: corporateImg },
  { icon: Gem, title: "VIP & Executive", desc: "Discreet, refined chauffeur service for VIPs and dignitaries.", to: "/vip-transfers", img: vClassInteriorImg },
  { icon: RouteIcon, title: "Private Tours", desc: "Bespoke Scotland and UK tours with knowledgeable local drivers.", to: "/tours", img: edinburghImg },
  { icon: Award, title: "Events & Weddings", desc: "Award ceremonies, weddings and red-carpet arrivals in style.", to: "/services", img: chauffeurImg },
  { icon: Car, title: "Long Distance", desc: "City-to-city UK chauffeur drives with total comfort.", to: "/services", img: fleetSuvImg },
];

const steps = [
  { icon: MessageSquare, title: "Tell us your trip", desc: "Enter pickup, drop-off, date and any flight details — takes 30 seconds." },
  { icon: CheckCircle2, title: "Confirm instantly", desc: "Receive a fixed-fare quote and a booking confirmation by email." },
  { icon: Car, title: "Sit back, relax", desc: "Your chauffeur arrives early, tracks your flight and gets you there on time." },
];

const features = [
  { icon: CalendarCheck, title: "Easy Booking", desc: "Confirm in under 60 seconds, 24/7." },
  { icon: BadgePoundSterling, title: "Fixed Fares", desc: "Transparent pricing, no surge, no surprises." },
  { icon: Plane, title: "Flight Tracking", desc: "We monitor delays so you never wait alone." },
  { icon: Headset, title: "24/7 Support", desc: "Live dispatch every day of the year." },
  { icon: ShieldCheck, title: "Vetted Chauffeurs", desc: "Fully licensed, smartly-dressed professionals." },
  { icon: CreditCard, title: "Secure Payment", desc: "Pay online, by card or on account." },
];

const fleet = [
  { name: "Mercedes V-Class", desc: "Up to 7 passengers · 7 luggage", note: "Signature ride" },
  { name: "Executive Saloon", desc: "Up to 4 passengers · 3 luggage", note: "Business class" },
  { name: "Saloon", desc: "Up to 4 passengers · 2 luggage", note: "Everyday comfort" },
  { name: "SUV", desc: "Up to 6 passengers · 4 luggage", note: "Space & style" },
  { name: "Minibus", desc: "Up to 16 passengers · 16 luggage", note: "Groups & tours" },
];

const testimonials = [
  { name: "Sarah M.", role: "Frequent flyer · Edinburgh", quote: "Driver was waiting at arrivals with a name board. Immaculate V-Class, calm and professional. Best transfer service I've used in the UK." },
  { name: "James R.", role: "Operations Director", quote: "We moved our entire executive travel to Cabslink. Reliable, on-time, polished — and the monthly invoicing is a relief." },
  { name: "Priya K.", role: "Wedding planner", quote: "They handled five vehicles across two venues without a hitch. Pure professionalism from start to finish." },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden isolate hero-gradient">
        <div className="absolute inset-0 z-0 opacity-20">
          <img src={heroImg} alt="" aria-hidden width={1920} height={1280} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy)] via-transparent to-[var(--navy)]" />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[44%] z-0 hidden sm:flex justify-center select-none">
          <span className="font-display font-bold tracking-[-0.04em] text-[18vw] leading-none text-white/[0.035]">CABSLINK</span>
        </div>

        <div className="container-x relative z-10 pt-12 md:pt-20 pb-8">
          <div className="text-center max-w-4xl mx-auto">
            <p className="inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-[0.28em] text-[var(--gold)] font-semibold mb-5 px-3 py-1.5 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5">
              <Sparkles className="size-3" /> UK's Trusted Chauffeur Company
            </p>
            <h1 className="font-display font-bold text-white text-[2.25rem] sm:text-5xl md:text-7xl lg:text-[5.25rem] leading-[1.03] tracking-tight">
              Premium UK Chauffeur <br className="hidden md:block" /> & <span className="text-[var(--gold)]">Airport Transfers</span>
            </h1>
            <p className="mt-5 md:mt-6 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-white/70">
              Travel in our signature Mercedes-Benz V-Class with vetted chauffeurs, flight tracking, meet &amp; greet and fixed fares — across Edinburgh, London and the entire UK.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild variant="slash">
                <Link to="/book">Book a Ride <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="heroGhost">
                <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}><Phone className="size-4" /> {SITE.phoneUK}</a>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[var(--gold)]" /> Fully licensed & insured</span>
              <span className="inline-flex items-center gap-1.5"><Plane className="size-3.5 text-[var(--gold)]" /> Flight tracked</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-[var(--gold)]" /> 24/7 support</span>
              <span className="inline-flex items-center gap-1.5"><Star className="size-3.5 text-[var(--gold)] fill-current" /> 4.9 / 5 rated</span>
            </div>
          </div>

          {/* Car centerpiece */}
          <div className="relative mt-8 md:mt-12">
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--gold)_25%,transparent),transparent_70%)] blur-2xl" aria-hidden />
              <img
                src={vClassImg}
                alt="Mercedes-Benz V-Class chauffeur vehicle"
                width={1600}
                height={1000}
                className="relative w-full object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]"
                style={{ maskImage: "linear-gradient(to bottom, black 85%, transparent)" }}
              />
            </div>

            {/* Desktop-only floating cards (avoid clipping the car on mobile) */}
            <div className="hidden md:block absolute right-6 lg:right-10 top-6 lg:top-10 w-[200px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 text-center">
              <p className="font-display text-4xl lg:text-5xl font-bold text-[var(--gold)]">50k+</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/80">Journeys delivered</p>
            </div>
            <div className="hidden md:block absolute left-6 lg:left-10 bottom-10 w-[200px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
              <div className="flex items-center gap-1 text-[var(--gold)]">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}
              </div>
              <p className="mt-2 font-display text-2xl font-bold">4.9/5</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/70">Customer rating</p>
            </div>
          </div>
        </div>

        <div className="taxi-stripe h-2 w-full" aria-hidden />
      </section>

      {/* BOOKING WIDGET */}
      <section className="relative z-20">
        <div className="container-x">
          <div className="-translate-y-10 md:-translate-y-16">
            <BookingWidget />
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="-mt-4 md:-mt-6">
        <div className="container-x">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border bg-border">
            {stats.map(s => (
              <div key={s.label} className="bg-[var(--surface)] p-5 md:p-7 text-center">
                <p className="font-display text-3xl md:text-4xl font-bold text-[var(--gold)]">{s.value}</p>
                <p className="mt-1 text-[11px] md:text-xs uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="Three steps to a premium ride" subtitle="From quote to chauffeur at your door — built to feel effortless." center />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border bg-card p-7 hover:border-[var(--gold)]/50 transition">
                <span className="absolute top-5 right-5 font-display text-5xl font-bold text-white/5">0{i + 1}</span>
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES — luxury image cards */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <SectionHeader eyebrow="Our Services" title="A complete chauffeur & transfer service" subtitle="From airport pickups to multi-day private tours — one trusted standard, every journey." />
            <Button asChild variant="outline" className="rounded-full self-start"><Link to="/services">All services <ArrowRight className="size-4" /></Link></Button>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(s => (
              <Link
                key={s.title}
                to={s.to}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card aspect-[4/5] flex flex-col justify-end hover:border-[var(--gold)]/50 transition"
              >
                <img
                  src={s.img}
                  alt={s.title}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
                <div className="absolute top-5 left-5 grid size-11 place-items-center rounded-xl bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]">
                  <s.icon className="size-5" />
                </div>
                <div className="relative p-6 text-white">
                  <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/75">{s.desc}</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--gold)] group-hover:gap-2 transition-all">
                    Learn more <ArrowRight className="size-4" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AIRPORT COPY */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <img src={chauffeurImg} alt="Cabslink chauffeur opening rear door of Mercedes V-Class" width={1280} height={1600} loading="lazy" className="rounded-3xl object-cover w-full aspect-[4/5] shadow-[var(--shadow-elegant)]" />
            <div className="absolute -bottom-6 right-4 sm:right-6 glass-card rounded-2xl p-5 max-w-[260px]">
              <div className="flex items-center gap-2 text-[var(--gold)]">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <p className="mt-2 text-sm font-medium">Driver arrived right on time, immaculate V-Class and a calm, professional welcome.</p>
              <p className="mt-2 text-xs text-muted-foreground">— Cabslink passenger</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Airport Transfers</p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">Arrive relaxed.<br />Leave on time. Every time.</h2>
            <p className="mt-5 text-muted-foreground">
              From the moment you land, your Cabslink chauffeur is waiting — flight tracked, terminal known and luggage handled. No queues, no surge pricing, no surprises. Just a smooth ride to your door.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {["Meet & greet at arrivals", "Free 60-minute wait time", "Door-to-door service", "Fixed transparent fare", "Child seats on request", "24/7 live support"].map(item => (
                <li key={item} className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--gold)] shrink-0" />{item}</li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/airport-transfers">Explore airport transfers <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="Included as standard" title="Every Cabslink ride, by default" center />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="flex gap-4 rounded-2xl bg-card border border-border p-6 hover:border-[var(--gold)]/40 transition">
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
              <div key={f.name} className="rounded-2xl border border-border bg-card p-6 hover:border-[var(--gold)]/50 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] transition">
                <Car className="size-8 text-[var(--gold)]" />
                <h3 className="mt-4 font-display text-lg font-semibold leading-tight">{f.name}</h3>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-[var(--gold)]">{f.note}</p>
                <p className="mt-3 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="Loved by our passengers" title="Trusted by frequent flyers, executives & event teams" center />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map(t => (
              <figure key={t.name} className="rounded-2xl border border-border bg-card p-7 flex flex-col">
                <div className="flex items-center gap-1 text-[var(--gold)]">
                  {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <blockquote className="mt-4 text-sm md:text-base leading-relaxed text-foreground/90 flex-1">"{t.quote}"</blockquote>
                <figcaption className="mt-5 pt-5 border-t border-border">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CORPORATE + TOURS SPLIT */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-[var(--navy)] border border-white/10 text-white p-8 md:p-12 relative overflow-hidden">
            <Building2 className="size-10 text-[var(--gold)]" />
            <h3 className="mt-5 font-display text-3xl md:text-4xl">Corporate Travel, Effortless</h3>
            <p className="mt-4 text-white/75 max-w-md">
              Account-managed business travel for boards, executives and visiting clients. Punctual chauffeurs, monthly invoicing and full reporting.
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
                Discover Scotland and the UK with a private chauffeur and a tailored itinerary — Edinburgh, the Highlands, the Lake District, the Cotswolds and beyond.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {["Bespoke routes & multi-day trips", "Knowledgeable local drivers", "Hotel & restaurant arrangements", "Family & group-friendly vehicles"].map(i => <li key={i} className="flex gap-2"><ShieldCheck className="size-4 text-[var(--gold)] shrink-0 mt-0.5" />{i}</li>)}
              </ul>
              <Button asChild variant="outline" className="mt-8 rounded-full"><Link to="/tours">Browse tours <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* DRIVE WITH US */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 shadow-sm">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Drive With Us</p>
              <h3 className="font-display text-3xl md:text-4xl font-semibold leading-tight">Partner with Cabslink as a chauffeur or fleet operator</h3>
              <p className="mt-4 text-muted-foreground max-w-2xl">
                We work with professional drivers and licensed fleet partners across the UK. Join a respected brand, get steady premium work, and grow your business with us.
              </p>
            </div>
            <Button asChild variant="gold" size="lg" className="rounded-full"><Link to="/drive-with-us">Apply to drive <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="section-y">
        <div className="container-x grid md:grid-cols-3 gap-5">
          {[
            { icon: Phone, title: "Call us 24/7", lines: [SITE.phoneUK, SITE.phoneUS], href: `tel:${SITE.phoneUK.replace(/\s/g,"")}` },
            { icon: MapPin, title: "Visit our office", lines: [SITE.address], href: "/contact" },
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
