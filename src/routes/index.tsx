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

      {/* SERVICES */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <SectionHeader eyebrow="Our Services" title="A Complete Airport" titleAccent="Travel Service" subtitle="From airport pickups to multi-day private tours — one trusted standard, every journey." center dark />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                className="group rounded-2xl border border-white/15 bg-white/5 p-7 hover:border-[var(--gold)]/50 hover:-translate-y-1 hover:bg-white/10 transition-all duration-300"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)] text-[var(--gold-foreground)] mb-5">
                  <s.icon className="size-5" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{s.desc}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold)] group-hover:gap-3 transition-all duration-300">
                  Learn more <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-y bg-white">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="Three Steps To A Premium" titleAccent="Ride" subtitle="From quote to driver at your door — built to feel effortless." center />
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-[var(--navy)]/10 bg-white p-8">
                <span className="absolute top-5 right-6 font-display text-6xl font-bold text-[var(--gold)]/15">0{i + 1}</span>
                <div className="relative grid size-14 place-items-center rounded-2xl bg-[var(--gold)]/10 text-[var(--navy)] border border-[var(--gold)]/30">
                  <s.icon className="size-6" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold text-[var(--navy)]">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--navy)]/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <SectionHeader eyebrow="Our Fleet" title="Premium Vehicles," titleAccent="Impeccable Standard" subtitle="Explore our modern, driver-driven fleet available across the UK." center dark />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((f) => (
              <div key={f.name} className="group rounded-2xl border border-white/15 bg-white p-6 hover:border-[var(--gold)]/50 hover:-translate-y-1 transition-all duration-300">
                <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden rounded-xl bg-[var(--navy)]/5">
                  <img
                    src={f.img}
                    srcSet={f.srcSet}
                    sizes="(max-width: 1024px) 45vw, 360px"
                    alt={f.name}
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={750}
                    className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="mt-5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-0.5">
                    <Gem className="size-2.5" /> {f.note}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-[var(--navy)]">{f.name}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-[var(--navy)]/60">
                      <Users className="size-4 text-[var(--gold)]" />
                      <span>Passengers <span className="text-[var(--navy)] font-medium">{f.passengers}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--navy)]/60">
                      <Briefcase className="size-4 text-[var(--gold)]" />
                      <span>Luggage <span className="text-[var(--navy)] font-medium">{f.luggage}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--navy)]/60">
                      <Car className="size-4 text-[var(--gold)]" />
                      <span className="truncate">{f.transmission}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--navy)]/60">
                      <ShieldCheck className="size-4 text-[var(--gold)]" />
                      <span>{f.fuel}</span>
                    </div>
                  </dl>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline" className="rounded-full border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)]">
              <Link to="/fleet">View full fleet <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section-y bg-white">
        <div className="container-x">
          <SectionHeader eyebrow="Included as standard" title="Every Cabslink Ride, By" titleAccent="Default" center />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group flex gap-4 rounded-2xl bg-white border border-[var(--navy)]/10 p-6 hover:border-[var(--gold)]/50 hover:-translate-y-1 transition-all duration-300">
                <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/10 text-[var(--navy)] border border-[var(--gold)]/30 group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="size-5" />
                </div>
                <div className="min-w-0 relative">
                  <h3 className="font-semibold text-[var(--navy)]">{f.title}</h3>
                  <p className="mt-1 text-sm text-[var(--navy)]/60 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section-y navy-scene">
        <div className="container-x">
          <SectionHeader eyebrow="Testimonials" title="What Our Clients" titleAccent="Say" subtitle="Delivering comfort, safety and elegance to every journey." center dark />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="relative rounded-2xl border border-white/15 bg-white/5 p-8 text-center flex flex-col items-center">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 grid size-12 place-items-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                  <Quote className="size-5" />
                </span>
                <div className="flex items-center gap-1 text-[var(--gold)]">
                  {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <blockquote className="mt-5 text-sm leading-relaxed text-white/85 flex-1">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 pt-5 border-t border-white/15 w-full">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-display font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <p className="mt-3 font-semibold text-sm text-white">{t.name}</p>
                  <p className="text-xs text-white/60">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section-y bg-[var(--gold)]">
        <div className="container-x">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--navy)]/70 font-semibold">Ready when you are</p>
            <h3 className="mt-4 font-display text-3xl md:text-5xl font-semibold leading-[1.05] text-[var(--navy)]">
              Your Ride, <span className="text-white">One Tap Away.</span>
            </h3>
            <p className="mt-4 text-[var(--navy)]/70 leading-relaxed max-w-xl mx-auto">
              Book, track and enjoy a seamless driver experience across the UK. Available 24/7 — no surge, no surprises.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild variant="slash">
                <a href="#booking">Book a Ride <ArrowRight className="size-4" /></a>
              </Button>
              <a
                href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                className="group inline-flex items-center gap-3 text-[var(--navy)] hover:text-white transition-colors"
              >
                <span className="grid place-items-center size-11 rounded-full border border-[var(--navy)]/20 group-hover:border-white transition-colors">
                  <Phone className="size-4" />
                </span>
                <span className="text-sm">
                  <span className="block text-[10px] uppercase tracking-[0.24em] text-[var(--navy)]/60">24/7 Reservations</span>
                  <span className="font-medium">{SITE.phoneUK}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
