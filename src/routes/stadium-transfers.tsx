import { createFileRoute } from "@tanstack/react-router";
import { Car, MapPin, Clock, Users } from "lucide-react";
import { SportsServicePage, sportsFaqSchema, type SportsServiceContent } from "@/components/site/SportsServicePage";
import eventsImg from "@/assets/services/events.jpg.asset.json";

const TITLE = "Stadium Transfers — Hampden & Murrayfield | Cabslink";
const DESC =
  "Private stadium transfers to Hampden, Murrayfield and grounds across the UK. Pre-agreed drop-off points, fixed pricing and drivers waiting after full time.";
const URL = "https://cabslink.com/stadium-transfers";

const faqs = [
  { q: "How close can you drop us off?", a: "As close as stewards and road closures allow. Your driver knows the standard match-day cordons and picks the nearest legal drop-off point." },
  { q: "Can you handle concerts as well as sport?", a: "Yes. Stadium concerts, rugby internationals and cup finals all use the same service and pricing." },
  { q: "What if the event overruns?", a: "Pickup is on your call, not a fixed clock. We hold nearby and come in when you're ready — extra-time and encores included." },
];

const content: SportsServiceContent = {
  eyebrow: "Stadium transfers",
  h1: "Stadium transfers with a plan for every road closure.",
  subtitle: "Hampden, Murrayfield and grounds across the UK — dropped close to the gates and collected after full time.",
  breadcrumbLabel: "Stadium Transfers",
  image: eventsImg.url,
  imageAlt: "Private vehicle dropping guests near a UK stadium on event day",
  intro: {
    title: "Arrive early, leave without queuing",
    body: "Event traffic management changes every fixture. We plan the approach and the exit in advance so you spend your time at the event, not in a car park queue.",
  },
  features: [
    { icon: MapPin, title: "Best drop-off point", desc: "Pre-agreed gates and streets inside the match-day cordon." },
    { icon: Clock, title: "Wait-on-call pickup", desc: "Your driver holds nearby and comes in when you call." },
    { icon: Users, title: "Any group size", desc: "From two seats to a full coach for corporate or club groups." },
    { icon: Car, title: "Fixed prices", desc: "Quoted up front — no surge pricing on event nights." },
  ],
  venues: {
    title: "Stadiums and arenas we cover",
    venues: ["Hampden Park", "BT Murrayfield", "OVO Hydro", "Celtic Park", "Ibrox Stadium", "Scottish Gas Murrayfield", "P&J Live Aberdeen", "Wembley Stadium", "Twickenham"],
  },
  faqs,
};

export const Route = createFileRoute("/stadium-transfers")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(sportsFaqSchema(faqs)) }],
  }),
  component: () => <SportsServicePage content={content} />,
});
