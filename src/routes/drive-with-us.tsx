import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Car, ShieldCheck, Users } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { DriverApplicationForm } from "@/components/site/DriverApplicationForm";

export const Route = createFileRoute("/drive-with-us")({
  head: () => normalizeHead({
    meta: [
      { title: "Drive With Us — Become a Cabslink Driver or Fleet Partner" },
      { name: "description", content: "Join Cabslink as a professional driver or licensed fleet operator. Steady premium work across the UK with a respected brand." },
      { property: "og:title", content: "Drive With Us — Cabslink" },
      { property: "og:description", content: "Join Cabslink as a professional driver or licensed fleet operator. Steady premium work across the UK with a respected brand." },
      { property: "og:url", content: "https://cabslink.com/drive-with-us" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/drive-with-us" }],
  }),
  component: DrivePage,
});

function DrivePage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Drive With Us"
        title="Partner with Cabslink as a driver or fleet operator."
        subtitle="Steady premium work, a respected brand, and a team that supports its drivers — apply to join us today."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Drive With Us" }]}
        showCta={false}

      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12">
          <div>
            <SectionHeader eyebrow="Why drive with Cabslink" title="A platform built for professional drivers." />
            <ul className="mt-8 space-y-5">
              {[
                { i: Car, t: "Steady premium work", d: "Consistent jobs from a recognised UK brand." },
                { i: Users, t: "Quality passengers", d: "Vetted private, corporate and VIP clients." },
                { i: Briefcase, t: "Account & event work", d: "Long-term corporate accounts and event contracts." },
                { i: ShieldCheck, t: "Driver-first support", d: "Real humans on the dispatch line, day and night." },
              ].map(b => (
                <li key={b.t} className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><b.i className="size-5" /></div>
                  <div><h4 className="font-semibold">{b.t}</h4><p className="text-sm text-muted-foreground mt-1">{b.d}</p></div>
                </li>
              ))}
            </ul>
            <div className="mt-10 rounded-2xl border border-border bg-[var(--surface)] p-6">
              <h4 className="font-semibold">Requirements</h4>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {["Valid UK PCO/private hire licence", "Modern, clean vehicle (≤ 5 years)", "Professional appearance", "Smartphone with data", "Right to work in the UK", "Excellent local knowledge"].map(r => <li key={r}>• {r}</li>)}
              </ul>
            </div>
          </div>
          <DriverApplicationForm />
        </div>
      </section>
    </SiteLayout>
  );
}
