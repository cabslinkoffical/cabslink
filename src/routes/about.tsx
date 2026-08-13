import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, Award, Heart, Sparkles, Plane, Briefcase, Ship, GraduationCap,
  Hospital, Users, Building2, Bus, Car, Clock, MapPin, CreditCard,
  BadgeCheck, PhoneCall, Luggage, Baby, HandCoins, Route as RouteIcon,
  CheckCircle2, ArrowRight,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import edinburghImg from "@/assets/edinburgh.jpg";

const CANONICAL = "https://cabslink.com/about";

const FAQS = [
  { q: "Do you monitor flights?", a: "Yes. Every airport pickup is linked to your flight number and tracked in real time, so your driver adjusts automatically for early arrivals or delays at no extra cost." },
  { q: "Can I pre-book a journey?", a: "All Cabslink journeys are pre-booked. You can reserve online in under a minute, by phone, or via email — with instant confirmation and a fixed quoted price." },
  { q: "Can I book a return journey?", a: "Yes. Add a return leg during booking and we'll hold your driver, vehicle class and price for the inbound trip." },
  { q: "Do you provide child seats?", a: "Yes. Infant, child and booster seats are available on request. Please tell us the child's age and weight when booking so we can fit the correct seat." },
  { q: "Do you accept card payments?", a: "Yes. We accept all major cards, Apple Pay and Google Pay through our secure online checkout, plus invoiced billing for corporate accounts." },
  { q: "Can I book for a group?", a: "Yes. We operate MPVs, minibuses and coaches for groups of 6 to 50+, with luggage-capacity planning and multi-stop routing." },
  { q: "Do you provide executive vehicles?", a: "Yes. Our Executive and First Class classes include the Mercedes E-Class, S-Class and V-Class for corporate travel, VIP transfers and events." },
  { q: "Can I cancel my booking?", a: "Yes. Bookings can be modified or cancelled free of charge up to the window shown on your confirmation. See our booking policy for full details." },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Cabslink — Trusted UK Airport Transfers" },
      { name: "description", content: "Scotland-based airport transfer company: fixed prices, flight monitoring, executive vehicles and 24/7 service across Edinburgh, Glasgow and the UK." },
      { property: "og:title", content: "About Cabslink — Trusted UK Airport Transfers" },
      { property: "og:description", content: "Reliable pre-booked airport transfers, executive travel, cruise, corporate and group transport across Scotland — with fixed prices and flight monitoring." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
            { "@type": "ListItem", position: 2, name: "About", item: CANONICAL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://cabslink.com/#organization",
          name: "Cabslink",
          url: "https://cabslink.com",
          telephone: SITE.phoneUK,
          areaServed: [
            { "@type": "AdministrativeArea", name: "Scotland" },
            { "@type": "Country", name: "United Kingdom" },
          ],
          address: { "@type": "PostalAddress", addressRegion: "Scotland", addressCountry: "GB" },
          knowsAbout: [
            "Airport transfers", "Executive travel", "Corporate travel",
            "Cruise transfers", "University transfers", "Hospital transfers",
            "Group transport", "Event transport", "Distillery tours",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map(f => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About Cabslink"
        title="Airport transfers and private travel, done properly."
        subtitle="Cabslink provides reliable pre-booked airport transfers, executive drivers, corporate travel and private transport across Scotland — with punctuality, fixed pricing and professional service on every journey."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "About" }]}
      />

      {/* CTA row directly under hero */}
      <section className="border-b border-border">
        <div className="container-x py-6 flex flex-wrap items-center gap-3">
          <Button asChild variant="gold" className="rounded-full"><Link to="/book">Book Now</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link to="/distance">Get a Quote</Link></Button>
          <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--navy)] hover:text-[var(--gold-ink)]">
            <PhoneCall className="size-4" /> {SITE.phoneUK}
          </a>
        </div>
      </section>

      {/* Who we are */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={edinburghImg} alt="Edinburgh skyline — Cabslink's home city and operational base for Scottish airport transfers" width={1600} height={1024} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/3] shadow-[var(--shadow-elegant)]" />
          <div>
            <SectionHeader eyebrow="Who we are" title="A Scottish airport transfer company built on trust." subtitle="Cabslink is a Scotland-based private hire operator specialising in airport transfers, executive travel and group transport. From our Edinburgh base we cover every major UK airport, cruise port, station, hotel, university, hospital and business hub." />
            <p className="mt-6 text-muted-foreground">
              We serve business travellers, families, students, cruise passengers, corporate accounts,
              hotels and travel agencies — with the same standard applied to every journey: a vetted
              driver, a clean modern vehicle, a fixed quoted price and a real person on the phone when
              you need one.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Airport transfers", "Corporate travel", "Executive driver",
                "Cruise transfers", "Student transfers", "Hotel transfers", "Group transport",
              ].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
                  <CheckCircle2 className="size-3.5 text-[var(--gold-ink)]" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold-ink)] mb-3">Our mission</p>
            <p className="font-display text-2xl md:text-4xl leading-snug text-[var(--navy)]">
              To make airport travel simple, comfortable and stress-free — through reliable private
              transport, transparent fixed pricing and exceptional customer service on every journey.
            </p>
          </div>
        </div>
      </section>

      {/* Why choose Cabslink */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Why choose Cabslink" title="A better standard for private transport." center />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: HandCoins, t: "Fixed Prices", d: "Quoted upfront. No meter, no surge, no surprises." },
              { icon: Plane, t: "Flight Monitoring", d: "Live tracking of every airport pickup." },
              { icon: BadgeCheck, t: "Meet & Greet", d: "Named greeting inside the terminal on request." },
              { icon: Users, t: "Professional Drivers", d: "Vetted, licensed and briefed on your journey." },
              { icon: Clock, t: "24/7 Availability", d: "Round-the-clock bookings and support." },
              { icon: RouteIcon, t: "Online Booking", d: "Instant quotes and confirmation in under a minute." },
              { icon: Car, t: "Executive Vehicles", d: "Mercedes E-Class, S-Class and V-Class fleet." },
              { icon: Baby, t: "Family-Friendly", d: "Infant, child and booster seats on request." },
              { icon: Briefcase, t: "Corporate Accounts", d: "Monthly invoicing, cost centres and priority support." },
              { icon: Sparkles, t: "Clean Vehicles", d: "Immaculately maintained and regularly valeted." },
              { icon: CreditCard, t: "Secure Payments", d: "Card, Apple Pay and Google Pay — encrypted checkout." },
              { icon: Luggage, t: "Luggage Assistance", d: "Every driver helps with cases, kit and pushchairs." },
            ].map(f => (
              <div key={f.t} className="rounded-2xl bg-card border border-border p-6">
                <div className="grid size-11 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><f.icon className="size-5" /></div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="What we offer" title="Services across Scotland and the UK." center />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/airport-transfers", icon: Plane, t: "Airport Transfers" },
              { to: "/services", icon: Award, t: "Executive Driver" },
              { to: "/corporate-travel", icon: Briefcase, t: "Corporate Travel" },
              { to: "/cruise-ports", icon: Ship, t: "Cruise Transfers" },
              { to: "/universities", icon: GraduationCap, t: "University Transfers" },
              { to: "/hospitals", icon: Hospital, t: "Hospital Transfers" },
              { to: "/tours", icon: MapPin, t: "Golf & Distillery Tours" },
              { to: "/fleet", icon: Bus, t: "Minibus Hire" },
              { to: "/fleet", icon: Bus, t: "Coach Hire" },
              { to: "/services", icon: RouteIcon, t: "Long Distance Transfers" },
              { to: "/tours", icon: MapPin, t: "Distillery Tours" },
            ].map(s => (
              <Link key={s.t} to={s.to} className="group rounded-2xl bg-card border border-border p-5 hover:border-[var(--gold)]/60 hover:shadow-[var(--shadow-elegant)] transition-all">
                <s.icon className="size-6 text-[var(--gold-ink)]" />
                <p className="mt-4 font-display text-base font-semibold group-hover:text-[var(--gold-ink)]">{s.t}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">Learn more <ArrowRight className="size-3" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Ready when you are"
        title="Book a Cabslink driver today"
        subtitle="Fixed fares, vetted drivers and 24/7 UK reservations support."
        tone="navy"
      />

      {/* Coverage */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Our coverage" title="Scotland-wide, UK-ready." subtitle="From our Edinburgh base we cover every major city, airport, station and cruise port in Scotland — with long-distance transfers into England and Wales on request." center />
          <div className="mt-10 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {/* Every entry below points at a page that exists — city pages live at
                /areas/:slug, wider areas at /areas/region/:slug. */}
            {([
              { label: "Edinburgh", to: "/areas/$slug", params: { slug: "edinburgh" } },
              { label: "Glasgow", to: "/areas/$slug", params: { slug: "glasgow" } },
              { label: "Livingston", to: "/areas/$slug", params: { slug: "livingston" } },
              { label: "Stirling", to: "/areas/$slug", params: { slug: "stirling" } },
              { label: "Dundee", to: "/areas/$slug", params: { slug: "dundee" } },
              { label: "Perth", to: "/areas/$slug", params: { slug: "perth" } },
              { label: "St Andrews", to: "/areas/$slug", params: { slug: "st-andrews" } },
              { label: "Falkirk", to: "/areas/$slug", params: { slug: "falkirk" } },
              { label: "Aberdeen", to: "/areas/$slug", params: { slug: "aberdeen" } },
              { label: "Fife", to: "/areas/region/$slug", params: { slug: "fife" } },
            ] as const).map((area) => (
              <Link key={area.label} to={area.to} params={area.params} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-[var(--navy)] hover:border-[var(--gold)]/60 hover:text-[var(--gold-ink)] transition-colors">
                <MapPin className="inline size-3.5 mr-1.5 text-[var(--gold-ink)]" />{area.label}
              </Link>
            ))}

          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="rounded-full"><Link to="/areas">Explore all locations <ArrowRight className="ml-1.5 size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="Our fleet" title="The right vehicle for every journey." subtitle="From saloons for solo business travel to coaches for corporate events, every vehicle class in our fleet is priced clearly and quoted upfront." center />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Standard Saloon", pax: "1–3 passengers · 2 cases", use: "Everyday transfers" },
              { t: "Estate", pax: "1–3 passengers · 3 cases", use: "Extra luggage & golf" },
              { t: "Executive (Mercedes E-Class)", pax: "1–3 passengers · 2 cases", use: "Business travel" },
              { t: "First Class (Mercedes S-Class)", pax: "1–3 passengers · 2 cases", use: "VIP & events" },
              { t: "MPV (Mercedes V-Class)", pax: "1–6 passengers · 6 cases", use: "Families & small groups" },
              { t: "Minibus", pax: "8–16 passengers", use: "Group transport" },
              { t: "Coaster", pax: "16–24 passengers", use: "Corporate groups" },
              { t: "Coach", pax: "24–50 passengers", use: "Events & tours" },
              { t: "Long-Distance Executive", pax: "Cross-country", use: "City-to-city travel" },
            ].map(v => (
              <div key={v.t} className="rounded-2xl bg-card border border-border p-6">
                <Car className="size-6 text-[var(--gold-ink)]" />
                <h3 className="mt-4 font-display text-lg font-semibold">{v.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.pax}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--gold-ink)]">{v.use}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="gold" className="rounded-full"><Link to="/fleet">View the full fleet</Link></Button>
          </div>
        </div>
      </section>

      {/* Customers */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Who we serve" title="Trusted by travellers, families and businesses." center />
          <div className="mt-10 grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { icon: Briefcase, t: "Business travellers" },
              { icon: Plane, t: "Tourists" },
              { icon: Users, t: "Families" },
              { icon: GraduationCap, t: "Students" },
              { icon: Building2, t: "University visitors" },
              { icon: Hospital, t: "Hospital visitors" },
              { icon: MapPin, t: "Golf travellers" },
              { icon: Ship, t: "Cruise passengers" },
              { icon: Briefcase, t: "Corporate clients" },
              { icon: Building2, t: "Hotels" },
              { icon: Award, t: "Travel agencies" },
              { icon: Users, t: "Event organisers" },
            ].map(c => (
              <div key={c.t} className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold-ink)]"><c.icon className="size-4" /></div>
                <span className="text-sm font-medium">{c.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking process */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="Your booking, step by step." center />
          <ol className="mt-12 grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            {[
              "Choose journey", "Receive quote", "Confirm booking",
              "Driver assigned", "Flight monitored", "Meet & greet pickup", "Safe arrival",
            ].map((step, i) => (
              <li key={step} className="relative rounded-2xl bg-card border border-border p-5 text-center">
                <div className="mx-auto grid size-10 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold-ink)] font-display font-semibold">{i + 1}</div>
                <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Safety & values */}
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-10">
          <div>
            <SectionHeader eyebrow="Safety & reliability" title="Peace of mind on every journey." subtitle="Every Cabslink journey is delivered by a licensed driver in a professionally maintained vehicle, with the operational discipline our corporate clients expect." />
            <ul className="mt-6 space-y-3">
              {[
                "Licensed private hire drivers",
                "Professionally maintained, regularly inspected vehicles",
                "Clean, valeted interiors on every job",
                "Live flight monitoring on all airport pickups",
                "Meet & greet service on request",
                "GPS-tracked journeys with ETA updates",
                "24/7 customer support by phone and email",
                "Secure encrypted online payments",
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <Shield className="size-5 text-[var(--gold-ink)] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow="Our values" title="What every journey stands for." />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Clock, t: "Punctuality" },
                { icon: Shield, t: "Reliability" },
                { icon: BadgeCheck, t: "Safety" },
                { icon: Award, t: "Professionalism" },
                { icon: Sparkles, t: "Comfort" },
                { icon: HandCoins, t: "Transparency" },
                { icon: Heart, t: "Customer first" },
                { icon: CheckCircle2, t: "Accountability" },
              ].map(v => (
                <div key={v.t} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold-ink)]"><v.icon className="size-4" /></div>
                  <span className="text-sm font-semibold">{v.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="Trust signals" title="Why customers keep coming back." center />
          <div className="mt-10 grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              "Licensed private hire service",
              "Secure online booking",
              "Vetted professional drivers",
              "Real-time flight monitoring",
              "Fixed transparent pricing",
              "Meet & greet service",
              "Scotland-wide coverage",
              "24/7 customer support",
            ].map(t => (
              <div key={t} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                <BadgeCheck className="size-5 text-[var(--gold-ink)] shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-y">
        <div className="container-x max-w-4xl">
          <SectionHeader eyebrow="FAQ" title="Frequently asked questions." center />
          <div className="mt-10 space-y-3">
            {FAQS.map(f => (
              <details key={f.q} className="group rounded-2xl border border-border bg-card p-5 open:shadow-[var(--shadow-elegant)]">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-display text-base md:text-lg font-semibold text-[var(--navy)]">{f.q}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-ink)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-y bg-[var(--navy)] text-white">
        <div className="container-x text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold-ink)] mb-4">Ready to travel</p>
          <h2 className="font-display text-3xl md:text-5xl font-semibold">Ready to book your journey?</h2>
          <p className="mt-4 max-w-2xl mx-auto text-white/75">Get an instant fixed-price quote in under a minute — or speak to a real person 24/7.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="gold" className="rounded-full"><Link to="/book">Book Airport Transfer</Link></Button>
            <Button asChild variant="outline" className="rounded-full bg-transparent border-white/30 text-white hover:bg-white hover:text-[var(--navy)]"><Link to="/distance">Get Instant Quote</Link></Button>
            <Button asChild variant="outline" className="rounded-full bg-transparent border-white/30 text-white hover:bg-white hover:text-[var(--navy)]"><Link to="/contact">Contact Us</Link></Button>
          </div>
        </div>
      </section>

      {/* Internal linking hub */}
      <section className="section-y">
        <div className="container-x grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Popular services</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { to: "/airport-transfers", t: "Airport Transfers" },
                { to: "/services", t: "Executive Driver Service" },
                { to: "/corporate-travel", t: "Corporate Transfers" },
                { to: "/cruise-ports", t: "Cruise Transfers" },
                { to: "/universities", t: "University Transfers" },
              ].map(l => (
                <li key={l.t}><Link to={l.to} className="text-muted-foreground hover:text-[var(--gold-ink)]">{l.t} →</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Popular locations</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["Edinburgh","Glasgow","Livingston","St Andrews","Perth"].map(city => (
                <li key={city}>
                  <Link to="/areas/$slug" params={{ slug: city.toLowerCase().replace(/\s+/g, "-") }} className="text-muted-foreground hover:text-[var(--gold-ink)]">{city} Transfers →</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--navy)]">Useful guides</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { to: "/guides", t: "Edinburgh Airport Pickup Guide" },
                { to: "/guides", t: "Airport Transfer FAQs" },
                { to: "/guides", t: "Travel Tips & Advice" },
                { to: "/tours", t: "Scotland Private Tours" },
                { to: "/fleet", t: "Choosing the Right Vehicle" },
              ].map(l => (
                <li key={l.t}><Link to={l.to} className="text-muted-foreground hover:text-[var(--gold-ink)]">{l.t} →</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
