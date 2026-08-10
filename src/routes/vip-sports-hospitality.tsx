import { createFileRoute } from "@tanstack/react-router";
import { Crown, Sparkles, ShieldCheck, Briefcase } from "lucide-react";
import { SportsServicePage, sportsFaqSchema, type SportsServiceContent } from "@/components/site/SportsServicePage";
import vipImg from "@/assets/services/vip.jpg.asset.json";

const TITLE = "VIP Sports Hospitality Travel — Event Cars | Cabslink";
const DESC =
  "VIP sports hospitality travel across the UK. Executive vehicles and discreet drivers for corporate guests at The Open, Six Nations, race days and cup finals.";
const URL = "https://cabslink.com/vip-sports-hospitality";

const faqs = [
  { q: "Can you look after multiple guest vehicles?", a: "Yes. We coordinate multi-vehicle movements from one point of contact, with staggered arrivals to match your hospitality schedule." },
  { q: "Will the same driver stay with us all day?", a: "For hospitality days we assign a dedicated driver and vehicle for the full booking, on call between engagements." },
  { q: "Can travel be invoiced to our company?", a: "Yes. Corporate accounts are invoiced monthly with cost-centre references for each guest journey." },
];

const content: SportsServiceContent = {
  eyebrow: "VIP sports hospitality",
  h1: "VIP sports hospitality travel, handled discreetly.",
  subtitle: "Executive vehicles and senior drivers for corporate guests at The Open, Six Nations, race days and cup finals across the UK.",
  breadcrumbLabel: "VIP Sports Hospitality",
  image: vipImg.url,
  imageAlt: "Executive vehicle and driver waiting for VIP sports hospitality guests",
  intro: {
    title: "Your guests remember the whole day",
    body: "Hospitality begins the moment your guests are collected. Immaculate vehicles, senior drivers and one coordinator managing every movement of the day.",
  },
  features: [
    { icon: Crown, title: "Executive fleet", desc: "Premium sedans and luxury SUVs, immaculately presented." },
    { icon: Sparkles, title: "Dedicated for the day", desc: "Same driver and vehicle, on call between engagements." },
    { icon: Briefcase, title: "Corporate accounts", desc: "Monthly invoicing with cost-centre references." },
    { icon: ShieldCheck, title: "Total discretion", desc: "Senior, security-conscious drivers and full confidentiality." },
  ],
  venues: {
    title: "Hospitality events we cover",
    venues: ["The Open Championship", "Six Nations at Murrayfield", "Scottish Cup Final", "Royal Ascot", "Wimbledon", "British Grand Prix", "Ryder Cup", "Champions League nights", "Corporate golf days"],
  },
  faqs,
};

export const Route = createFileRoute("/vip-sports-hospitality")({
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
