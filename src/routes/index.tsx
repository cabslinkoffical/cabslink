import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import {
  ArrowRight, Plane, ShieldCheck, CalendarCheck, Phone,
  Briefcase, Users, Award, BadgePoundSterling, Headset, Car, Building2, Gem,
  Route as RouteIcon, CheckCircle2, Sparkles, MessageSquare, CreditCard, Quote,
  Plus, Minus, Clock, Compass, Wallet, Timer, Mail, BadgeCheck, PlaneTakeoff, Trophy
} from "lucide-react";

import svcAirportImg from "@/assets/services/airport.jpg.asset.json";
import svcCorporateImg from "@/assets/services/corporate.jpg.asset.json";
import svcToursImg from "@/assets/services/tours.jpg.asset.json";
import svcSportsImg from "@/assets/services/sports.jpg";
import svcGroupImg from "@/assets/services/group.jpg";


import { SiteLayout } from "@/components/site/SiteLayout";
import { BookingWidget } from "@/components/site/BookingWidget";
import { TrustpilotSection } from "@/components/site/TrustpilotSection";
import { organizationSchema, websiteSchema } from "@/components/seo/schema";
import { DrivingCarBadge } from "@/components/site/DrivingCarBadge";
import { locationsDirectoryQuery } from "@/components/site/LocationsDirectory";


import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { listPublishedTours } from "@/lib/tours.functions";
import { TourCard } from "@/components/site/TourCard";
import { listPublicVehicleClasses } from "@/lib/vehicle-classes.functions";

const publishedToursQuery = queryOptions({
  queryKey: ["published-tours"],
  queryFn: () => listPublishedTours(),
  staleTime: 60_000,
});

import { fleetImageFor } from "@/assets/fleet";

import sclassAsset from "@/assets/fleet/sclass.png.asset.json";
import eclassAsset from "@/assets/fleet/eclass.png.asset.json";
import vclassAsset from "@/assets/fleet/vclass.png.asset.json";
import rangeroverAsset from "@/assets/fleet/rangerover.png.asset.json";
import minibusAsset from "@/assets/fleet/minibus.png.asset.json";
import rollsAsset from "@/assets/fleet/rolls.png.asset.json";
import coachAsset from "@/assets/fleet/coach.png.asset.json";
import coasterAsset from "@/assets/fleet/coaster.png.asset.json";
import { fleetThumbnailUrl, asFleetAsset } from "@/lib/fleet-image";

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
  { key: "vclass", name: "Mercedes V-Class", tag: "First-class · 7 seats", img: vclassAsset.url, srcSet: asFleetAsset(vclassAsset).srcSet, thumbnail: fleetThumbnailUrl(vclassAsset), seats: 7 },
  { key: "sclass", name: "Mercedes S-Class", tag: "Flagship saloon · 3 seats", img: sclassAsset.url, srcSet: asFleetAsset(sclassAsset).srcSet, thumbnail: fleetThumbnailUrl(sclassAsset), seats: 3 },
  { key: "eclass", name: "Mercedes E-Class", tag: "Executive · 3 seats", img: eclassAsset.url, srcSet: asFleetAsset(eclassAsset).srcSet, thumbnail: fleetThumbnailUrl(eclassAsset), seats: 3 },
  { key: "rangerover", name: "Range Rover", tag: "Luxury SUV · 4 seats", img: rangeroverAsset.url, srcSet: asFleetAsset(rangeroverAsset).srcSet, thumbnail: fleetThumbnailUrl(rangeroverAsset), seats: 4 },
  { key: "rolls", name: "Rolls-Royce Bentley", tag: "Ultra-luxury · 3 seats", img: rollsAsset.url, srcSet: asFleetAsset(rollsAsset).srcSet, thumbnail: fleetThumbnailUrl(rollsAsset), seats: 3 },
  { key: "minibus", name: "Executive Minibus", tag: "Groups · 16 seats", img: minibusAsset.url, srcSet: asFleetAsset(minibusAsset).srcSet, thumbnail: fleetThumbnailUrl(minibusAsset), seats: 16 },
  { key: "coaster", name: "Coaster Bus", tag: "Mid-group · 24 seats", img: coasterAsset.url, srcSet: asFleetAsset(coasterAsset).srcSet, thumbnail: fleetThumbnailUrl(coasterAsset), seats: 24 },
  { key: "coach", name: "Coach Bus", tag: "Large group · 55 seats", img: coachAsset.url, srcSet: asFleetAsset(coachAsset).srcSet, thumbnail: fleetThumbnailUrl(coachAsset), seats: 55 },
];

