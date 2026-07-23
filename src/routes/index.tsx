import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Plane, ShieldCheck, Star, CalendarCheck, Phone,
  Briefcase, Users, Award, BadgePoundSterling, Headset, Car, Building2, Gem,
  Route as RouteIcon, CheckCircle2, Sparkles, MessageSquare, CreditCard, Quote,
  Plus, Minus, Clock, MapPin
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { BookingWidget } from "@/components/site/BookingWidget";
import { SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

// Local images — served as responsive WebP srcSets via vite-imagetools.
// `?w=480;800;1200&format=webp&as=srcset` produces a proper srcset string at build.
import sclassAsset from "@/assets/fleet/sclass.png.asset.json";
import eclassAsset from "@/assets/fleet/eclass.png.asset.json";
import vclassAsset from "@/assets/fleet/vclass.png.asset.json";
import rangeroverAsset from "@/assets/fleet/rangerover.png.asset.json";
import minibusAsset from "@/assets/fleet/minibus.png.asset.json";
import rollsAsset from "@/assets/fleet/rolls.png.asset.json";
import coachAsset from "@/assets/fleet/coach.png.asset.json";
import coasterAsset from "@/assets/fleet/coaster.png.asset.json";
import { fleetThumbnailUrl } from "@/lib/fleet-image";

type HeroVehicle = {
  key: string;
  name: string;
  tag: string;
  img: string;
  srcSet?: string;
  thumbnail?: string;
  seats: number;
};

const fallbackHeroVehicles: HeroVehicle[] = [
  { key: "vclass", name: "Mercedes V-Class", tag: "First-class · 7 seats", img: vclassAsset.url, srcSet: vclassAsset.srcSet, thumbnail: fleetThumbnailUrl(vclassAsset), seats: 7 },
  { key: "sclass", name: "Mercedes S-Class", tag: "Flagship saloon · 3 seats", img: sclassAsset.url, srcSet: sclassAsset.srcSet, thumbnail: fleetThumbnailUrl(sclassAsset), seats: 3 },
  { key: "eclass", name: "Mercedes E-Class", tag: "Executive · 3 seats", img: eclassAsset.url, srcSet: eclassAsset.srcSet, thumbnail: fleetThumbnailUrl(eclassAsset), seats: 3 },
  { key: "rangerover", name: "Range Rover", tag: "Luxury SUV · 4 seats", img: rangeroverAsset.url, srcSet: rangeroverAsset.srcSet, thumbnail: fleetThumbnailUrl(rangeroverAsset), seats: 4 },
  { key: "rolls", name: "Rolls-Royce Bentley", tag: "Ultra-luxury · 3 seats", img: rollsAsset.url, srcSet: rollsAsset.srcSet, thumbnail: fleetThumbnailUrl(rollsAsset), seats: 3 },
  { key: "minibus", name: "Executive Minibus", tag: "Groups · 16 seats", img: minibusAsset.url, srcSet: minibusAsset.srcSet, thumbnail: fleetThumbnailUrl(minibusAsset), seats: 16 },
  { key: "coaster", name: "Coaster Bus", tag: "Mid-group · 24 seats", img: coasterAsset.url, srcSet: coasterAsset.srcSet, thumbnail: fleetThumbnailUrl(coasterAsset), seats: 24 },
  { key: "coach", name: "Coach Bus", tag: "Large group · 55 seats", img: coachAsset.url, srcSet: coachAsset.srcSet, thumbnail: fleetThumbnailUrl(coachAsset), seats: 55 },
];

// Sizes value for the hero carousel image (right column, ~50vw on large screens).
const HERO_VEHICLE_SIZES = "(max-width: 1024px) 92vw, 600px";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cabslink | UK Airport Transfers & Luxury Airport Travel Service" },
      { name: "description", content: "Book fixed-fare UK airport transfers and luxury driver cars 24/7. Edinburgh, Heathrow, Gatwick, Manchester & Glasgow — flight tracking, meet & greet, Mercedes fleet." },
      { name: "keywords", content: "UK airport transfers, Edinburgh airport taxi, luxury driver UK, private airport travel service, Mercedes V-Class hire, executive car service, Scotland private tours" },
      { property: "og:title", content: "Cabslink | UK Airport Transfers & Luxury Airport Travel Service" },
      { property: "og:description", content: "Book fixed-fare UK airport transfers and luxury driver cars 24/7. Edinburgh, Heathrow, Gatwick, Manchester & Glasgow — flight tracking, meet & greet, Mercedes fleet." },
      { property: "og:description", content: "Fixed-fare UK airport transfers and driver-driven cars. Flight tracking, meet & greet and a professional Mercedes fleet — book in under 60 seconds." },
      { property: "og:url", content: "https://cabslink.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://cabslink.lovable.app/" },
      // Preload the initial LCP hero vehicle image (V-Class). `imagesrcset` +
      // `imagesizes` let the browser pick the right responsive variant even
      // for the preload; `fetchpriority` promotes it above other requests.
      {
        rel: "preload",
        as: "image",
        href: vclassAsset.url,
        imageSrcSet: vclassAsset.srcSet,
        imageSizes: HERO_VEHICLE_SIZES,
        fetchPriority: "high",
      },
    ],
  }),
  component: HomePage,
});

