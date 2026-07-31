import { createFileRoute } from "@tanstack/react-router";
import { Circle, Users, ShieldCheck, Clock } from "lucide-react";
import { SportsServicePage, sportsFaqSchema, type SportsServiceContent } from "@/components/site/SportsServicePage";
import eventsImg from "@/assets/services/events.jpg.asset.json";

const TITLE = "Football Transfers UK — Match Day Travel for Fans | Cabslink";
const DESC =
  "Match-day football transfers across Scotland and the UK. Private cars, MPVs and minibuses to home and away fixtures with fixed pricing and post-match pickups.";
const URL = "https://cabslink.com/football-transfers";

const faqs = [
  { q: "Do you wait until after the match?", a: "Yes. We agree a post-match pickup point away from the crowds, and your driver holds nearby until the ground clears." },
  { q: "Can you take groups to away fixtures?", a: "We run minibuses and multi-vehicle convoys to away grounds anywhere in the UK, including overnight trips." },
  { q: "Is alcohol allowed in the vehicle?", a: "For everyone's comfort we ask that alcohol isn't consumed in the vehicle. Supporter groups are always welcome." },
];

const content: SportsServiceContent = {
  eyebrow: "Football transfers",
  h1: "Match-day football transfers, home and away.",
  subtitle: "Private travel to fixtures across Scotland and the UK — kick-off timed pickups, no parking stress and a driver waiting after the final whistle.",
  breadcrumbLabel: "Football Transfers",
  image: eventsImg.url,
  imageAlt: "Group travelling by private minibus to a football match",
  intro: {
    title: "Get to kick-off without the parking scramble",
    body: "Stadium traffic, road closures and match-day parking make driving yourself the worst part of the day. We handle all of it and drop you close to the turnstiles.",
  },
  features: [
    { icon: Clock, title: "Kick-off timing", desc: "Pickups planned around kick-off and known road closures." },
    { icon: Users, title: "Groups of any size", desc: "Cars, MPVs, minibuses and coaches for supporter groups." },
    { icon: Circle, title: "Home and away", desc: "Local fixtures or long away days anywhere in the UK." },
    { icon: ShieldCheck, title: "Licensed and insured", desc: "Fully licensed operators with vetted professional drivers." },
  ],
  venues: {
    title: "Grounds we regularly serve",
    venues: ["Hampden Park", "Celtic Park", "Ibrox Stadium", "Tynecastle Park", "Easter Road", "Pittodrie Stadium", "Murrayfield", "Old Trafford", "Wembley Stadium"],
  },
  faqs,
};

export const Route = createFileRoute("/football-transfers")({
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