const HERO_VEHICLE_SIZES = "(max-width: 1024px) 92vw, 600px";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { name: "description", content: "Fixed-fare UK airport transfers, private tours and executive travel with Cabslink. Flight tracking, meet & greet and 24/7 dispatch." },
      { name: "keywords", content: "UK airport transfers, luxury travel UK, private driver, Edinburgh airport taxi, Heathrow transfer, Mercedes V-Class hire, executive car service, Scotland tours" },
      { property: "og:title", content: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { property: "og:description", content: "Plan premium UK journeys — fixed-fare transfers, private tours, executive travel. Flight tracking, meet & greet, Mercedes fleet." },
      { property: "og:url", content: "https://cabslink.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://cabslink.com/" },
      {
        rel: "preload",
        as: "image",
        href: vclassAsset.url,
        imageSrcSet: asFleetAsset(vclassAsset).srcSet,
        imageSizes: HERO_VEHICLE_SIZES,
        fetchPriority: "high",
      },
    ],
    // Sitewide identity graph. Deliberately no Review/AggregateRating markup —
    // the Trustpilot score is third-party and must not be emitted as our own
    // review data.
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            organizationSchema(),
            websiteSchema(),
            {
              "@type": "FAQPage",
              mainEntity: faqItems.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],

  }),
  // Prefetch on the server so the vehicle-class cards are present in the very
  // first render instead of popping in after hydration.
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["public-vehicle-classes"],
        queryFn: () => listPublicVehicleClasses(),
        staleTime: 5 * 60_000,
      }),
      context.queryClient.ensureQueryData(locationsDirectoryQuery),
      context.queryClient.ensureQueryData(publishedToursQuery),
    ]);
  },
  component: HomePage,
});


const trustStats = [
  { icon: ShieldCheck, k: "Licensed & insured", v: "Fully vetted UK drivers" },
  { icon: Clock, k: "24/7 availability", v: "Day, night and holidays" },
  { icon: BadgeCheck, k: "Fixed pricing", v: "No hidden surcharges" },
  { icon: PlaneTakeoff, k: "Flight tracking", v: "Free waiting on delays" },
];





const services = [
  {
    icon: Plane,
    eyebrow: "Most booked",
    title: "Airport & travel hub transfers",
    desc: "Airports, rail terminals and cruise ports with tracked schedules, free waiting time and fixed all-in fares.",
    img: svcAirportImg.url,
    to: "/airport-transfers",
    chips: ["Live flight tracking", "Meet & greet", "Fixed pricing"],
    count: 6,
  },
  {
    icon: Building2,
    eyebrow: "Business",
    title: "Corporate & executive travel",
    desc: "Account-managed business travel with monthly invoicing and cost centres.",
    img: svcCorporateImg.url,
    to: "/corporate-travel",
    chips: ["Invoiced accounts", "Priority 24/7"],
    count: 6,
  },
  {
    icon: Gem,
    eyebrow: "Signature",
    title: "Private tours & days out",
    desc: "Driver-led days across Scotland and the UK — castles, distilleries and coastlines.",
    img: svcToursImg.url,
    to: "/tours",
    chips: ["Full-day itineraries", "Local drivers"],
    count: 6,
  },
  {
    icon: Trophy,
    eyebrow: "Sporting events",
    title: "Golf, football & sports travel",
    desc: "Transport for golfers, fans, squads and hospitality guests across the UK.",
    img: svcSportsImg,
    to: "/golf-transfers",
    chips: ["Clubs & kit space", "Match-day timing"],
    count: 6,
  },
  {
    icon: Users,
    eyebrow: "Specialist",
    title: "Group, accessible & care travel",
    desc: "From 55-seat coaches to single hospital appointments, handled with the same care.",
    img: svcGroupImg,
    to: "/group-transfers",
    chips: ["5–55 passengers", "Ramp-equipped"],
    count: 6,
  },
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
  { icon: Award, title: "Professional Service", desc: "A calm, consistent standard on every single journey." },
];






