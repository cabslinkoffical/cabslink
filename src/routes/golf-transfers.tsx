import { createFileRoute } from "@tanstack/react-router";
import { Target, Clock, Luggage, MapPin } from "lucide-react";
import { SportsServicePage, sportsFaqSchema, type SportsServiceContent } from "@/components/site/SportsServicePage";
import eventsImg from "@/assets/services/events.jpg.asset.json";

const TITLE = "Golf Transfers Scotland — St Andrews & Course Travel | Cabslink";
const DESC =
  "Private golf transfers across Scotland and the UK. Door-to-door travel to St Andrews, Carnoustie, Turnberry and Gleneagles with room for clubs and fixed pricing.";
const URL = "https://cabslink.com/golf-transfers";

const faqs = [
  { q: "Is there room for golf clubs?", a: "Yes. We match your group to a vehicle class with dedicated space for full-size golf bags, trolleys and luggage — tell us the number of bags when you book." },
  { q: "Can you cover multi-course golf itineraries?", a: "We regularly run multi-day golf tours across the East Neuk, Ayrshire and the Highlands, with the same driver for the whole trip where possible." },
  { q: "Do you collect from the airport?", a: "Yes. We meet flights at Edinburgh, Glasgow, Aberdeen, Prestwick and Dundee with flight tracking, then travel straight to your course or hotel." },
];

const content: SportsServiceContent = {
  eyebrow: "Golf transfers",
  h1: "Golf transfers to Scotland's finest courses.",
  subtitle: "Travel to St Andrews, Carnoustie, Turnberry and Gleneagles in a vehicle with proper space for clubs, bags and your group.",
  breadcrumbLabel: "Golf Transfers",
  image: eventsImg.url,
  imageAlt: "Private golf transfer vehicle waiting outside a Scottish golf course",
  intro: {
    title: "Golf travel built around tee times",
    body: "Your driver plans around the first tee, not the traffic report. Fixed prices, generous club space and local knowledge of every approach road and clubhouse entrance.",
  },
  features: [
    { icon: Luggage, title: "Space for clubs", desc: "Estates, MPVs and minibuses sized for full golf bags and cases." },
    { icon: Clock, title: "Tee-time punctuality", desc: "Pickups timed to arrive comfortably before your first tee." },
    { icon: MapPin, title: "Course knowledge", desc: "Drivers who know clubhouse entrances, ranges and drop-off points." },
    { icon: Target, title: "Multi-course itineraries", desc: "One driver across several days and several courses." },
  ],
  venues: {
    title: "Courses and regions we cover",
    venues: ["St Andrews (Old Course)", "Carnoustie Golf Links", "Trump Turnberry", "Gleneagles", "Royal Troon", "Muirfield", "Kingsbarns", "Castle Stuart", "Royal Dornoch"],
  },
  faqs,
};

export const Route = createFileRoute("/golf-transfers")({
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
