import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Plane, ShieldCheck, Clock3, Star, CalendarCheck, Phone, MapPin,
  Briefcase, Users, Award, BadgePoundSterling, Headset, Car, Building2, GraduationCap, Gem,
  Route as RouteIcon, CheckCircle2, Sparkles, MessageSquare, CreditCard, Quote,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BookingWidget } from "@/components/site/BookingWidget";
import { SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

import heroImg from "@/assets/hero.jpg";
import vClassSideImg from "@/assets/v-class-side.png";
import chauffeurImg from "@/assets/chauffeur.jpg";
import edinburghImg from "@/assets/edinburgh.jpg";
import vClassInteriorImg from "@/assets/v-class-interior.jpg";
import airportImg from "@/assets/airport.jpg";
import corporateImg from "@/assets/corporate.jpg";
import fleetSuvImg from "@/assets/fleet-suv.jpg";

import sclassAsset from "@/assets/fleet/sclass.png.asset.json";
import eclassAsset from "@/assets/fleet/eclass.png.asset.json";
import vclassAsset from "@/assets/fleet/vclass.png.asset.json";
import rangeroverAsset from "@/assets/fleet/rangerover.png.asset.json";
import minibusAsset from "@/assets/fleet/minibus.png.asset.json";
import rollsAsset from "@/assets/fleet/rolls.png.asset.json";
import coachAsset from "@/assets/fleet/coach.png.asset.json";
import coasterAsset from "@/assets/fleet/coaster.png.asset.json";

const fallbackHeroVehicles = [
  { key: "vclass", name: "Mercedes V-Class", tag: "First-class · 7 seats", img: vclassAsset.url, seats: 7 },
  { key: "sclass", name: "Mercedes S-Class", tag: "Flagship saloon · 3 seats", img: sclassAsset.url, seats: 3 },
  { key: "eclass", name: "Mercedes E-Class", tag: "Executive · 3 seats", img: eclassAsset.url, seats: 3 },
  { key: "rangerover", name: "Range Rover", tag: "Luxury SUV · 4 seats", img: rangeroverAsset.url, seats: 4 },
  { key: "rolls", name: "Rolls-Royce Bentley", tag: "Ultra-luxury · 3 seats", img: rollsAsset.url, seats: 3 },
  { key: "minibus", name: "Executive Minibus", tag: "Groups · 16 seats", img: minibusAsset.url, seats: 16 },
  { key: "coaster", name: "Coaster Bus", tag: "Mid-group · 24 seats", img: coasterAsset.url, seats: 24 },
  { key: "coach", name: "Coach Bus", tag: "Large group · 55 seats", img: coachAsset.url, seats: 55 },
];

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
  { name: "Mercedes-Benz S-Class", note: "Signature", img: sclassAsset.url, passengers: 3, luggage: 3, transmission: "Automatic", fuel: "Petrol" },
  { name: "Mercedes-Benz E-Class", note: "Executive", img: eclassAsset.url, passengers: 3, luggage: 3, transmission: "Automatic", fuel: "Diesel" },
  { name: "Mercedes-Benz V-Class", note: "First class", img: vclassAsset.url, passengers: 7, luggage: 7, transmission: "Automatic", fuel: "Diesel" },
  { name: "Range Rover Autobiography", note: "Premium SUV", img: rangeroverAsset.url, passengers: 4, luggage: 4, transmission: "Automatic", fuel: "Petrol" },
  { name: "Executive Minibus", note: "Groups", img: minibusAsset.url, passengers: 16, luggage: 16, transmission: "Automatic", fuel: "Diesel" },
];

const testimonials = [
  { name: "Sarah M.", role: "Frequent flyer · Edinburgh", quote: "Driver was waiting at arrivals with a name board. Immaculate V-Class, calm and professional. Best transfer service I've used in the UK." },
  { name: "James R.", role: "Operations Director", quote: "We moved our entire executive travel to Cabslink. Reliable, on-time, polished — and the monthly invoicing is a relief." },
  { name: "Priya K.", role: "Wedding planner", quote: "They handled five vehicles across two venues without a hitch. Pure professionalism from start to finish." },
];

