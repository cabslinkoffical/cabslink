import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, ShieldCheck, Sparkles, Star, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { InternalLinkHub } from "@/components/seo/InternalLinkHub";
import { FaqSection, LongFormSections, faqJsonLd } from "@/components/site/ContentSections";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import driverImg from "@/assets/chauffeur.jpg";

export const Route = createFileRoute("/vip-transfers")({
  head: () => ({
    meta: [
      { title: "VIP Transfers — Cabslink Luxury Airport Travel Service" },
      { name: "description", content: "Discreet, refined VIP driver transfers across the UK. First-class vehicles, vetted drivers and absolute privacy." },
      { property: "og:title", content: "VIP Transfers — Cabslink" },
      { property: "og:description", content: "Discreet, refined VIP driver transfers across the UK. First-class vehicles, vetted drivers and absolute privacy." },
      { property: "og:url", content: "https://cabslink.com/vip-transfers" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/vip-transfers" }],
    scripts: [faqJsonLd(VIP_FAQS)],
  }),
  component: VipPage,
});


const VIP_SECTIONS = [
  {
    title: "What the VIP standard actually covers",
    paragraphs: [
      "VIP work is planned rather than upgraded. Routes are checked in advance, arrival and departure points are agreed with whoever manages the schedule, and the driver is briefed on protocol before the day rather than being told at the kerb.",
      "The vehicle is our top saloon or luxury SUV class, presented for the journey, with a senior driver who runs this type of work regularly.",
    ],
  },
  {
    title: "Privacy and discretion",
    paragraphs: [
      "Passenger details are shared only with the driver assigned to the journey. We do not publicise clients, confirm or deny bookings to third parties, or use journeys as marketing material.",
      "Where a booking is arranged by an assistant, agent or security team, we keep the passenger's own contact details separate and route updates the way you ask us to.",
    ],
  },
  {
    title: "Airports and private terminals",
    paragraphs: [
      "Arrivals can be handled discreetly in the main terminal with a name board, or without a board where a passenger would prefer not to be identified in public. We also serve private and business aviation terminals, where access and timing are arranged with the handling agent.",
      "Flights are tracked either way, so the car is in position for the actual landing rather than the published schedule.",
    ],
  },
  {
    title: "Multi-vehicle and multi-leg arrangements",
    paragraphs: [
      "Delegations and touring parties often need more than one car: a lead vehicle, a following vehicle for staff and luggage, or several cars leaving from different points to arrive together.",
      "These are run on one reference with a single coordinator, and drivers are briefed as a group so timings hold across every vehicle.",
    ],
  },
  {
    title: "Security-aware travel",
    paragraphs: [
      "We work alongside a client's own close-protection team where one is in place: they set the route and access requirements and our drivers follow them.",
      "We are a private-hire operator, not a security provider. We do not supply protection officers or armoured vehicles, and we will say so plainly rather than imply capability we do not hold.",
    ],
  },
  {
    title: "Arranging a VIP journey",
    paragraphs: [
      "VIP itineraries are quoted individually because they are usually multi-leg, span more than one day, or involve waiting time and standby. Send the outline schedule and we come back with a written arrangement.",
      "Contact our team rather than the standard booking form for these journeys, so the details are handled by one person from enquiry through to the day itself.",
    ],
  },
];

const VIP_FAQS = [
  { q: "Can the driver meet me without a name board?", a: "Yes. Where a passenger would prefer not to be identified in public, we agree a discreet meeting point in advance and the driver waits without signage." },
  { q: "Do you provide security personnel?", a: "No. We are a private-hire operator and supply vehicles and drivers only. We work alongside a client's own close-protection team where one is engaged, following the route and access requirements they set." },
  { q: "Can you arrange several vehicles for a delegation?", a: "Yes. Lead and following vehicles, staff and luggage cars, and multiple pick-up points arriving together all run on one reference with a single coordinator." },
  { q: "Do you serve private jet terminals?", a: "Yes. We collect from and deliver to private and business aviation terminals, with access and timing arranged through the handling agent." },
  { q: "How is a VIP booking priced?", a: "Individually. These journeys usually involve multiple legs, waiting time or standby across a day, so we quote in writing against your outline schedule rather than from a standard fare table." },
];

function VipPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="VIP Transfers"
        title="A discreet, refined airport travel service for VIPs and dignitaries."
        subtitle="Every detail considered — from the cabin you sit in to the driver who drives you. Absolute privacy, absolute punctuality."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "VIP Transfers" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={driverImg} alt="VIP driver" width={1280} height={1600} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/5] shadow-[var(--shadow-elegant)]" />
          <div>
            <SectionHeader eyebrow="First-class travel" title="More than a transfer — an experience." subtitle="VIP clients trust Cabslink for a reason. Our most senior drivers, our finest vehicles, and a service standard tailored to your protocol." />
            <ul className="mt-6 space-y-4">
              {[
                { i: Crown, t: "Top-tier vehicles", d: "Latest executive sedans and luxury SUVs, immaculately presented." },
                { i: ShieldCheck, t: "Vetted drivers", d: "Senior, professionally trained and security-conscious." },
                { i: Sparkles, t: "Bespoke arrangements", d: "Multi-leg routes, security details, lead vehicles on request." },
                { i: Star, t: "Total discretion", d: "Confidentiality is the baseline, not a premium add-on." },
              ].map(f => (
                <li key={f.t} className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><f.i className="size-5" /></div>
                  <div><h4 className="font-semibold">{f.t}</h4><p className="text-sm text-muted-foreground mt-1">{f.d}</p></div>
                </li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/contact">Request VIP service <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>
      <LongFormSections sections={VIP_SECTIONS} heading="How VIP travel is arranged" />
      <FaqSection faqs={VIP_FAQS} />
      {/* Automated services ↔ airports ↔ locations cross-links */}
      <section className="section-y">
        <div className="container-x">
          <InternalLinkHub kind="service" slug="vip-transfers" className="" />
        </div>
      </section>
    </SiteLayout>
  );
}
