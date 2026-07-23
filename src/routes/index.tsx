import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Plane, ShieldCheck, Star, CalendarCheck, Phone,
  Briefcase, Users, Award, BadgePoundSterling, Headset, Car, Building2, Gem,
  Route as RouteIcon, CheckCircle2, Sparkles, MessageSquare, CreditCard, Quote,
  Plus, Minus, MapPin, Clock, Globe2, Compass, Wallet, Timer, Mail
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { BookingWidget } from "@/components/site/BookingWidget";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

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

const HERO_VEHICLE_SIZES = "(max-width: 1024px) 92vw, 600px";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { name: "description", content: "Plan premium UK journeys with Cabslink — fixed-fare airport transfers, private tours and executive travel. Flight tracking, meet & greet, Mercedes fleet, 24/7." },
      { name: "keywords", content: "UK airport transfers, luxury travel UK, private driver, Edinburgh airport taxi, Heathrow transfer, Mercedes V-Class hire, executive car service, Scotland tours" },
      { property: "og:title", content: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { property: "og:description", content: "Plan premium UK journeys — fixed-fare transfers, private tours, executive travel. Flight tracking, meet & greet, Mercedes fleet." },
      { property: "og:url", content: "https://cabslink.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://cabslink.lovable.app/" },
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

const trustStats = [
  { icon: Star, k: "4.9/5", v: "Rated Excellent" },
  { icon: Globe2, k: "50k+", v: "Journeys Completed" },
  { icon: Headset, k: "24/7", v: "Live Support" },
  { icon: ShieldCheck, k: "100%", v: "Licensed Drivers" },
];

const popularRoutes = [
  { from: "London Heathrow", to: "Central London", distance: "24 mi", duration: "45 min", price: "£65", img: eclassAsset.url },
  { from: "Manchester Airport", to: "Liverpool", distance: "36 mi", duration: "55 min", price: "£95", img: sclassAsset.url },
  { from: "Edinburgh", to: "Fort William", distance: "133 mi", duration: "3 h", price: "£340", img: vclassAsset.url },
  { from: "Gatwick", to: "Brighton", distance: "28 mi", duration: "40 min", price: "£75", img: rangeroverAsset.url },
];

const services = [
  { icon: Plane, title: "Airport Transfers", desc: "Fixed-fare pickups from every UK airport with live flight tracking.", to: "/airport-transfers" },
  { icon: Building2, title: "Corporate Travel", desc: "Account-managed executive travel with monthly invoicing.", to: "/corporate-travel" },
  { icon: Gem, title: "VIP & Executive", desc: "Discreet, refined travel for VIPs and dignitaries.", to: "/vip-transfers" },
  { icon: RouteIcon, title: "Private Tours", desc: "Bespoke Scotland and UK day tours with local drivers.", to: "/tours" },
  { icon: Award, title: "Events & Weddings", desc: "Weddings, ceremonies and red-carpet arrivals in style.", to: "/services" },
  { icon: Car, title: "Long Distance", desc: "City-to-city UK journeys with total comfort.", to: "/services" },
];

const steps = [
  { icon: MessageSquare, title: "Plan Journey", desc: "Enter pickup, destination and travel details in 30 seconds." },
  { icon: CheckCircle2, title: "Choose Vehicle", desc: "Pick from our premium Mercedes fleet with instant fixed pricing." },
  { icon: Car, title: "Travel Comfortably", desc: "Your driver tracks your flight and arrives early — every time." },
];

const features = [
  { icon: BadgePoundSterling, title: "Fixed Pricing", desc: "No surge. No surprises. What you see is what you pay." },
  { icon: Plane, title: "Flight Monitoring", desc: "We track delays and adjust pickup automatically." },
  { icon: Users, title: "Meet & Greet", desc: "Your driver waits inside the terminal with a name board." },
  { icon: ShieldCheck, title: "Licensed Drivers", desc: "Fully vetted, insured and professionally trained." },
  { icon: Gem, title: "Executive Fleet", desc: "Immaculate Mercedes and luxury SUV vehicles." },
  { icon: Headset, title: "24/7 Support", desc: "Live dispatch every day of the year." },
  { icon: CreditCard, title: "Secure Booking", desc: "Encrypted payments and instant confirmation." },
  { icon: Award, title: "Professional Service", desc: "The calm, consistent standard trusted by thousands." },
];

const fleet = [
  { name: "Mercedes-Benz S-Class", note: "Signature", img: sclassAsset.url, srcSet: sclassAsset.srcSet, passengers: 3, luggage: 3, from: "£95", best: "Executive travel" },
  { name: "Mercedes-Benz E-Class", note: "Executive", img: eclassAsset.url, srcSet: eclassAsset.srcSet, passengers: 3, luggage: 3, from: "£65", best: "Airport transfers" },
  { name: "Mercedes-Benz V-Class", note: "First class", img: vclassAsset.url, srcSet: vclassAsset.srcSet, passengers: 7, luggage: 7, from: "£120", best: "Families & small groups" },
];

const ukAirports = [
  { code: "LHR", name: "Heathrow", city: "London" },
  { code: "LGW", name: "Gatwick", city: "London" },
  { code: "MAN", name: "Manchester", city: "Manchester" },
  { code: "BHX", name: "Birmingham", city: "Birmingham" },
  { code: "STN", name: "Stansted", city: "London" },
  { code: "LTN", name: "Luton", city: "London" },
  { code: "EDI", name: "Edinburgh", city: "Edinburgh" },
  { code: "GLA", name: "Glasgow", city: "Glasgow" },
];

const ukCities = [
  "London", "Edinburgh", "Manchester", "Glasgow", "Birmingham",
  "Liverpool", "Leeds", "Bristol", "Cardiff", "Newcastle", "Oxford", "Cambridge",
];

const featuredTours = [
  { slug: "loch-ness-highlands", title: "Loch Ness & Highlands", duration: "10 hours", highlights: ["Urquhart Castle", "Glencoe", "Scenic lochs"], img: vclassAsset.url },
  { slug: "outlander-experience", title: "Outlander Filming Locations", duration: "8 hours", highlights: ["Doune Castle", "Culross", "Blackness"], img: sclassAsset.url },
  { slug: "harry-potter-scotland", title: "Harry Potter in Scotland", duration: "12 hours", highlights: ["Glenfinnan Viaduct", "Loch Shiel", "Fort William"], img: rangeroverAsset.url },
];

const testimonials = [
  { name: "Sarah M.", role: "Frequent flyer · Edinburgh", vehicle: "Mercedes V-Class", country: "🇬🇧", quote: "Driver was waiting at arrivals with a name board. Immaculate vehicle, calm and professional. Best transfer service I've used in the UK." },
  { name: "James R.", role: "Operations Director", vehicle: "Mercedes E-Class", country: "🇬🇧", quote: "We moved our entire executive travel to Cabslink. Reliable, on-time, polished — and the monthly invoicing is a relief." },
  { name: "Priya K.", role: "Wedding planner", vehicle: "Mercedes S-Class", country: "🇬🇧", quote: "They handled five vehicles across two venues without a hitch. Pure professionalism from start to finish." },
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
      {/* HERO — untouched blue background */}
      <section className="relative overflow-hidden navy-scene">
        <div className="container-x relative pt-14 md:pt-20 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-6 relative z-10 min-w-0 w-full">
              <div
                className="inline-flex items-center gap-3 rounded-full border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-4 py-1.5 opacity-0"
                style={{ animation: "fadeInUp 700ms cubic-bezier(.2,.7,.2,1) 100ms forwards" }}
              >
                <Sparkles className="size-3.5 text-[var(--gold)]" />
                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.32em] text-white">
                  UK's Premium Travel Platform
                </span>
              </div>

              <h1
                className="mt-5 font-display font-bold text-white leading-[0.95] tracking-[-0.03em] text-[2rem] sm:text-5xl lg:text-[5.25rem] opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 200ms forwards" }}
              >
                Plan your{" "}
                <span className="text-[var(--gold)]">journey.</span>
              </h1>

              <p
                className="mt-5 max-w-xl text-sm md:text-lg text-white/75 opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 380ms forwards" }}
              >
                Fixed-fare Mercedes-Benz transfers, private tours and executive travel across the UK. Flight tracked, meet &amp; greet, 24/7 dispatch — the calm way to travel.
              </p>

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
                    <div className="text-white/60 text-[11px] truncate">2,400+ five-star journeys</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/15 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white">
                  <ShieldCheck className="size-4 text-[var(--gold)] shrink-0" />
                  <span className="font-medium">Licensed &amp; insured</span>
                </div>
              </div>

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

            <div className="lg:col-span-6 relative">
              <div
                className="relative opacity-0"
                style={{ animation: "fadeInUp 900ms cubic-bezier(.2,.7,.2,1) 300ms forwards" }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
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

                <div aria-hidden className="absolute inset-x-8 bottom-2 h-8 rounded-[50%] bg-[color-mix(in_oklab,#000000_40%,transparent)] blur-2xl" />

                <div className="relative aspect-[16/10] overflow-hidden">
                  {current && (
                    <img
                      key={current.key}
                      src={current.img}
                      srcSet={current.srcSet}
                      sizes={HERO_VEHICLE_SIZES}
                      alt={`${current.name} — luxury travel vehicle`}
                      width={1200}
                      height={750}
                      decoding="async"
                      fetchPriority={active === 0 ? "high" : "auto"}
                      className="absolute inset-0 m-auto w-[92%] h-full object-contain animate-float drop-shadow-[0_35px_45px_rgba(0,0,0,0.35)]"
                      style={{
                        animation: `${dir === 1 ? "vehicleSlideInR" : "vehicleSlideInL"} 850ms cubic-bezier(.2,.7,.2,1) both, float-y 6s ease-in-out 1s infinite`,
                      }}
                    />
                  )}
                </div>

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

      {/* BOOKING WIDGET — untouched functionality */}
      <section id="booking" className="relative z-20 scroll-mt-24 bg-white border-b border-[var(--navy)]/8">
        <div className="container-x pt-8 pb-10">
          <BookingWidget />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-white border-b border-[var(--navy)]/8">
        <div className="container-x py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustStats.map((s) => (
            <div key={s.v} className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--gold)]/12 text-[var(--gold-ink)]">
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold text-[var(--navy)] leading-none tracking-[-0.02em]">{s.k}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--navy)]/60 truncate">{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POPULAR ROUTES */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="eyebrow-gold text-[11px]">— Popular Routes</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05] tracking-[-0.02em]">
                Trusted journeys, <span className="text-[var(--gold)]">fixed prices.</span>
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[var(--navy)]/20 text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)] self-start md:self-auto">
              <Link to="/airport-transfers">Explore all routes <ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popularRoutes.map((r) => (
              <Link
                key={`${r.from}-${r.to}`}
                to="/book"
                className="group relative overflow-hidden rounded-[24px] border border-[var(--navy)]/10 bg-white hover:border-[var(--gold)] hover:-translate-y-1 transition-all duration-500"
              >
                <div className="relative aspect-[4/3] bg-[var(--navy)]/[0.04] overflow-hidden">
                  <img
                    src={r.img}
                    alt={`${r.from} to ${r.to}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 m-auto w-[90%] h-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-[var(--navy)] text-white text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1">
                    Fixed fare
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-[var(--navy)]/60">
                    <MapPin className="size-3.5 text-[var(--gold-ink)]" />
                    <span className="truncate">{r.from}</span>
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold text-[var(--navy)] truncate">
                    → {r.to}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--navy)]/10 pt-4">
                    <div className="flex items-center gap-3 text-[11px] text-[var(--navy)]/60">
                      <span className="flex items-center gap-1"><Compass className="size-3" />{r.distance}</span>
                      <span className="flex items-center gap-1"><Timer className="size-3" />{r.duration}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--navy)]/50">From</div>
                      <div className="font-display font-bold text-[var(--navy)]">{r.price}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES BENTO */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow-gold text-[11px]">— Our Services</p>
              <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.02] tracking-[-0.02em] text-[var(--navy)]">
                A complete travel <br className="hidden md:block" />
                <span className="text-[var(--gold)]">platform.</span>
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

      {/* LUXURY FLEET */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-[var(--gold)]">— Luxury Fleet</p>
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
                <span className="absolute top-5 right-5 z-10 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1.5">
                  From {f.from}
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
                  <p className="mt-1 text-xs text-[var(--navy)]/60">Best for: {f.best}</p>

                  <div className="mt-5 flex items-center gap-4 text-xs text-[var(--navy)]/70">
                    <span className="flex items-center gap-1.5"><Users className="size-4 text-[var(--gold-ink)]" />{f.passengers} pax</span>
                    <span className="flex items-center gap-1.5"><Briefcase className="size-4 text-[var(--gold-ink)]" />{f.luggage} bags</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-[var(--gold-ink)]" />Insured</span>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[var(--navy)]/10 pt-5">
                    <div className="flex items-center gap-2 text-[var(--navy)]/70 text-xs">
                      <MapPin className="size-4 text-[var(--gold-ink)]" /> UK-wide
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

      {/* WHY CHOOSE — BENTO */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="max-w-2xl mb-14">
            <p className="eyebrow-gold text-[11px]">— Why Cabslink</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              The details that <span className="text-[var(--gold)]">make the difference.</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {features.map((f, i) => {
              const wide = i === 0;
              return (
                <div
                  key={f.title}
                  className={`group relative overflow-hidden rounded-[22px] border border-[var(--navy)]/10 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--gold)] ${
                    wide ? "md:col-span-2 bg-[var(--navy)] text-white" : "bg-white"
                  }`}
                >
                  <div className={`grid size-12 place-items-center rounded-xl ${
                    wide ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "bg-[var(--gold)]/10 text-[var(--navy)] border border-[var(--gold)]/30"
                  }`}>
                    <f.icon className="size-5" />
                  </div>
                  <h3 className={`mt-5 font-display font-semibold ${wide ? "text-2xl md:text-3xl text-white" : "text-lg text-[var(--navy)]"}`}>
                    {f.title}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed ${wide ? "text-white/70 max-w-md" : "text-[var(--navy)]/60"}`}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* UK COVERAGE */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <p className="eyebrow-gold text-[11px]">— UK Coverage</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              From the Highlands <br />
              <span className="text-[var(--gold)]">to the Channel.</span>
            </h2>
            <p className="mt-5 text-[var(--navy)]/65 leading-relaxed">
              120+ towns and cities. Every major airport. One trusted travel platform
              across England, Scotland and Wales — with local drivers who know the roads.
            </p>
            <Button asChild variant="gold" className="mt-8 rounded-full">
              <Link to="/services">Explore Locations <ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[28px] border border-[var(--navy)]/10 bg-white p-8 shadow-[var(--shadow-elegant)]">
              <div className="flex items-center gap-3 pb-5 border-b border-[var(--navy)]/10">
                <Globe2 className="size-5 text-[var(--gold-ink)]" />
                <span className="font-display text-lg font-semibold text-[var(--navy)]">Cities we serve</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {ukCities.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--navy)]/12 bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)] transition cursor-default">
                    <MapPin className="size-3 text-[var(--gold-ink)]" /> {c}
                  </span>
                ))}
                <span className="inline-flex items-center rounded-full bg-[var(--navy)] text-white px-3.5 py-1.5 text-xs font-semibold">
                  + 108 more
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AIRPORT TRANSFERS */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="eyebrow-gold text-[11px]">— Airport Transfers</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
                Every major UK <span className="text-[var(--gold)]">airport.</span>
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[var(--navy)]/20 text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)] self-start md:self-auto">
              <Link to="/airport-transfers">All airports <ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {ukAirports.map((a) => (
              <Link
                key={a.code}
                to="/airports/$iata"
                params={{ iata: a.code.toLowerCase() }}
                className="group relative overflow-hidden rounded-[20px] border border-[var(--navy)]/10 bg-white p-6 hover:border-[var(--gold)] hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start justify-between">
                  <Plane className="size-6 text-[var(--gold-ink)]" />
                  <span className="font-mono text-[10px] text-[var(--navy)]/40 tracking-widest">{a.code}</span>
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold text-[var(--navy)]">{a.name}</h3>
                <p className="text-xs text-[var(--navy)]/55">{a.city}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)] group-hover:gap-2 transition-all">
                  Book transfer <ArrowRight className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TOURS */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="eyebrow-gold text-[11px]">— Featured Tours</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
                Private tours, <br className="hidden md:block" />
                <span className="text-[var(--gold)]">unforgettable journeys.</span>
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[var(--navy)]/20 text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)] self-start md:self-auto">
              <Link to="/tours">Browse all tours <ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featuredTours.map((t) => (
              <Link
                key={t.slug}
                to="/tours/$slug"
                params={{ slug: t.slug }}
                className="group relative overflow-hidden rounded-[28px] border border-[var(--navy)]/10 bg-white hover:-translate-y-1 hover:border-[var(--gold)] transition-all duration-500"
              >
                <div className="relative aspect-[4/3] bg-[var(--navy)]/[0.04] overflow-hidden">
                  <img src={t.img} alt={t.title} loading="lazy" decoding="async"
                       className="absolute inset-0 m-auto w-[92%] h-full object-contain transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute top-4 left-4 rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1.5 inline-flex items-center gap-1">
                    <Clock className="size-3" /> {t.duration}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold text-[var(--navy)]">{t.title}</h3>
                  <ul className="mt-4 space-y-1.5">
                    {t.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-xs text-[var(--navy)]/65">
                        <CheckCircle2 className="size-3.5 text-[var(--gold-ink)] shrink-0" /> {h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex items-center justify-between border-t border-[var(--navy)]/10 pt-5">
                    <span className="text-xs font-semibold text-[var(--navy)]/60">Private tour</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--gold-ink)] group-hover:gap-2 transition-all">
                      Explore <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="max-w-3xl">
            <p className="eyebrow-gold text-[11px]">— How It Works</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Three steps to a <span className="text-[var(--gold)]">premium journey.</span>
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

      {/* REVIEWS */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-[var(--gold)]">— Customer Reviews</p>
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
                  <p className="font-semibold text-[var(--navy)]">{testimonials[0].name} <span className="ml-1">{testimonials[0].country}</span></p>
                  <p className="text-xs text-[var(--navy)]/70">{testimonials[0].role} · {testimonials[0].vehicle}</p>
                </div>
              </figcaption>
            </figure>

            <div className="lg:col-span-5 grid gap-6">
              {testimonials.slice(1).map((t) => (
                <figure key={t.name} className="relative rounded-[24px] border border-white/15 bg-white/5 p-7 backdrop-blur">
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
                      <p className="text-sm font-semibold text-white">{t.name} <span className="ml-1">{t.country}</span></p>
                      <p className="text-[11px] text-white/60">{t.role} · {t.vehicle}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CORPORATE TRAVEL */}
      <section className="section-y bg-white">
        <div className="container-x grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <p className="eyebrow-gold text-[11px]">— Corporate Travel</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Business travel, <span className="text-[var(--gold)]">handled.</span>
            </h2>
            <p className="mt-5 text-[var(--navy)]/65 leading-relaxed">
              Dedicated account management, monthly consolidated invoicing and priority
              dispatch — the executive travel programme trusted by UK companies.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { i: Wallet, t: "Monthly invoicing" },
                { i: Users, t: "Dedicated account" },
                { i: Briefcase, t: "Business travel" },
                { i: Sparkles, t: "Priority service" },
              ].map((b) => (
                <li key={b.t} className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--navy)]">
                    <b.i className="size-4" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--navy)]">{b.t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-full">
                <Link to="/corporate-booking">Open Corporate Account <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-[var(--navy)]/20 text-[var(--navy)]">
                <Link to="/corporate-travel">Learn more</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="relative rounded-[28px] navy-scene overflow-hidden p-10 md:p-12 min-h-[380px] flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="size-6 text-[var(--gold)]" />
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/70 font-semibold">Enterprise Ready</span>
              </div>
              <div>
                <div className="font-display text-6xl md:text-7xl font-bold text-[var(--gold)] leading-none tracking-[-0.03em]">
                  200+
                </div>
                <p className="mt-4 text-white/75 max-w-sm">
                  UK companies rely on Cabslink for business travel — from single executive
                  transfers to global client visits.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <Mail className="size-3.5 text-[var(--gold)]" /> {SITE.email}
                </div>
                <div className="h-4 w-px bg-white/15" />
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <Phone className="size-3.5 text-[var(--gold)]" /> {SITE.phoneUK}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-y bg-[var(--surface-2)]">
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
      <section className="section-y navy-scene relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #dfaf26 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="container-x relative">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--gold)] font-semibold">Ready when you are</p>
              <h3 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.02] text-white tracking-[-0.02em]">
                Ready for your <span className="text-[var(--gold)]">next journey?</span>
              </h3>
              <p className="mt-5 text-white/75 leading-relaxed max-w-xl">
                Book your driver in under two minutes. Fixed pricing, instant confirmation,
                24/7 support — the calm way to travel across the UK.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4 lg:items-end">
              <Button asChild variant="slash" className="w-full lg:w-auto">
                <a href="#booking">Get Instant Quote <ArrowRight className="size-4" /></a>
              </Button>
              <a
                href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                className="group inline-flex items-center gap-3 text-white transition-colors"
              >
                <span className="grid place-items-center size-11 rounded-full border border-white/25 group-hover:border-[var(--gold)] transition-colors">
                  <Phone className="size-4" />
                </span>
                <span className="text-sm">
                  <span className="block text-[10px] uppercase tracking-[0.24em] text-white/60">24/7 Reservations</span>
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

const faqItems = [
  { q: "How far in advance should I book?", a: "You can book anytime — even minutes ahead — but we recommend 2+ hours for airport pickups to guarantee your preferred vehicle." },
  { q: "Do you track my flight?", a: "Yes. Every airport transfer includes automatic flight tracking, and we adjust pickup times for delays or early arrivals at no extra cost." },
  { q: "Is there a meet & greet at arrivals?", a: "Absolutely. Your driver waits inside the terminal with a name board and helps with your luggage — included as standard." },
  { q: "What if I need to cancel?", a: "Free cancellation up to 24 hours before pickup. Same-day cancellations may incur a small fee — full terms shown at booking." },
  { q: "How do I pay?", a: "Pay securely online by card at booking, or set up a business account for monthly invoicing on corporate travel." },
  { q: "Do you cover the whole UK?", a: "Yes — Edinburgh, London (Heathrow, Gatwick, Stansted, Luton, City), Manchester, Glasgow, Birmingham and 120+ UK destinations." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[var(--navy)]/10 border-y border-[var(--navy)]/10">
      {faqItems.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-xs text-[var(--gold-ink)] tabular-nums">0{i + 1}</span>
                <span className="font-display text-base md:text-lg font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)] transition-colors">
                  {f.q}
                </span>
              </span>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full border transition-all ${
                isOpen
                  ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--gold-foreground)] rotate-0"
                  : "border-[var(--navy)]/20 text-[var(--navy)]"
              }`}>
                {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: isOpen ? 200 : 0, opacity: isOpen ? 1 : 0 }}
            >
              <p className="pb-6 pl-10 pr-14 text-sm text-[var(--navy)]/70 leading-relaxed">
                {f.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
