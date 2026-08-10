import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, FileText, Headset, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FaqSection, LongFormSections, faqJsonLd } from "@/components/site/ContentSections";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/corporate-travel/")({
  head: () => ({
    meta: [
      { title: "Corporate Travel Accounts — Cabslink Business Travel" },
      { name: "description", content: "Account-managed corporate travel with punctual drivers, monthly invoicing, dedicated support and full reporting." },
      { property: "og:title", content: "Corporate Travel — Cabslink" },
      { property: "og:description", content: "Account-managed corporate travel with punctual drivers, monthly invoicing, dedicated support and full reporting." },
      { property: "og:url", content: "https://cabslink.com/corporate-travel" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/corporate-travel" }],
    scripts: [faqJsonLd(CT_FAQS)],
  }),
  component: CorporatePage,
});


const CT_SECTIONS = [
  {
    title: "What an account changes",
    paragraphs: [
      "On an account your team stops paying per trip. Journeys are consolidated onto a single monthly invoice, with cost-centre, project or purchase-order references carried on each line so finance can reconcile without chasing receipts.",
      "Bookers can arrange travel for colleagues, candidates and visitors without handling payment, and recurring journeys can run on a standing reference instead of being re-entered every week.",
    ],
  },
  {
    title: "Executive and board travel",
    paragraphs: [
      "Senior travel is judged on punctuality and discretion rather than vehicle badges. We plan against the meeting, not the map: collection times allow for the roads as they behave at that hour, and the driver confirms the pick-up point before setting off.",
      "For multi-leg days — office, client site, airport — the same driver and vehicle stay with the passenger, so briefcases and coats remain on board between stops.",
    ],
  },
  {
    title: "Visiting clients and candidates",
    paragraphs: [
      "Inbound visitors are met at arrivals with a name board and taken directly to your office or hotel, with the flight tracked so a delay does not leave anyone waiting or stranded.",
      "Interview candidates and inspection visitors can be booked the same way, and we keep both the traveller and the internal booker updated so your team knows when the guest will actually arrive.",
    ],
  },
  {
    title: "Events, roadshows and shuttles",
    paragraphs: [
      "Conferences, AGMs and client events often need several vehicles arriving together, or a shuttle pattern running between a venue and two or three hotels across a day.",
      "These run on one booking reference with a single point of contact, so a change on the day is handled once rather than car by car. Minibus and coach classes cover delegate movements where cars would be inefficient.",
    ],
  },
  {
    title: "Vehicle classes for business travel",
    paragraphs: [
      "Most business journeys use an executive saloon for one or two passengers, or a people carrier where a team travels together with cases. Larger movements step up to minibus and coach classes.",
      "You book a class rather than a specific model, which keeps availability reliable at short notice — the important part for account travel is that a suitable vehicle turns up on time, every time.",
    ],
  },
  {
    title: "Getting an account opened",
    paragraphs: [
      "Tell us your travel patterns: the sites and airports involved, rough monthly volume, who books, and what your invoices need to show. We come back with a proposal covering rates by class and route.",
      "There is no card gateway on the website for account work; billing is arranged directly, which is what most finance teams prefer for recurring travel.",
    ],
  },
];

const CT_FAQS = [
  { q: "How does corporate billing work?", a: "Account journeys are consolidated onto one monthly invoice, with cost-centre, project or PO references on each line. Travellers and bookers do not pay at the point of travel." },
  { q: "Can we book on behalf of clients and candidates?", a: "Yes. Provide the traveller's contact details as the passenger and your own as the booker; the driver contacts them directly while updates also reach you." },
  { q: "Do you handle several vehicles for one event?", a: "Yes. Multi-car movements and venue-to-hotel shuttles run on a single reference with one point of contact, so changes on the day are made once." },
  { q: "How quickly can a booking be made?", a: "Same-day and short-notice bookings are normally possible because you reserve a vehicle class rather than a specific model. Peak periods and larger vehicles benefit from more notice." },
  { q: "What do we need to open an account?", a: "Your usual sites and airports, approximate monthly volume, who will be booking, and the references your invoices must carry. We reply with a proposal covering rates by class and route." },
];

function CorporatePage() {
  const features = [
    { i: Building2, t: "Account management", d: "A dedicated manager who knows your business and your team." },
    { i: FileText, t: "Consolidated invoicing", d: "One monthly invoice with cost-centre breakdowns and PO references." },
    { i: Headset, t: "Priority dispatch", d: "Dedicated 24/7 booking line, with named operators on rotation." },
    { i: Users, t: "Visiting clients", d: "Meet & greet for executives and visitors at every UK airport." },
    { i: ShieldCheck, t: "Vetted drivers", d: "Smartly dressed, discreet, security-aware professionals." },
  ];
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Corporate Travel"
        title="A premium travel partner for serious businesses."
        subtitle="Boards, executives, visiting clients and event delegates — Cabslink handles every type of corporate journey, on account."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Corporate Travel" }]}
      />
      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Why corporates choose Cabslink" title="Built for business travel" />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.t} className="rounded-2xl border border-border bg-card p-7">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><f.i className="size-5" /></div>
                <h3 className="mt-5 font-display text-xl font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 rounded-3xl bg-[var(--navy)] text-white p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8 md:justify-between">
            <div>
              <h3 className="font-display text-3xl md:text-4xl">Open a corporate account</h3>
              <p className="mt-2 text-white/75 max-w-xl">Tell us about your team and travel patterns and we'll put together a tailored proposal.</p>
            </div>
            <Button asChild variant="gold" size="lg" className="rounded-full"><Link to="/corporate-booking">Get a proposal <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>
      <LongFormSections sections={CT_SECTIONS} heading="How corporate travel works with Cabslink" />
      <FaqSection faqs={CT_FAQS} />
    </SiteLayout>
  );
}