const services = [
  { icon: Plane, title: "Airport Transfers", desc: "Punctual, stress-free transfers to and from every major UK airport.", to: "/airport-transfers" },
  { icon: Building2, title: "Corporate Travel", desc: "Account-managed business travel with professional drivers.", to: "/corporate-travel" },
  { icon: Gem, title: "VIP & Executive", desc: "Discreet, refined airport travel service for VIPs and dignitaries.", to: "/vip-transfers" },
  { icon: RouteIcon, title: "Private Tours", desc: "Bespoke Scotland and UK tours with knowledgeable local drivers.", to: "/tours" },
  { icon: Award, title: "Events & Weddings", desc: "Award ceremonies, weddings and red-carpet arrivals in style.", to: "/services" },
  { icon: Car, title: "Long Distance", desc: "City-to-city UK driver drives with total comfort.", to: "/services" },
];

const steps = [
  { icon: MessageSquare, title: "Tell us your trip", desc: "Enter pickup, drop-off, date and any flight details — takes 30 seconds." },
  { icon: CheckCircle2, title: "Confirm instantly", desc: "Receive a fixed-fare quote and a booking confirmation by email." },
  { icon: Car, title: "Sit back, relax", desc: "Your driver arrives early, tracks your flight and gets you there on time." },
];

const features = [
  { icon: CalendarCheck, title: "Easy Booking", desc: "Confirm in under 60 seconds, 24/7." },
  { icon: BadgePoundSterling, title: "Fixed Fares", desc: "Transparent pricing, no surge, no surprises." },
  { icon: Plane, title: "Flight Tracking", desc: "We monitor delays so you never wait alone." },
  { icon: Headset, title: "24/7 Support", desc: "Live dispatch every day of the year." },
  { icon: ShieldCheck, title: "Vetted Drivers", desc: "Fully licensed, smartly-dressed professionals." },
  { icon: CreditCard, title: "Secure Payment", desc: "Pay online, by card or on account." },
];