function HomePage() {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const { data: publishedTours = [] } = useSuspenseQuery(publishedToursQuery);
  const popularTours = useMemo(() => {
    const featured = publishedTours.filter((t) => t.featured);
    return (featured.length >= 10 ? featured : publishedTours).slice(0, 12);
  }, [publishedTours]);


  // Same key the route loader primes → hero renders the real classes on the
  // first paint instead of flashing the static fallback vehicles.
  const { data: vehicleClasses = [] } = useSuspenseQuery({
    queryKey: ["public-vehicle-classes"],
    queryFn: () => listPublicVehicleClasses(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const heroVehicles = useMemo<HeroVehicle[]>(() => {
    const mapped = vehicleClasses
      .filter((c) => c.slug !== "unclassified")
      // Featured classes lead the carousel, then display order.
      .slice()
      .sort((a, b) =>
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
        (a.display_order ?? 0) - (b.display_order ?? 0),
      )
      .map((c) => {
        const fb = fallbackHeroVehicles.find((f) => f.key === c.slug);
        const img = fleetImageFor(c.slug, c.hero_image) || fb?.img;
        if (!img) return null;
        const useFb = img === fb?.img;
        return {
          key: c.id,
          name: c.name,
          tag: `${c.badge ?? "Vehicle class"} · ${c.passengers ?? 0} seats`,
          img,
          srcSet: useFb ? fb?.srcSet : undefined,
          seats: c.passengers ?? 0,
        } as HeroVehicle;
      })
      .filter(Boolean)
      // Keep the rotation (and the dot row) readable.
      .slice(0, 8) as HeroVehicle[];
    return mapped.length > 0 ? mapped : fallbackHeroVehicles;
  }, [vehicleClasses]);


  useEffect(() => {
    if (paused || heroVehicles.length < 2) return;
    const id = setInterval(() => {
      setDir(1);
      setActive((i) => (i + 1) % heroVehicles.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, heroVehicles.length]);

  useEffect(() => {
    setActive((i) => (i >= heroVehicles.length ? 0 : i));
  }, [heroVehicles.length]);

  const go = (next: number) => {
    if (heroVehicles.length === 0) return;
    setDir(next >= active ? 1 : -1);
    setActive(((next % heroVehicles.length) + heroVehicles.length) % heroVehicles.length);
  };

  const current = heroVehicles[Math.min(active, heroVehicles.length - 1)];


  return (
    <SiteLayout>
      {/* HERO — untouched blue background */}
      <section className="relative z-20 overflow-visible navy-scene">
        <div className="container-x relative pt-5 md:pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

            <div className="lg:col-span-6 relative z-10 min-w-0 w-full">
              <div
                className="inline-block max-w-full opacity-0"
                style={{ animation: "fadeInUp 700ms cubic-bezier(.2,.7,.2,1) 100ms forwards" }}
              >
                <DrivingCarBadge label="UK's Premium Travel Platform" />
              </div>


              <h1
                className="mt-4 font-display font-bold text-white leading-[0.95] tracking-[-0.03em] text-[2rem] sm:text-5xl lg:text-[3.2rem] xl:text-[3.8rem] opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 200ms forwards" }}
              >
                Plan your{" "}
                <span className="text-[var(--gold)]">journey.</span>
              </h1>

              <p
                className="mt-4 max-w-xl text-sm md:text-base text-white/75 opacity-0"
                style={{ animation: "fadeInUp 800ms cubic-bezier(.2,.7,.2,1) 380ms forwards" }}
              >
                Fixed-fare Mercedes-Benz transfers, private tours and executive travel across the UK. Flight tracked, meet &amp; greet, 24/7 dispatch — the calm way to travel.
              </p>


            </div>

            {/* Mobile/tablet: booking form before vehicle */}
            <div id="booking-mobile" className="lg:hidden scroll-mt-24">
              <BookingWidget idPrefix="mwidget" />
            </div>

            <div className="lg:col-span-6 relative">

              {/* Luminous studio stage */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 -inset-y-16 z-0"
              >
                <div className="absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.06] blur-[90px]" />
              </div>

              <div
                className="relative z-10 opacity-0"
                style={{ animation: "fadeInUp 900ms cubic-bezier(.2,.7,.2,1) 300ms forwards" }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
                  <span
                    className="font-display font-extrabold leading-none tracking-[-0.06em] text-[16vw] lg:text-[13vw]"
                    style={{
                      color: "transparent",
                      WebkitTextStroke: "1px color-mix(in oklab, #ffffff 7%, transparent)",
                      backgroundColor: "transparent",
                    }}
                  >
                    CABSLINK
                  </span>
                </div>

                {/* Ground plane + contact shadow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/[0.07] to-transparent blur-xl"
                />
                <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />
                <div aria-hidden className="pointer-events-none absolute inset-x-16 bottom-1 h-7 rounded-[50%] bg-[color-mix(in_oklab,#000000_55%,transparent)] blur-2xl" />

                <div className="group relative aspect-[16/10] lg:aspect-[16/8.5] lg:max-h-[230px] xl:max-h-[270px]">
                  {current && (
                    <>
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
                        className="absolute inset-0 m-auto w-[92%] h-full object-contain drop-shadow-[0_38px_50px_rgba(0,0,0,0.45)] transition-transform duration-700 group-hover:scale-[1.04]"
                        style={{
                          animation: `${dir === 1 ? "vehicleSlideInR" : "vehicleSlideInL"} 850ms cubic-bezier(.2,.7,.2,1) both, float-y 6s ease-in-out 1s infinite`,
                        }}
                      />
                      {/* Mirrored floor reflection */}
                      <img
                        aria-hidden
                        src={current.img}
                        srcSet={current.srcSet}
                        sizes={HERO_VEHICLE_SIZES}
                        alt=""
                        decoding="async"
                        className="pointer-events-none absolute inset-x-0 top-[86%] m-auto w-[92%] h-[45%] object-contain object-top opacity-[0.13] blur-[3px] [transform:scaleY(-1)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.8),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.8),transparent)]"
                      />
                    </>
                  )}
                </div>

                {/* Vehicle label + carousel dots */}
                {current && (
                  <div className="relative z-10 mt-6 flex flex-col items-center gap-3 lg:mt-8">
                    <div className="text-center">
                      <p className="font-display text-base font-semibold text-white sm:text-lg">{current.name}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">{current.tag}</p>
                    </div>
                    {heroVehicles.length > 1 && (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {heroVehicles.map((v, i) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => go(i)}
                            aria-label={`Show ${v.name}`}
                            aria-current={i === active}
                            className={`h-1.5 rounded-full transition-all ${
                              i === active
                                ? "w-7 bg-[var(--gold)]"
                                : "w-3 bg-white/25 hover:bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>


            </div>

          </div>

          {/* Booking form inside hero (desktop) */}
          <div id="booking" className="relative z-50 hidden lg:block mt-4 pb-2 scroll-mt-24">
            <BookingWidget />
          </div>

        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-[var(--navy)] border-y border-white/10">
        <div className="container-x py-5 sm:py-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-x-6 sm:gap-y-6">
          {trustStats.map((s) => (
            <div
              key={s.k}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center sm:flex-row sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-left min-w-0"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--gold)]/40 text-[var(--gold)] sm:size-10">
                <s.icon className="size-4 sm:size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight text-white sm:text-sm sm:truncate">{s.k}</span>
                <span className="block text-[11px] leading-tight text-white/60 sm:text-xs sm:truncate">{s.v}</span>
              </span>
            </div>
          ))}
        </div>
      </section>



      {/* SERVICES BENTO */}
      <section className="relative overflow-hidden section-y bg-[var(--surface-2)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(55% 60% at 100% 0%, var(--gold) 0%, transparent 70%), radial-gradient(45% 55% at 0% 100%, var(--navy) 0%, transparent 70%)",
          }}
        />
        <div className="container-x relative">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-[var(--gold)]" />
                <p className="eyebrow-gold text-[11px]">Our Services</p>
              </div>
              <h2 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.02] tracking-[-0.02em] text-[var(--navy)]">
                A complete travel <br className="hidden md:block" />
                <span className="text-[var(--gold-ink)]">platform.</span>
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-[var(--navy)]/70 leading-relaxed text-base md:text-lg">
                From airport pickups to multi-day private tours — one trusted standard,
                every journey. Every ride includes flight tracking, meet &amp; greet
                and a professional Mercedes fleet.
              </p>
              <Link
                to="/services"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--navy)] transition-all hover:gap-3 hover:text-[var(--gold-ink)]"
              >
                Browse all services <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-[var(--navy)]/8 shadow-raised transition-all duration-300 hover:-translate-y-1 hover:shadow-raised-hover hover:ring-[var(--gold)]/45"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.title}
                    width={800}
                    height={520}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/80 via-[var(--navy)]/20 to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full bg-[var(--gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--navy)]">
                    {s.eyebrow}
                  </span>
                  <span className="absolute bottom-4 left-5 grid size-11 place-items-center rounded-xl bg-white/12 text-[var(--gold)] backdrop-blur-sm">
                    <s.icon className="size-5" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-lg font-semibold leading-snug text-[var(--navy)]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/65 line-clamp-2">
                    {s.desc}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {s.chips.slice(0, 3).map((c) => (
                      <li
                        key={c}
                        className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--gold-ink)]"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>

                  <span className="mt-auto pt-5">
                    <span className="block h-px w-full bg-[var(--navy)]/8" />
                    <span className="mt-4 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--navy)] transition-all group-hover:gap-3 group-hover:text-[var(--gold-ink)]">
                        Open service <ArrowRight className="size-4" />
                      </span>
                      <span className="text-xs font-semibold text-[var(--navy)]/45">
                        {s.count} sub-services
                      </span>
                    </span>
                  </span>
                </div>
              </Link>
            ))}

            {/* Directory tile */}
            <Link
              to="/services"
              className="group relative flex h-full min-h-[340px] flex-col justify-between overflow-hidden rounded-3xl border border-dashed border-[var(--navy)]/20 bg-white/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold)] hover:bg-white sm:min-h-0"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--gold)]">
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span>
                <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-[var(--navy)]">
                  Full service directory
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/65">
                  Cruise ports, hospitals, universities, sports, minibus and coach hire — see every
                  journey we cover.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold-ink)]">
                  View all services <ArrowRight className="size-4" />
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>





      {/* VEHICLE CLASSES */}
      <FleetClassesSection />

      {/* HOW IT WORKS */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <span aria-hidden className="h-px w-8 bg-[var(--gold)]" />
              <p className="eyebrow-gold text-[11px]">How It Works</p>
              <span aria-hidden className="h-px w-8 bg-[var(--gold)]" />
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Three steps to a <span className="text-[var(--gold-ink)]">premium journey.</span>
            </h2>
          </div>

          <div className="mt-16 md:mt-20 relative">
            <div
              aria-hidden
              className="hidden md:block absolute top-12 left-0 right-0 mx-auto h-[2px] w-[80%] bg-gradient-to-r from-[var(--navy)]/10 via-[var(--gold)] to-[var(--navy)]/10"
            />
            <div className="relative grid gap-12 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="group flex flex-col items-center text-center">
                  <div className="relative mb-8 md:mb-10">
                    <div
                      className={`grid size-24 place-items-center rounded-2xl bg-[var(--navy)] text-[var(--gold)] shadow-dark-raised transition-transform duration-500 group-hover:rotate-0 ${
                        i === 1 ? "-rotate-3" : "rotate-3"
                      }`}
                    >
                      <s.icon className="size-10" strokeWidth={1.5} />
                    </div>
                    <span className="absolute -top-3 -right-3 grid size-10 place-items-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] font-display text-lg font-bold border-4 border-[var(--surface-2)] shadow-lg">
                      {i + 1}
                    </span>
                  </div>
                  <div className="px-4">
                    <h3 className="font-display text-xl font-bold text-[var(--navy)] transition-colors group-hover:text-[var(--gold-ink)]">
                      {s.title}
                    </h3>
                    <p className="mt-3 max-w-[260px] mx-auto text-sm leading-relaxed text-[var(--navy)]/70">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* POPULAR TOURS */}
      {popularTours.length > 0 && (
      <section className="section-y bg-white">

        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="eyebrow-gold text-[11px]">— Popular Tours</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05] tracking-[-0.02em]">
                Curated journeys, <span className="text-[var(--gold-ink)]">crafted your way.</span>
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[var(--navy)]/20 text-[var(--navy)] hover:border-[var(--gold)] hover:text-[var(--gold-ink)] self-start md:self-auto">
              <Link to="/tours">Explore all tours <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>

        {/* Smooth infinite marquee of featured tours */}
        <div className="tour-marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="tour-marquee-track flex w-max items-stretch gap-6">
            {[...popularTours, ...popularTours].map((t, i) => (
              <div key={`${t.slug}-${i}`} className="w-[300px] shrink-0 sm:w-[330px]">
                <TourCard tour={t} />
              </div>
            ))}
          </div>
        </div>

      </section>
      )}

      {/* WHY CHOOSE */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <p className="eyebrow-gold text-[11px]">— Why Cabslink</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              The details that <span className="text-[var(--gold-ink)]">make the difference.</span>
            </h2>
            <p className="mt-5 text-[var(--navy)]/65 leading-relaxed">
              Every journey is handled by vetted drivers, tracked flights and fixed
              pricing — so the only thing you think about is where you're going.
            </p>
          </div>

          {/* Bento feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Trust card — spans 2 rows on large screens */}
            <div className="sm:col-span-2 lg:row-span-2 rounded-[28px] bg-[var(--navy)] text-white p-7 md:p-8 shadow-dark-raised flex flex-col justify-between relative overflow-hidden group">
              <div aria-hidden className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[var(--gold)]/10 blur-3xl group-hover:bg-[var(--gold)]/15 transition-colors duration-700" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[var(--gold)]">
                  <ShieldCheck className="size-5" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Licensed &amp; insured</span>
                </div>
                <p className="mt-5 font-display text-3xl md:text-4xl font-semibold leading-tight">Fixed quotes, vetted UK drivers</p>
                <p className="mt-3 text-sm leading-relaxed text-white/70 max-w-sm">
                  Every journey is quoted up front, driven by a licensed private-hire driver and monitored against your flight.
                </p>

              </div>
              <div className="relative mt-8">
                <Button asChild variant="gold" className="rounded-lg">
                  <Link to="/book" search={{ q: "" }}>Get an instant quote <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            </div>

            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-[24px] bg-white border border-[var(--navy)]/8 p-6 md:p-7 shadow-raised transition-all duration-300 hover:-translate-y-1 hover:shadow-raised-hover hover:border-[var(--gold)]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="shrink-0 grid size-12 place-items-center rounded-2xl bg-[var(--gold)] text-[var(--gold-foreground)] transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="size-5" />
                  </div>
                  <span className="font-display text-[13px] font-bold text-[var(--navy)]/15 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-[var(--navy)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS — verified Trustpilot proof only */}
      <TrustpilotSection />


      {/* Coverage + airports are merged into one section above */}


      {/* CORPORATE TRAVEL */}
      <section className="section-y bg-[var(--surface-2)]">
        <div className="container-x grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <p className="eyebrow-gold text-[11px]">— Corporate Travel</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
              Business travel, <span className="text-[var(--gold-ink)]">handled.</span>
            </h2>
            <p className="mt-5 text-[var(--navy)]/65 leading-relaxed">
              Dedicated account management, monthly consolidated invoicing and priority
              dispatch — one executive travel programme for the whole company.
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
                <Link to="/corporate-travel">How corporate accounts work</Link>
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
                <div className="font-display text-4xl md:text-5xl font-bold text-[var(--gold)] leading-tight tracking-[-0.02em]">
                  One account.<br />Every journey.
                </div>
                <p className="mt-4 text-white/75 max-w-sm">
                  Open a Cabslink corporate account and book on invoice — single executive
                  transfers, airport runs and client visits, all on one monthly statement.
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

      {/* DRIVE WITH US — driver / fleet partner recruitment */}
      <section className="section-y bg-white">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-[28px] navy-scene p-8 md:p-12">
            <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-[var(--gold)]/10 blur-3xl" />
            <div className="relative grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[var(--gold)]">— Drive With Cabslink</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-white leading-[1.05]">
                  Are you a driver or <span className="text-[var(--gold)]">fleet partner?</span>
                </h2>
                <p className="mt-5 text-white/75 leading-relaxed max-w-xl">
                  Join our UK network and get steady premium work from a respected brand —
                  vetted passengers, corporate accounts and real 24/7 dispatch support.
                  Apply in two minutes and our team will be in touch within 24 hours.
                </p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 max-w-xl">
                  {[
                    { i: Car, t: "Steady premium work" },
                    { i: Users, t: "Vetted passengers" },
                    { i: Briefcase, t: "Corporate & event jobs" },
                    { i: Headset, t: "24/7 driver support" },
                  ].map((b) => (
                    <li key={b.t} className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)]">
                        <b.i className="size-4" />
                      </span>
                      <span className="text-sm font-semibold text-white">{b.t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-[24px] bg-white/[0.06] border border-white/10 p-7 md:p-8 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[var(--gold)]">
                    <BadgeCheck className="size-5" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Now onboarding</span>
                  </div>
                  <p className="mt-4 font-display text-2xl font-semibold text-white leading-tight">
                    Apply to join as a driver or licensed operator
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-white/70">
                    {["Valid UK PCO / private hire licence", "Modern, clean vehicle", "Right to work in the UK"].map((r) => (
                      <li key={r} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[var(--gold)]" /> {r}</li>
                    ))}
                  </ul>
                  <Button asChild variant="gold" className="mt-7 w-full rounded-full">
                    <Link to="/drive-with-us">Apply to drive with us <ArrowRight className="size-4" /></Link>
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-white/50">Takes ~2 minutes · Reply within 24 hours</p>
                </div>
              </div>
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
              Answers, <br /><span className="text-[var(--gold-ink)]">upfront.</span>
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

      {/* Closing CTA is rendered by SiteLayout (FinalCta) */}







    </SiteLayout>
  );
}

const faqItems = [
  { q: "How far in advance should I book?", a: "You can book anytime — even minutes ahead — but we recommend 2+ hours for airport pickups to guarantee your preferred vehicle." },
  { q: "Do you track my flight?", a: "Yes. Every airport transfer includes automatic flight tracking, and we adjust pickup times for delays or early arrivals at no extra cost." },
  { q: "Is there a meet & greet at arrivals?", a: "Absolutely. Your driver waits inside the terminal with a name board and helps with your luggage — included as standard." },
  { q: "What if I need to cancel?", a: "Tell us as early as you can and we'll cancel free of charge. Late cancellations or no-shows may be charged for the reserved driver time — see our booking & cancellation policy." },
  { q: "How do I pay?", a: "Nothing is charged online. You choose a payment method when booking — card, bank transfer or a business account — and our team confirms availability and payment arrangements with you directly." },

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

function FleetClassesSection() {
  // Suspense read: the route loader primes this key, so SSR and the client
  // render the same cards (no hydration mismatch, no skeleton flash).
  const { data: classes = [] } = useSuspenseQuery({
    queryKey: ["public-vehicle-classes"],
    queryFn: () => listPublicVehicleClasses(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const visible = classes.filter((c) => c.slug !== "unclassified");
  // Duplicate the list so the marquee track loops seamlessly left → right.
  const track = visible.length > 0 ? [...visible, ...visible] : [];

  return (
    <section className="section-y navy-scene">
      <div className="container-x">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-[var(--gold)]">— Vehicle Classes</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-white leading-[1.05]">
              Book by class,<br />
              <span className="text-[var(--gold)]">travel the standard.</span>
            </h2>
            <p className="mt-4 text-white/70 text-sm max-w-xl">
              You pick a vehicle class — Executive, Luxury, Premium MPV or more. Our dispatch team allocates the exact model on the day, always from your booked class or a complimentary upgrade.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-transparent border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] hover:border-[var(--gold)] self-start md:self-auto">
            <Link to="/fleet">View all classes <ArrowRight className="size-4" /></Link>
          </Button>
        </div>

      </div>

      {/* Smooth infinite marquee of white vehicle-class cards */}
      {visible.length === 0 ? (
        <div className="container-x mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/10 animate-pulse h-[420px]" />
          ))}
        </div>
      ) : (
        <div className="class-marquee mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="class-marquee-track flex w-max items-stretch gap-5">
            {track.map((k, i) => (
              <article
                key={`${k.id}-${i}`}
                className="group flex h-[540px] w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_22px_46px_-20px_rgba(0,0,0,0.18)] sm:w-[300px]"
              >


                {/* Image stage */}
                <div className="relative flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden bg-[var(--surface-2)]">
                  {(() => {
                    const img = fleetImageFor(k.slug, k.hero_image);
                    return img ? (
                      <img
                        src={img}
                        alt={k.name}
                        loading="lazy"
                        decoding="async"
                        className="relative z-10 max-h-[78%] max-w-[84%] w-auto h-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <span className="text-xs text-[var(--navy)]/50">Image coming soon</span>
                    );
                  })()}

                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {k.badge ? (
                      <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                        {k.badge}
                      </span>
                    ) : k.featured ? (
                      <span className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                        Featured
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 min-h-0 flex-col gap-3 p-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-ink)]">Vehicle Class</p>
                    <h3 className="mt-1 line-clamp-1 font-display text-xl font-semibold leading-tight text-[var(--navy)]">{k.name}</h3>
                    <p className="mt-2 h-10 text-sm leading-relaxed text-[var(--navy)]/70 line-clamp-2">
                      {k.short_description || k.long_description}
                    </p>
                  </div>

                  {/* Capacity */}
                  <div className="flex items-center gap-3 text-[var(--navy)]/80">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Users className="size-3.5 text-[var(--gold-ink)]" /> {k.passengers} pax
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Briefcase className="size-3.5 text-[var(--gold-ink)]" /> {k.large_luggage} bags
                    </span>
                  </div>

                  {/* Models */}
                  <div className="flex h-7 gap-1.5 overflow-hidden">
                    {k.models.slice(0, 2).map((m) => (
                      <span
                        key={m.id}
                        className="truncate rounded-md border border-[var(--navy)]/10 bg-[var(--navy)]/5 px-2 py-1 text-[11px] font-medium text-[var(--navy)]/80"
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>


                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-[var(--navy)]/10">
                    <Link
                      to="/fleet"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--navy)]/80 hover:text-[var(--gold-ink)] transition-colors"
                    >
                      View class
                    </Link>
                    <Button asChild size="sm" variant="gold" className="rounded-full px-5">
                      <Link to="/book" search={{ q: "" }}>
                        {k.quote_on_request ? "Request quote" : "Get quote"} <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>

  );
}