function HomePage() {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [dbVehicles, setDbVehicles] = useState<typeof fallbackHeroVehicles | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("vehicles")
      .select("id, name, category, image_url, passengers")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const mapped = data
          .filter((v: any) => v.image_url)
          .map((v: any) => ({
            key: v.id as string,
            name: v.name as string,
            tag: `${v.category ?? "Vehicle"} · ${v.passengers ?? 0} seats`,
            img: v.image_url as string,
            seats: v.passengers ?? 0,
          }));
        if (mapped.length > 0) setDbVehicles(mapped);
      });
    return () => { cancelled = true; };
  }, []);

  const heroVehicles = useMemo(() => dbVehicles ?? fallbackHeroVehicles, [dbVehicles]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setDir(1);
      setActive((i) => (i + 1) % heroVehicles.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, heroVehicles.length]);

  useEffect(() => {
    if (active >= heroVehicles.length) setActive(0);
  }, [heroVehicles.length, active]);

  const go = (next: number) => {
    setDir(next > active || (active === heroVehicles.length - 1 && next === 0) ? 1 : -1);
    setActive((next + heroVehicles.length) % heroVehicles.length);
  };

  const current = heroVehicles[active] ?? heroVehicles[0];

  return (
    <SiteLayout>
      {/* HERO — unified: copy + vehicle + booking widget */}
      <section className="relative overflow-hidden bg-[var(--background)]">
        {/* Ambient tints */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_60%)]" />
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-[520px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_70%)] blur-3xl opacity-60" />
        <div aria-hidden className="pointer-events-none absolute top-1/3 -right-32 size-[560px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--navy)_12%,transparent),transparent_70%)] blur-3xl opacity-50" />
        {/* Faint grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in oklab, var(--navy) 60%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--navy) 60%, transparent) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="container-x relative pt-14 md:pt-20 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* LEFT — copy */}
            <div className="lg:col-span-6 relative z-10 min-w-0 w-full">

              <div
                className="inline-flex items-center gap-3 rounded-full border border-[var(--gold)]/40 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-4 py-1.5 opacity-0"
                style={{ animation: "fadeInUp 700ms cubic-bezier(.2,.7,.2,1) 100ms forwards" }}
              >
                <Sparkles className="size-3.5 text-[var(--gold)]" />
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--navy)]">
                  UK's Trusted Chauffeur Company
                </span>
              </div>

              <h1
                className="mt-5 font-display font-bold text-[var(--navy)] leading-[0.95] tracking-[-0.03em] text-[2rem] sm:text-5xl lg:text-[5.25rem] opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 200ms forwards" }}
              >
                Arrive in{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, #f0c548 0%, #dfaf26 55%, #b38a1d 100%)",
                  }}
                >
                  quiet luxury.
                </span>
              </h1>

              <p
                className="mt-5 max-w-xl text-sm md:text-lg text-muted-foreground opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 380ms forwards" }}
              >
                Fixed-fare Mercedes-Benz chauffeur transfers across the UK. Flight tracked, meet &amp; greet, 24/7 live dispatch — the calm way to travel.
              </p>

              {/* Trust row */}
              <div
                className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 500ms forwards" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    {["S","J","P","M"].map((c, idx) => (
                      <span
                        key={idx}
                        className="grid size-7 place-items-center rounded-full border-2 border-[var(--background)] bg-[var(--navy)] text-[10px] font-semibold text-[var(--gold)]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[var(--navy)] min-w-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="size-3 fill-[var(--gold)] text-[var(--gold)]" />
                      ))}
                    </div>
                    <div className="text-muted-foreground text-[11px] truncate">2,400+ five-star rides</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-[var(--navy)]/10 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--navy)]">
                  <ShieldCheck className="size-4 text-[var(--gold)] shrink-0" />
                  <span className="font-medium">Licensed &amp; insured</span>
                </div>
              </div>

              {/* Stats strip */}
              <div
                className="mt-8 grid grid-cols-3 gap-2 w-full max-w-lg opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 620ms forwards" }}
              >
                {[
                  { k: "50k+", v: "Journeys" },
                  { k: "24/7", v: "Dispatch" },
                  { k: "4.9★", v: "Rated" },
                ].map((s, i, arr) => (
                  <div key={s.k} className={`min-w-0 px-2 sm:px-4 first:pl-0 ${i < arr.length - 1 ? "border-r border-[var(--navy)]/10" : ""}`}>
                    <div className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[var(--navy)]">{s.k}</div>
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-muted-foreground mt-1 truncate">{s.v}</div>
                  </div>
                ))}
              </div>

            </div>

            {/* RIGHT — vehicle carousel */}
            <div className="lg:col-span-6 relative">
              <div
                className="relative opacity-0"
                style={{ animation: "fadeInUp 900ms cubic-bezier(.2,.7,.2,1) 300ms forwards" }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                {/* Backdrop CABSLINK watermark */}
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
                  <span
                    className="font-display font-bold leading-none tracking-[-0.06em] text-[16vw] lg:text-[13vw]"
                    style={{
                      color: "transparent",
                      WebkitTextStroke: "1px color-mix(in oklab, var(--navy) 10%, transparent)",
                      backgroundImage:
                        "linear-gradient(180deg, color-mix(in oklab, var(--gold) 18%, transparent), transparent 80%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                  >
                    CABSLINK
                  </span>
                </div>

                {/* Gold halo */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[110%] rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at center, color-mix(in oklab, var(--gold) 30%, transparent) 0%, transparent 55%)",
                    filter: "blur(30px)",
                  }}
                />

                {/* Ground shadow */}
                <div aria-hidden className="absolute inset-x-8 bottom-2 h-8 rounded-[50%] bg-black/30 blur-2xl" />

                {/* Sliding vehicle stage */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    key={current.key}
                    src={current.img}
                    alt={`${current.name} — chauffeur vehicle`}
                    width={1920}
                    height={1024}
                    className="absolute inset-0 m-auto w-[92%] h-full object-contain drop-shadow-[0_35px_45px_rgba(14,24,44,0.28)]"
                    style={{
                      animation: `${dir === 1 ? "vehicleSlideInR" : "vehicleSlideInL"} 850ms cubic-bezier(.2,.7,.2,1) both`,
                    }}
                  />
                </div>


                {/* Floating live chip */}
                <div className="hidden md:flex absolute bottom-10 left-0 lg:left-4 items-center gap-3 rounded-2xl border border-[var(--navy)]/10 bg-[var(--background)]/85 backdrop-blur-md px-4 py-3 shadow-[var(--shadow-elegant)]">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--navy)]">Live dispatch</div>
                    <div className="text-muted-foreground">Chauffeur available now</div>
                  </div>
                </div>
              </div>

              {/* Vehicle selector strip */}
              <div className="mt-6 relative">
                <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {heroVehicles.map((v, i) => {
                    const isActive = i === active;
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => go(i)}
                        className={`group shrink-0 flex items-center gap-3 rounded-2xl border px-3 py-2 transition-all ${
                          isActive
                            ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_12%,var(--background))] shadow-[var(--shadow-elegant)]"
                            : "border-[var(--navy)]/10 bg-[var(--background)]/70 hover:border-[var(--gold)]/50 hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="w-14 h-9 shrink-0 grid place-items-center overflow-hidden">
                          <img src={v.img} alt="" loading="lazy" className="max-h-full w-auto object-contain" />
                        </div>
                        <div className="text-left pr-1">
                          <div className={`text-[11px] font-semibold leading-tight ${isActive ? "text-[var(--navy)]" : "text-[var(--navy)]/80"}`}>
                            {v.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-tight">{v.seats} seats</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING WIDGET — flows straight out of hero */}
      <section id="booking" className="relative z-20 scroll-mt-24 bg-[var(--background)]">
        <div className="container-x pt-2 md:pt-4 pb-4">
          <BookingWidget />
        </div>
      </section>



      {/* HOW IT WORKS */}
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="Three Steps To A Premium" titleAccent="Ride" subtitle="From quote to chauffeur at your door — built to feel effortless." center />
          <div className="mt-14 relative grid gap-6 md:grid-cols-3">
            {/* Connector line */}
            <div aria-hidden className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120} className="relative rounded-2xl border border-border bg-card p-8 hover:border-[var(--gold)]/50 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
                <span className="absolute top-5 right-6 font-display text-6xl font-bold text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--gold)_35%,transparent)]">0{i + 1}</span>
                <div className="relative grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--gold)]/25 to-[var(--gold)]/5 text-[var(--gold)] border border-[var(--gold)]/20">
                  <s.icon className="size-6" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES — luxury image cards */}
      <section className="section-y bg-[var(--surface)] relative overflow-hidden">
        <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-px bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[900px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)] blur-3xl opacity-60" />

        <div className="container-x relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <SectionHeader eyebrow="Our Services" title="A Complete Chauffeur" titleAccent="Service" subtitle="From airport pickups to multi-day private tours — one trusted standard, every journey." />
            <Button asChild variant="outline" className="rounded-full self-start hidden md:inline-flex border-[var(--navy)]/15 bg-card hover:border-[var(--gold)] hover:bg-[var(--gold)]/8 hover:text-[var(--navy)] transition-all duration-300 group">
              <Link to="/services">All services <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></Link>
            </Button>
          </div>

          {/* MOBILE — app-style stacked list */}
          <ul className="mt-10 flex flex-col gap-3 sm:hidden">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={(i % 3) * 60}>
                <Link
                  to={s.to}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 pr-4 active:scale-[0.98] hover:border-[var(--gold)]/40 transition-all duration-300"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    <img src={s.img} alt={s.title} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 grid size-7 place-items-center rounded-lg bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]">
                      <s.icon className="size-3.5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-semibold truncate">{s.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-snug">{s.desc}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-[var(--gold)] group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </Reveal>
            ))}
            <Link to="/services" className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--gold)]/40 bg-transparent px-5 py-3 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--gold)]/8 transition-colors duration-300">
              View all services <ArrowRight className="size-4" />
            </Link>
          </ul>

          {/* TABLET/DESKTOP — luxury image cards */}
          <div className="mt-14 hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={(i % 3) * 100} className="h-full">
                <Link
                  to={s.to}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card aspect-[4/5] flex flex-col justify-end hover:border-[var(--gold)]/60 hover:-translate-y-2 hover:shadow-[var(--shadow-elegant)] transition-all duration-500 block h-full"
                >
                  <img
                    src={s.img}
                    alt={s.title}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/95 via-[var(--navy)]/55 to-[var(--navy)]/10 transition-all duration-500 group-hover:from-[var(--navy)]/95 group-hover:via-[var(--navy)]/40" />
                  <div aria-hidden className="absolute top-0 right-0 size-40 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--gold)_55%,transparent),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div aria-hidden className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--gold)_50%,transparent)]" />
                  <div className="absolute top-5 left-5 grid size-11 place-items-center rounded-xl bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <s.icon className="size-5" />
                  </div>
                  <div className="relative p-6 text-white">
                    <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-white/80 leading-relaxed">{s.desc}</p>
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold)] group-hover:gap-3 transition-all duration-300">
                      Learn more <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* AIRPORT COPY */}
      <section className="section-y">
        <div className="container-x grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative">
            {/* Decorative frame */}
            <div aria-hidden className="absolute -top-4 -left-4 size-24 border-t-2 border-l-2 border-[var(--gold)] rounded-tl-3xl" />
            <div aria-hidden className="absolute -bottom-4 -right-4 size-24 border-b-2 border-r-2 border-[var(--gold)] rounded-br-3xl" />
            <img src={chauffeurImg} alt="Cabslink chauffeur opening rear door of Mercedes V-Class" width={1280} height={1600} loading="lazy" className="relative rounded-3xl object-cover w-full aspect-[4/5] shadow-[var(--shadow-elegant)]" />
            <div className="absolute -bottom-6 right-4 sm:right-6 glass-card rounded-2xl p-5 max-w-[280px] border border-[var(--gold)]/20">
              <Quote className="size-6 text-[var(--gold)] mb-2" />
              <div className="flex items-center gap-1 text-[var(--gold)]">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed">Driver arrived right on time, immaculate V-Class and a calm, professional welcome.</p>
              <p className="mt-2 text-xs text-muted-foreground">— Cabslink passenger</p>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-[var(--gold)]" aria-hidden />
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] font-semibold">Airport Transfers</p>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-[1.1]">Arrive relaxed.<br /><span className="text-[var(--gold)]">Leave on time.</span> Every time.</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              From the moment you land, your Cabslink chauffeur is waiting — flight tracked, terminal known and luggage handled. No queues, no surge pricing, no surprises. Just a smooth ride to your door.
            </p>
            <ul className="mt-7 grid sm:grid-cols-2 gap-3 text-sm">
              {["Meet & greet at arrivals", "Free 60-minute wait time", "Door-to-door service", "Fixed transparent fare", "Child seats on request", "24/7 live support"].map(item => (
                <li key={item} className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-[var(--surface)]/60 border border-border/60"><ShieldCheck className="size-4 text-[var(--gold)] shrink-0" />{item}</li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/airport-transfers">Explore airport transfers <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="section-y bg-[var(--surface)] relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,var(--navy)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="container-x relative">
          <SectionHeader eyebrow="Included as standard" title="Every Cabslink Ride, By" titleAccent="Default" center />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100} className="group relative flex gap-4 rounded-2xl bg-card border border-border p-6 hover:border-[var(--gold)]/50 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300 overflow-hidden">
                <div aria-hidden className="absolute -right-8 -top-8 size-24 rounded-full bg-[var(--gold)]/0 group-hover:bg-[var(--gold)]/10 blur-2xl transition-all duration-500" />
                <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/5 text-[var(--gold)] border border-[var(--gold)]/15 group-hover:scale-110 transition-transform duration-300"><f.icon className="size-5" /></div>
                <div className="min-w-0 relative">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET — mobile-first snap carousel, desktop grid */}
      <section className="section-y overflow-hidden">
        <div className="container-x">
          <SectionHeader
            eyebrow="Our Fleet"
            title="Our Premium"
            titleAccent="Fleet"
            subtitle="Explore our modern, chauffeur-driven fleet available across the UK."
            center
          />

          {/* Mobile: horizontal snap cards */}
          <div className="mt-8 -mx-5 sm:hidden">
            <div className="flex gap-4 overflow-x-auto px-5 pb-6 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {fleet.map((f, i) => (
                <Reveal
                  key={f.name}
                  delay={i * 80}
                  className="group relative shrink-0 w-[78vw] max-w-[320px] snap-start rounded-3xl border border-border bg-card p-4 active:scale-[0.98] transition-transform"
                >
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/12 border border-[var(--gold)]/30 text-[var(--gold)] text-[9px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5">
                    <Gem className="size-2.5" /> {f.note}
                  </span>
                  <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface)]">
                    <img
                      src={f.img}
                      alt={f.name}
                      loading="lazy"
                      width={1200}
                      height={750}
                      className="max-h-[92%] w-auto object-contain"
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display text-base font-semibold leading-tight">{f.name}</h3>
                    <div className="mt-2.5 flex flex-wrap gap-y-2 gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-[var(--gold)]" />
                        {f.passengers}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3.5 text-[var(--gold)]" />
                        {f.luggage}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Car className="size-3.5 text-[var(--gold)]" />
                        {f.transmission}
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Desktop: reference-style image cards */}
          <div className="mt-12 hidden sm:grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.slice(0, 3).map((f, i) => (
              <Reveal
                key={f.name}
                delay={i * 100}
                className="group relative rounded-3xl border border-border bg-card p-6 hover:border-[var(--gold)]/60 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300"
              >
                <span className="absolute top-5 right-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/12 border border-[var(--gold)]/30 text-[var(--gold)] text-[10px] font-semibold uppercase tracking-[0.16em] px-3 py-1">
                  <Gem className="size-3" /> {f.note}
                </span>
                <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.name}
                    loading="lazy"
                    width={1200}
                    height={750}
                    className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="mt-4 pt-5 border-t border-border">
                  <h3 className="font-display text-xl font-semibold">{f.name}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4 text-[var(--gold)]" />
                      <span>Passengers <span className="text-foreground font-medium">{f.passengers}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="size-4 text-[var(--gold)]" />
                      <span>Luggage <span className="text-foreground font-medium">{f.luggage}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="size-4 text-[var(--gold)]" />
                      <span className="truncate">{f.transmission}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="size-4 text-[var(--gold)]" />
                      <span>{f.fuel}</span>
                    </div>
                  </dl>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 sm:mt-10 flex justify-center">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/fleet">View full fleet <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — centered single-focus (reference-style) */}
      <section className="section-y bg-[var(--background)] relative overflow-hidden">
        <div className="container-x relative">
          <SectionHeader
            eyebrow="Testimonials"
            title="What Our Clients"
            titleAccent="Say"
            subtitle="Delivering comfort, safety and elegance to every journey."
            center
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal
                key={t.name}
                delay={i * 120}
                as="figure"
                className="relative rounded-3xl border border-border bg-card p-8 pt-14 text-center flex flex-col items-center hover:border-[var(--gold)]/50 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300"
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 grid size-12 place-items-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)]">
                  <Quote className="size-5" />
                </span>
                <div className="flex items-center gap-1 text-[var(--gold)]">
                  {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <blockquote className="mt-5 text-sm md:text-base leading-relaxed text-foreground/85 flex-1">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 pt-5 border-t border-border w-full">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-display font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <p className="mt-3 font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CORPORATE + TOURS SPLIT */}
      <section className="section-y">
        <div className="container-x grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="group rounded-3xl bg-[var(--navy)] border border-white/10 text-white p-8 md:p-12 relative overflow-hidden hover:border-[var(--gold)]/30 transition-colors">
            <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--gold)_30%,transparent),transparent_70%)] blur-3xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)]">
                <Building2 className="size-6" />
              </div>
              <h3 className="mt-6 font-display text-3xl md:text-4xl leading-tight">Corporate Travel, <span className="text-[var(--gold)]">Effortless</span></h3>
              <p className="mt-4 text-white/75 max-w-md leading-relaxed">
                Account-managed business travel for boards, executives and visiting clients. Punctual chauffeurs, monthly invoicing and full reporting.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-white/85">
                {["Dedicated account manager", "Consolidated monthly invoicing", "Priority 24/7 booking line", "Discreet, vetted chauffeurs"].map(i => <li key={i} className="flex gap-2"><ShieldCheck className="size-4 text-[var(--gold)] shrink-0 mt-0.5" />{i}</li>)}
              </ul>
              <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/corporate-booking">Open corporate account <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>
          <div className="group rounded-3xl bg-card border border-border p-8 md:p-12 relative overflow-hidden hover:border-[var(--gold)]/40 transition-colors">
            <img src={edinburghImg} alt="Edinburgh skyline" width={1600} height={1024} loading="lazy" className="absolute inset-0 size-full object-cover opacity-15 group-hover:opacity-25 group-hover:scale-105 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-br from-card/60 via-card/40 to-transparent" />
            <div className="relative">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)]">
                <GraduationCap className="size-6" />
              </div>
              <h3 className="mt-6 font-display text-3xl md:text-4xl leading-tight">Private Tours <span className="text-[var(--gold)]">& Trips</span></h3>
              <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
                Discover Scotland and the UK with a private chauffeur and a tailored itinerary — Edinburgh, the Highlands, the Lake District, the Cotswolds and beyond.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
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
          <div className="relative rounded-3xl border border-border bg-card p-8 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 shadow-sm overflow-hidden">
            <div aria-hidden className="absolute -left-24 -bottom-24 size-72 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--gold)_25%,transparent),transparent_70%)] blur-3xl" />
            <div aria-hidden className="absolute top-0 left-0 h-1 w-24 bg-[var(--gold)] rounded-br-2xl" />
            <div className="flex-1 relative">
              <div className="inline-flex items-center gap-3 mb-3">
                <span className="h-px w-8 bg-[var(--gold)]" aria-hidden />
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] font-semibold">Drive With Us</p>
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-semibold leading-tight">Partner with Cabslink as a chauffeur or fleet operator</h3>
              <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
                We work with professional drivers and licensed fleet partners across the UK. Join a respected brand, get steady premium work, and grow your business with us.
              </p>
            </div>
            <Button asChild variant="gold" size="lg" className="rounded-full relative"><Link to="/drive-with-us">Apply to drive <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* FINAL CTA — reference-style soft block */}
      <section className="section-y">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/25 bg-[color-mix(in_oklab,var(--gold)_10%,var(--background))] p-10 md:p-16">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-[420px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--gold)_28%,transparent),transparent_70%)] blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 size-[320px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--navy)_10%,transparent),transparent_70%)] blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 bg-[var(--gold)]" aria-hidden />
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--gold)] font-semibold">Ready when you are</p>
                </div>
                <h3 className="font-display text-3xl md:text-5xl font-semibold leading-[1.05] text-[var(--navy)]">
                  Your Ride,{" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(180deg, #f0c548 0%, #dfaf26 55%, #b38a1d 100%)" }}
                  >
                    One Tap Away.
                  </span>
                </h3>
                <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
                  Book, track and enjoy a seamless chauffeur experience across the UK. Available 24/7 — no surge, no surprises.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button asChild variant="slash">
                    <a href="#booking">Book a Ride <ArrowRight className="size-4" /></a>
                  </Button>
                  <a
                    href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                    className="group inline-flex items-center gap-3 text-[var(--navy)] hover:text-[var(--gold)] transition-colors"
                  >
                    <span className="grid place-items-center size-11 rounded-full border border-[var(--navy)]/20 group-hover:border-[var(--gold)] transition-colors">
                      <Phone className="size-4" />
                    </span>
                    <span className="text-sm">
                      <span className="block text-[10px] uppercase tracking-[0.24em] text-muted-foreground">24/7 Reservations</span>
                      <span className="font-medium">{SITE.phoneUK}</span>
                    </span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
                {[
                  { icon: Phone, title: "Call us 24/7", body: SITE.phoneUK, href: `tel:${SITE.phoneUK.replace(/\s/g, "")}` },
                  { icon: MapPin, title: "Visit our office", body: SITE.address, href: "/contact" },
                  { icon: Clock3, title: "Always available", body: "365 days a year", href: "/contact" },
                ].map((c) => (
                  <a
                    key={c.title}
                    href={c.href}
                    className="group relative flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-col sm:items-start sm:gap-0 sm:p-5 hover:border-[var(--gold)]/60 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] transition-all duration-300"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/12 border border-[var(--gold)]/25 text-[var(--gold)] group-hover:scale-110 transition-transform">
                      <c.icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 sm:mt-3 sm:flex-none">
                      <p className="font-semibold text-sm leading-tight">{c.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2 break-words">{c.body}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
