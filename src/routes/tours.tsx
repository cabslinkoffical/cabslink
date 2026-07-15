import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Plane, ArrowRight, Star, Users, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { TourBookingDialog } from "@/components/site/TourBookingDialog";
import edinburghImg from "@/assets/edinburgh.jpg";
import rosslynImg from "@/assets/tours/rosslyn.jpg";
import stirlingImg from "@/assets/tours/stirling.jpg";
import lochLomondImg from "@/assets/tours/lochlomond.jpg";
import stAndrewsImg from "@/assets/tours/standrews.jpg";
import glencoeImg from "@/assets/tours/glencoe.jpg";
import lochNessImg from "@/assets/tours/lochness.jpg";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "Scotland Private Tours from Edinburgh Airport — Cabslink" },
      { name: "description", content: "Private chauffeur tours from Edinburgh Airport and other UK airports. Rosslyn Chapel, Stirling, Loch Lomond, St Andrews, Glencoe, Loch Ness — famous stops included, transparent per-mile pricing." },
      { property: "og:title", content: "Private UK Chauffeur Tours — Cabslink" },
      { property: "og:description", content: "Curated tours from Edinburgh, Glasgow, Manchester and London airports. See Scotland's icons with a private chauffeur." },
      { property: "og:url", content: "/tours" },
    ],
    links: [{ rel: "canonical", href: "/tours" }],
  }),
  component: ToursPage,
});

type Stop = { name: string; time: string; blurb: string };
type Tour = {
  slug: string;
  name: string;
  from: string;
  to: string;
  duration: string;
  distance: string;
  fromPrice: string;
  image: string;
  tagline: string;
  highlights: string[];
  stops: Stop[];
  popular?: boolean;
};

