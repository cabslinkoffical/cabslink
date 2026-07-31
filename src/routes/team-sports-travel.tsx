import { createFileRoute } from "@tanstack/react-router";
import { Users, Luggage, ShieldCheck, RouteIcon } from "lucide-react";
import { SportsServicePage, sportsFaqSchema, type SportsServiceContent } from "@/components/site/SportsServicePage";
import eventsImg from "@/assets/services/events.jpg.asset.json";

const TITLE = "Team Sports Travel — Squad & Kit Transport UK | Cabslink";
const DESC =
  "Team sports travel across the UK. Minibuses and coaches for squads, coaching staff, kit and supporters, with one account contact and fixed season pricing.";
const URL = "https://cabslink.com/team-sports-travel";

const faqs = [
  { q: "Can you carry kit and equipment?", a: "Yes. We size vehicles for players plus kit bags, medical kit and equipment, and add a support vehicle when a squad needs more space." },
  { q: "Do you offer season-long arrangements?", a: "We set up an account with agreed rates for the season so fixtures can be booked with one email and invoiced monthly." },
  { q: "Can you move youth teams?", a: "Yes, with licensed and vetted drivers. Tell us the age group and any club safeguarding requirements when you book." },
];

const content: SportsServiceContent = {
  eyebrow: "Team sports travel",
  h1: "Team sports travel for squads, staff and kit.",
  subtitle: "Minibuses and coaches that move the whole team together — with space for kit, one point of contact and pricing agreed for the season.",
  breadcrumbLabel: "Team Sports Travel",
  image: eventsImg.url,
  imageAlt: "Sports team boarding a private minibus with kit bags",
  intro: {
    title: "One vehicle, one driver, the whole squad",
    body: "Club secretaries have enough to organise. We handle the travel side of fixtures: the right vehicle, on time, every week, on one invoice.",
  },
  features: [
    { icon: Users, title: "Squads and staff", desc: "8 to 50+ seats across minibuses and coaches." },
    { icon: Luggage, title: "Kit and equipment", desc: "Luggage space planned for bags, medical kit and gear." },
    { icon: RouteIcon, title: "Fixture scheduling", desc: "Recurring bookings for a full league season." },
    { icon: ShieldCheck, title: "Vetted drivers", desc: "Licensed, insured and youth-team appropriate." },
  ],
  venues: {
    title: "Typical team journeys",
    venues: ["League fixtures across Scotland", "Away days in England and Wales", "Training camps and residentials", "Tournament and cup weekends", "Airport departures for tours", "University and college sport", "School fixtures", "Rugby and hockey leagues", "Athletics and swim meets"],
  },
  faqs,
};

export const Route = createFileRoute("/team-sports-travel")({
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