const fleet = [
  { name: "Mercedes-Benz S-Class", note: "Signature", img: sclassAsset.url, srcSet: sclassAsset.srcSet, passengers: 3, luggage: 3, transmission: "Automatic", fuel: "Petrol" },
  { name: "Mercedes-Benz E-Class", note: "Executive", img: eclassAsset.url, srcSet: eclassAsset.srcSet, passengers: 3, luggage: 3, transmission: "Automatic", fuel: "Diesel" },
  { name: "Mercedes-Benz V-Class", note: "First class", img: vclassAsset.url, srcSet: vclassAsset.srcSet, passengers: 7, luggage: 7, transmission: "Automatic", fuel: "Diesel" },
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
    const load = () => {
      supabase
        .from("vehicles")
        .select("id, name, category, image_url, passengers")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .then(({ data }) => {
          if (cancelled || !data) return;
          const mapped = data
            .filter((v: any) => v.image_url)
            .map((v: any) => ({
              key: v.id as string,
              name: v.name as string,
              tag: `${v.category ?? "Vehicle"} · ${v.passengers ?? 0} seats`,
              img: v.image_url as string,
              seats: v.passengers ?? 0,
            }));
          setDbVehicles(mapped.length > 0 ? mapped : null);
        });
    };
    load();
    const channel = supabase
      .channel("vehicles-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);


  const heroVehicles = useMemo(() => dbVehicles ?? fallbackHeroVehicles, [dbVehicles]);

  useEffect(() => {
    if (paused || heroVehicles.length === 0) return;
    const id = setInterval(() => {
      setDir(1);
      setActive((i) => (i + 1) % heroVehicles.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, heroVehicles.length]);

  useEffect(() => {
    if (heroVehicles.length > 0 && active >= heroVehicles.length) setActive(0);
  }, [heroVehicles.length, active]);

  const go = (next: number) => {
    if (heroVehicles.length === 0) return;
    setDir(next > active || (active === heroVehicles.length - 1 && next === 0) ? 1 : -1);
    setActive((next + heroVehicles.length) % heroVehicles.length);
  };

  const current = heroVehicles[active];

  return (
    <SiteLayout>
      {/* HERO — same structure, navy background */}
      <section className="relative overflow-hidden navy-scene">
        <div className="container-x relative pt-14 md:pt-20 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* LEFT — copy */}
            <div className="lg:col-span-6 relative z-10 min-w-0 w-full">

              <div
                className="inline-flex items-center gap-3 rounded-full border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-4 py-1.5 opacity-0"
                style={{ animation: "fadeInUp 700ms cubic-bezier(.2,.7,.2,1) 100ms forwards" }}
              >
                <Sparkles className="size-3.5 text-[var(--gold)]" />
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.32em] text-white">
                  UK's Trusted Airport Travel Company
                </span>
              </div>

              <h1
                className="mt-5 font-display font-bold text-white leading-[0.95] tracking-[-0.03em] text-[2rem] sm:text-5xl lg:text-[5.25rem] opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 200ms forwards" }}
              >
                Arrive in{" "}
                <span className="text-[var(--gold)]">
                  quiet luxury.
                </span>
              </h1>

              <p
                className="mt-5 max-w-xl text-sm md:text-lg text-white/75 opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 380ms forwards" }}
              >
                Fixed-fare Mercedes-Benz driver transfers across the UK. Flight tracked, meet &amp; greet, 24/7 live dispatch — the calm way to travel.
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
                        className="grid size-7 place-items-center rounded-full border-2 border-white/20 bg-[var(--navy)] text-[10px] font-semibold text-[var(--gold)]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-white min-w-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="size-3 fill-[var(--gold)] text-[var(--gold)]" />
                      ))}
                    </div>
                    <div className="text-white/60 text-[11px] truncate">2,400+ five-star rides</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/15 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white">
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
                  <div key={s.k} className={`min-w-0 px-2 sm:px-4 first:pl-0 ${i < arr.length - 1 ? "border-r border-white/15" : ""}`}>
                    <div className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white">{s.k}</div>
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1 truncate">{s.v}</div>
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
                      WebkitTextStroke: "1px color-mix(in oklab, #ffffff 12%, transparent)",
                      backgroundColor: "transparent",
                    }}
                  >
                    CABSLINK
                  </span>
                </div>

                {/* Ground shadow */}
                <div aria-hidden className="absolute inset-x-8 bottom-2 h-8 rounded-[50%] bg-[color-mix(in_oklab,#000000_40%,transparent)] blur-2xl" />

                {/* Sliding vehicle stage */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  {current && (
                    <img
                      key={current.key}
                      src={current.img}
                      srcSet={current.srcSet}
                      sizes={HERO_VEHICLE_SIZES}
                      alt={`${current.name} — driver vehicle`}
                      width={1200}
                      height={750}
                      decoding="async"
                      fetchPriority={active === 0 ? "high" : "auto"}
                      className="absolute inset-0 m-auto w-[92%] h-full object-contain drop-shadow-[0_35px_45px_rgba(0,0,0,0.35)]"
                      style={{
                        animation: `${dir === 1 ? "vehicleSlideInR" : "vehicleSlideInL"} 850ms cubic-bezier(.2,.7,.2,1) both`,
                      }}
                    />
                  )}
                </div>

                {/* Floating live chip */}
                <div className="hidden md:flex absolute bottom-10 left-0 lg:left-4 items-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 shadow-[var(--shadow-elegant)]">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)]/50" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[var(--gold)]" />
                  </span>
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--navy)]">Live dispatch</div>
                    <div className="text-[var(--navy)]/60">Driver available now</div>
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
                            ? "border-[var(--gold)] bg-[var(--gold)]/15 shadow-[var(--shadow-elegant)]"
                            : "border-white/15 bg-white hover:border-[var(--gold)]/50 hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="w-14 h-9 shrink-0 grid place-items-center overflow-hidden">
                          <img src={v.thumbnail ?? v.img} alt="" loading="lazy" decoding="async" width={56} height={36} className="max-h-full w-auto object-contain" />
                        </div>
                        <div className="text-left pr-1">
                          <div className={`text-[11px] font-semibold leading-tight ${isActive ? "text-[var(--navy)]" : "text-[var(--navy)]/80"}`}>
                            {v.name}
                          </div>
                          <div className="text-[10px] text-[var(--navy)]/60 leading-tight">{v.seats} seats</div>
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

      {/* BOOKING WIDGET */}
      <section id="booking" className="relative z-20 scroll-mt-24 bg-white border-b border-[var(--navy)]/8">
        <div className="container-x pt-6 pb-6">
          <BookingWidget />
        </div>
      </section>

      {/* SERVICES — asymmetric editorial grid (Limoride-style) */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow-gold text-[11px]">— Our Services</p>
              <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.02] tracking-[-0.02em] text-[var(--navy)]">
                A complete airport <br className="hidden md:block" />
                <span className="text-[var(--gold)]">travel service.</span>
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-[var(--navy)]/70 leading-relaxed text-base md:text-lg">
                From airport pickups to multi-day private tours — one trusted standard,
                every journey. Every ride includes flight tracking, meet &amp; greet
                and a professional Mercedes fleet.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-6 lg:grid-rows-2">
            {services.map((s, i) => {
              const featured = i === 0;
              return (
                <Link
                  key={s.title}
                  to={s.to}
                  className={`group relative overflow-hidden rounded-[28px] border transition-all duration-500 ${
                    featured
                      ? "lg:col-span-2 lg:row-span-2 bg-[var(--navy)] border-[var(--navy)] text-white p-8 hover:-translate-y-1"
                      : "lg:col-span-2 bg-white border-[var(--navy)]/10 p-7 hover:border-[var(--gold)] hover:-translate-y-1"
                  }`}
                >
                  <span className={`text-[11px] font-mono ${featured ? "text-[var(--gold)]" : "text-[var(--navy)]/40"}`}>
                    0{i + 1} / 0{services.length}
                  </span>
                  <div className={`mt-4 grid size-14 place-items-center rounded-2xl ${
                    featured ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "bg-[var(--gold)]/10 text-[var(--navy)] border border-[var(--gold)]/40"
                  }`}>
                    <s.icon className="size-6" />
                  </div>
                  <h3 className={`mt-6 font-display font-semibold leading-tight ${featured ? "text-white text-3xl md:text-4xl" : "text-[var(--navy)] text-xl"}`}>
                    {s.title}
                  </h3>
                  <p className={`mt-3 text-sm leading-relaxed ${featured ? "text-white/70" : "text-[var(--navy)]/60"}`}>
                    {s.desc}
                  </p>
                  <span className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all ${
                    featured ? "text-[var(--gold)]" : "text-[var(--navy)] group-hover:text-[var(--gold-ink)]"
                  }`}>
                    Explore <ArrowRight className="size-4" />
                  </span>
                  {featured && (
                    <div aria-hidden className="absolute -bottom-10 -right-10 size-56 rounded-full border border-white/10" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* STATS COUNTER STRIP */}
      <section className="navy-scene border-y border-white/10">
        <div className="container-x py-14 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          {[
            { k: "50k+", v: "Journeys completed" },
            { k: "24/7", v: "Live dispatch" },
            { k: "4.9★", v: "Average rating" },
            { k: "120+", v: "UK destinations" },
          ].map((s, i, arr) => (
            <div key={s.k} className={`px-2 md:px-6 ${i < arr.length - 1 ? "md:border-r border-white/10" : ""}`}>
              <div className="font-display text-5xl md:text-6xl font-bold text-[var(--gold)] leading-none tracking-[-0.03em]">
                {s.k}
              </div>
              <div className="mt-3 text-xs md:text-sm uppercase tracking-[0.22em] text-white/60">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — connected timeline */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="max-w-3xl">
            <p className="eyebrow-gold text-[11px]">— Simple Process</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Three steps to a <span className="text-[var(--gold)]">premium ride.</span>
            </h2>
          </div>

          <div className="mt-16 relative grid gap-10 md:grid-cols-3">
            <div aria-hidden className="hidden md:block absolute top-8 left-[16%] right-[16%] border-t-2 border-dashed border-[var(--gold)]/40" />
            {steps.map((s, i) => (
              <div key={s.title} className="relative text-center md:text-left">
                <div className="relative mx-auto md:mx-0 grid size-16 place-items-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[0_10px_30px_-10px_rgba(223,175,38,0.6)]">
                  <s.icon className="size-6" />
                  <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-[var(--navy)] text-white text-xs font-bold border-2 border-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold text-[var(--navy)]">{s.title}</h3>
                <p className="mt-3 text-sm text-[var(--navy)]/60 leading-relaxed max-w-xs mx-auto md:mx-0">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-[var(--gold)]">— Our Fleet</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-white leading-[1.05]">
                Premium vehicles, <br />
                <span className="text-[var(--gold)]">impeccable standard.</span>
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] self-start md:self-auto">
              <Link to="/fleet">View full fleet <ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((f) => (
              <div key={f.name} className="group relative rounded-[24px] bg-white overflow-hidden border border-white/10 hover:-translate-y-1 transition-all duration-500">
                <span className="absolute top-5 left-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--navy)] text-white text-[10px] font-semibold uppercase tracking-[0.16em] px-3 py-1.5">
                  <Gem className="size-3 text-[var(--gold)]" /> {f.note}
                </span>

                <div className="relative aspect-[16/10] flex items-center justify-center bg-[var(--navy)]/5 overflow-hidden">
                  <img
                    src={f.img}
                    srcSet={f.srcSet}
                    sizes="(max-width: 1024px) 45vw, 360px"
                    alt={f.name}
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={750}
                    className="max-h-full w-[92%] object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold text-[var(--navy)]">{f.name}</h3>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    {[
                      { i: Users, l: "Passengers", v: f.passengers },
                      { i: Briefcase, l: "Luggage", v: f.luggage },
                      { i: Car, l: "Gearbox", v: f.transmission },
                      { i: ShieldCheck, l: "Fuel", v: f.fuel },
                    ].map((sp) => (
                      <div key={sp.l} className="flex items-center gap-2 rounded-lg bg-[var(--navy)]/5 px-3 py-2">
                        <sp.i className="size-4 text-[var(--gold-ink)]" />
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-[var(--navy)]/50">{sp.l}</div>
                          <div className="text-[13px] font-semibold text-[var(--navy)] truncate">{sp.v}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[var(--navy)]/10 pt-5">
                    <div className="flex items-center gap-2 text-[var(--navy)]/70 text-xs">
                      <MapPin className="size-4 text-[var(--gold-ink)]" /> UK-wide coverage
                    </div>
                    <Link
                      to="/book"
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] hover:brightness-110 transition"
                    >
                      Book <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US — split layout with numbered list */}
      <section className="section-y bg-white">
        <div className="container-x grid lg:grid-cols-12 gap-14 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <p className="eyebrow-gold text-[11px]">— Why Cabslink</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Every ride, <br />
              <span className="text-[var(--gold)]">by default.</span>
            </h2>
            <p className="mt-5 text-[var(--navy)]/65 leading-relaxed">
              We built Cabslink around the details other operators treat as extras.
              Fixed fares, live flight tracking, spotless Mercedes vehicles — no upsells, no surprises.
            </p>
            <Button asChild variant="gold" className="mt-8 rounded-full">
              <a href="#booking">Book your ride <ArrowRight className="size-4" /></a>
            </Button>
          </div>

          <div className="lg:col-span-7 divide-y divide-[var(--navy)]/10 border-y border-[var(--navy)]/10">
            {features.map((f, i) => (
              <div key={f.title} className="group flex items-center gap-6 py-6 hover:bg-[var(--navy)]/[0.02] transition-colors -mx-2 px-2 rounded-lg">
                <span className="font-display text-3xl font-bold text-[var(--gold)]/70 tabular-nums w-10">
                  0{i + 1}
                </span>
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/10 text-[var(--navy)] border border-[var(--gold)]/30 group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)] transition-colors">
                  <f.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold text-[var(--navy)]">{f.title}</h3>
                  <p className="mt-1 text-sm text-[var(--navy)]/60 leading-relaxed">{f.desc}</p>
                </div>
                <ArrowRight className="size-4 text-[var(--navy)]/30 group-hover:text-[var(--gold)] group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-[var(--gold)]">— Testimonials</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-white leading-[1.05]">
              What our clients <span className="text-[var(--gold)]">say.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-12">
            <figure className="lg:col-span-7 relative rounded-[28px] bg-[var(--gold)] text-[var(--navy)] p-10 md:p-12 overflow-hidden">
              <Quote className="absolute top-6 right-6 size-24 text-[var(--navy)]/10" />
              <div className="flex items-center gap-1 text-[var(--navy)]">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <blockquote className="mt-6 font-display text-2xl md:text-3xl font-semibold leading-[1.25] tracking-[-0.01em]">
                "{testimonials[0].quote}"
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4 pt-6 border-t border-[var(--navy)]/15">
                <div className="grid size-12 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)] font-display font-bold text-lg">
                  {testimonials[0].name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[var(--navy)]">{testimonials[0].name}</p>
                  <p className="text-xs text-[var(--navy)]/70">{testimonials[0].role}</p>
                </div>
              </figcaption>
            </figure>

            <div className="lg:col-span-5 grid gap-6">
              {testimonials.slice(1).map((t) => (
                <figure key={t.name} className="relative rounded-[24px] border border-white/15 bg-white/5 p-7">
                  <div className="flex items-center gap-1 text-[var(--gold)]">
                    {[...Array(5)].map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}
                  </div>
                  <blockquote className="mt-4 text-sm text-white/85 leading-relaxed">
                    "{t.quote}"
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="grid size-9 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-display font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-[11px] text-white/60">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-y bg-white">
        <div className="container-x grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <p className="eyebrow-gold text-[11px]">— FAQ</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Answers, <br /><span className="text-[var(--gold)]">upfront.</span>
            </h2>
            <p className="mt-5 text-[var(--navy)]/65 leading-relaxed">
              Everything you need to know before you book. Can't find your answer?
              Our dispatch team is available 24/7.
            </p>
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="mt-6 inline-flex items-center gap-3 text-[var(--navy)] group"
            >
              <span className="grid place-items-center size-11 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] group-hover:brightness-110 transition">
                <Phone className="size-4" />
              </span>
              <span className="text-sm">
                <span className="block text-[10px] uppercase tracking-[0.24em] text-[var(--navy)]/60">Call 24/7</span>
                <span className="font-semibold">{SITE.phoneUK}</span>
              </span>
            </a>
          </div>
          <div className="lg:col-span-8">
            <Faq />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section-y bg-[var(--gold)] relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #0e182c 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="container-x relative">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--navy)]/70 font-semibold">Ready when you are</p>
              <h3 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.02] text-[var(--navy)] tracking-[-0.02em]">
                Your ride, <span className="text-white">one tap away.</span>
              </h3>
              <p className="mt-5 text-[var(--navy)]/75 leading-relaxed max-w-xl">
                Book, track and enjoy a seamless driver experience across the UK.
                Available 24/7 — no surge, no surprises.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4 lg:items-end">
              <Button asChild variant="slash" className="w-full lg:w-auto">
                <a href="#booking">Book a Ride <ArrowRight className="size-4" /></a>
              </Button>
              <a
                href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                className="group inline-flex items-center gap-3 text-[var(--navy)] hover:text-white transition-colors"
              >
                <span className="grid place-items-center size-11 rounded-full border border-[var(--navy)]/25 group-hover:border-white transition-colors">
                  <Phone className="size-4" />
                </span>
                <span className="text-sm">
                  <span className="block text-[10px] uppercase tracking-[0.24em] text-[var(--navy)]/60">24/7 Reservations</span>
                  <span className="font-semibold">{SITE.phoneUK}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}