const airports = [
  {
    code: "EDI",
    name: "Edinburgh Airport",
    tagline: "Our home airport — the widest range of Scottish tours.",
    tours: [
      {
        slug: "edi-rosslyn-stirling",
        name: "Rosslyn Chapel & Stirling Castle",
        from: "Edinburgh Airport",
        to: "Edinburgh Airport",
        duration: "8 hours",
        distance: "≈ 95 mi",
        fromPrice: "from £320",
        image: rosslynImg,
        tagline: "Templar mystery meets Braveheart country in one relaxed day.",
        highlights: ["Private chauffeur", "Entry stops on request", "Return to airport or hotel"],
        popular: true,
        stops: [
          { name: "Rosslyn Chapel", time: "1h 30m", blurb: "The carved 15th-century chapel made famous by The Da Vinci Code." },
          { name: "Linlithgow Palace", time: "1h", blurb: "Birthplace of Mary Queen of Scots on a peaceful loch." },
          { name: "Stirling Castle", time: "2h", blurb: "One of Scotland's grandest castles overlooking the Wallace Monument." },
          { name: "Lunch in Stirling Old Town", time: "1h", blurb: "Chauffeur recommendation, or your choice." },
        ],
      },
      {
        slug: "edi-loch-lomond-trossachs",
        name: "Loch Lomond & The Trossachs",
        from: "Edinburgh Airport",
        to: "Edinburgh Airport",
        duration: "9 hours",
        distance: "≈ 160 mi",
        fromPrice: "from £395",
        image: lochLomondImg,
        tagline: "Scotland's first national park at your own pace.",
        highlights: ["National park drive", "Photo stops", "Loch-side lunch"],
        stops: [
          { name: "Falkirk Wheel", time: "45m", blurb: "The world's only rotating boat lift." },
          { name: "The Kelpies", time: "30m", blurb: "Two 30-metre steel horse heads — Scotland's newest icon." },
          { name: "Luss Village", time: "1h", blurb: "Picture-postcard village on the west shore of Loch Lomond." },
          { name: "Balloch & Loch Cruise (optional)", time: "1h 30m", blurb: "Optional short cruise, chauffeur waits at the pier." },
        ],
      },
      {
        slug: "edi-st-andrews-fife",
        name: "St Andrews & the Fife Coast",
        from: "Edinburgh Airport",
        to: "Edinburgh Airport",
        duration: "8 hours",
        distance: "≈ 110 mi",
        fromPrice: "from £345",
        image: stAndrewsImg,
        tagline: "Home of golf, cathedral ruins, and East Neuk fishing villages.",
        highlights: ["Old Course photo stop", "Cathedral & castle", "Coastal drive"],
        stops: [
          { name: "Forth Bridges viewpoint", time: "20m", blurb: "Three iconic bridges across the Firth of Forth." },
          { name: "St Andrews Old Course", time: "45m", blurb: "The home of golf — walk the 18th and Swilcan Bridge." },
          { name: "St Andrews Cathedral & Castle", time: "1h 15m", blurb: "Medieval ruins on the cliff." },
          { name: "Anstruther fishing village", time: "1h", blurb: "Award-winning fish & chips by the harbour." },
        ],
      },
      {
        slug: "edi-highlands-loch-ness",
        name: "Highlands, Glencoe & Loch Ness",
        from: "Edinburgh Airport",
        to: "Edinburgh Airport",
        duration: "12 hours",
        distance: "≈ 320 mi",
        fromPrice: "from £695",
        image: glencoeImg,
        tagline: "The full Highland day — Glencoe, Fort William, Loch Ness.",
        highlights: ["Full-day Highland loop", "Multiple photo stops", "Urquhart Castle & Loch Ness"],
        stops: [
          { name: "Stirling Castle drive-by", time: "20m", blurb: "See the castle above the plains." },
          { name: "Glencoe Valley", time: "1h", blurb: "Scotland's most cinematic glen." },
          { name: "Fort William & Ben Nevis viewpoint", time: "45m", blurb: "Britain's highest peak, weather permitting." },
          { name: "Loch Ness — Urquhart Castle", time: "1h 15m", blurb: "The most famous castle on the loch." },
          { name: "Pitlochry stop on return", time: "30m", blurb: "Highland town for tea and tartan." },
        ],
      },
      {
        slug: "edi-edinburgh-city-half-day",
        name: "Edinburgh City — Half Day",
        from: "Edinburgh Airport",
        to: "Edinburgh (hotel or airport)",
        duration: "4 hours",
        distance: "≈ 25 mi",
        fromPrice: "from £185",
        image: edinburghImg,
        tagline: "Castle, Royal Mile and Arthur's Seat with a knowledgeable chauffeur.",
        highlights: ["Ideal on arrival day", "Luggage stays in the car", "Drop at your hotel"],
        stops: [
          { name: "Edinburgh Castle", time: "1h 15m", blurb: "The Crown Jewels and Mons Meg." },
          { name: "Royal Mile & St Giles'", time: "45m", blurb: "The heart of Old Town." },
          { name: "Holyrood Palace", time: "45m", blurb: "The King's official Scottish residence." },
          { name: "Arthur's Seat viewpoint", time: "30m", blurb: "Panorama over the whole city." },
        ],
      },
    ] as Tour[],
  },
  {
    code: "GLA",
    name: "Glasgow Airport",
    tagline: "Perfect gateway for Loch Lomond and the West Highlands.",
    tours: [
      {
        slug: "gla-loch-lomond-oban",
        name: "Loch Lomond & Oban Seafood Day",
        from: "Glasgow Airport",
        to: "Glasgow Airport",
        duration: "10 hours",
        distance: "≈ 200 mi",
        fromPrice: "from £445",
        image: lochLomondImg,
        tagline: "Loch Lomond, Inveraray Castle and fresh seafood on the west coast.",
        highlights: ["West coast drive", "Castle stop", "Harbour-side lunch"],
        stops: [
          { name: "Luss village", time: "45m", blurb: "Cottage-lined loch-side village." },
          { name: "Inveraray Castle", time: "1h 15m", blurb: "Seat of the Duke of Argyll." },
          { name: "Oban harbour lunch", time: "1h 30m", blurb: "Seafood capital of Scotland." },
          { name: "Kilchurn Castle photo stop", time: "20m", blurb: "The most photographed ruin in Scotland." },
        ],
      },
    ] as Tour[],
  },
  {
    code: "LHR",
    name: "London Heathrow",
    tagline: "Southern England icons with door-to-door chauffeur service.",
    tours: [
      {
        slug: "lhr-cotswolds-bath",
        name: "Cotswolds & Bath",
        from: "London Heathrow",
        to: "London Heathrow",
        duration: "10 hours",
        distance: "≈ 220 mi",
        fromPrice: "from £495",
        image: edinburghImg,
        tagline: "Honey-stone villages and Roman Bath in a single day.",
        highlights: ["Countryside drive", "Bath Roman Baths", "Village lunch"],
        stops: [
          { name: "Bibury (Arlington Row)", time: "45m", blurb: "William Morris's 'most beautiful village in England'." },
          { name: "Bourton-on-the-Water", time: "1h", blurb: "The Venice of the Cotswolds." },
          { name: "Bath — Roman Baths & Abbey", time: "2h", blurb: "UNESCO city with 2,000 years of history." },
        ],
      },
    ] as Tour[],
  },
  {
    code: "MAN",
    name: "Manchester Airport",
    tagline: "Lake District, Yorkshire Dales and the North.",
    tours: [
      {
        slug: "man-lake-district",
        name: "Lake District Grand Tour",
        from: "Manchester Airport",
        to: "Manchester Airport",
        duration: "9 hours",
        distance: "≈ 190 mi",
        fromPrice: "from £425",
        image: lochNessImg,
        tagline: "Windermere, Ambleside and a scenic pass drive.",
        highlights: ["Lakeside drive", "Wordsworth country", "Kirkstone Pass"],
        stops: [
          { name: "Windermere", time: "1h", blurb: "England's largest lake." },
          { name: "Ambleside", time: "45m", blurb: "Lakeland stone village for lunch." },
          { name: "Grasmere & Dove Cottage", time: "1h", blurb: "Home of William Wordsworth." },
          { name: "Kirkstone Pass viewpoint", time: "30m", blurb: "Highest pass in the Lakes." },
        ],
      },
    ] as Tour[],
  },
];

function ToursPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Tours & Trips"
        title="Private UK tours from your airport."
        subtitle="Curated day tours led by a private chauffeur — Edinburgh Airport, Glasgow, Heathrow and Manchester. Famous stops between iconic start and end points, priced by the mile with no surprises."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours" }]}
      />

      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={edinburghImg} alt="Edinburgh chauffeur tour" width={1600} height={1024} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/3]" />
          <div>
            <SectionHeader
              eyebrow="Why book a private tour"
              title="See more, drive less, enjoy everything."
              subtitle="No coaches, no rigid timetables — just your group, your route and a chauffeur who knows the country. Every tour is priced using our standard mileage tiers plus a small stop fee where entry is included."
            />
            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: Users, label: "1–7 passengers", body: "Larger groups arranged." },
                { icon: ShieldCheck, label: "All-inclusive", body: "Fuel, parking and driver waiting included." },
                { icon: Clock, label: "Flexible pace", body: "Stay longer at any stop, pay only the extra time." },
                { icon: Star, label: "5-star chauffeurs", body: "Local knowledge, discreet service." },
              ].map((f) => (
                <div key={f.label} className="rounded-xl border border-border bg-card p-4">
                  <f.icon className="size-5 text-[var(--gold)]" />
                  <p className="mt-2 font-semibold">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="gold" className="mt-8 rounded-full">
              <Link to="/contact">Plan a bespoke tour <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {airports.map((airport, idx) => (
        <section key={airport.code} className={`section-y ${idx % 2 === 0 ? "bg-[var(--surface)]" : ""}`}>
          <div className="container-x">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] text-[var(--navy-foreground)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em]">
                  <Plane className="size-3 text-[var(--gold)]" /> {airport.code}
                </div>
                <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold">{airport.name}</h2>
                <p className="mt-2 text-muted-foreground">{airport.tagline}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {airport.tours.length} tour{airport.tours.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {airport.tours.map((t) => (
                <TourCard key={t.slug} tour={t} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section-y">
        <div className="container-x max-w-3xl text-center">
          <SectionHeader
            eyebrow="Not seeing your tour?"
            title="We tailor private tours across the whole UK."
            subtitle="Tell us where you'd like to go and we'll build the itinerary and quote — usually within a few hours."
          />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="gold" className="rounded-full">
              <Link to="/contact">Request a bespoke tour <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/" hash="booking">Start with a transfer quote</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function TourCard({ tour }: { tour: Tour }) {
  return (
    <article className="group rounded-3xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-[0_25px_60px_-25px_rgba(14,24,44,0.35)] transition-all">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={tour.image}
          alt={tour.name}
          width={1280}
          height={896}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {tour.popular && (
          <span className="absolute top-4 left-4 bg-[var(--gold)] text-[var(--gold-foreground)] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow">
            ★ Most popular
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5">
          <p className="text-white/90 text-xs uppercase tracking-widest font-semibold">{tour.from} → {tour.to}</p>
          <h3 className="text-white font-display text-2xl font-bold leading-tight mt-1">{tour.name}</h3>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-muted-foreground">{tour.tagline}</p>

        <div className="grid grid-cols-3 gap-3 text-center">
          <MiniStat icon={Clock} label="Duration" value={tour.duration} />
          <MiniStat icon={MapPin} label="Distance" value={tour.distance} />
          <MiniStat icon={Star} label="Price" value={tour.fromPrice} />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)] mb-2">
            Famous stops in between
          </p>
          <ol className="relative border-l-2 border-dashed border-[var(--gold)]/40 pl-5 space-y-3">
            {tour.stops.map((s, i) => (
              <li key={s.name} className="relative">
                <span className="absolute -left-[27px] top-1 size-4 rounded-full bg-[var(--gold)] ring-4 ring-[var(--gold)]/20 flex items-center justify-center text-[9px] font-bold text-[var(--gold-foreground)]">
                  {i + 1}
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground shrink-0">{s.time}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{s.blurb}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {tour.highlights.map((h) => (
            <span key={h} className="text-[11px] rounded-full border border-border bg-[var(--surface)] px-2.5 py-1 text-foreground/70">
              {h}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="gold" className="flex-1 rounded-full">
            <Link to="/" hash="booking">Start booking <ArrowRight className="size-4" /></Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/contact">Enquire</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-3">
      <Icon className="size-4 text-[var(--gold)] mx-auto" />
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
