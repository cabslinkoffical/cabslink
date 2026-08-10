import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, FileText, Headset, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
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
  }),
  component: CorporatePage,
});

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
    </SiteLayout>
  );
}
