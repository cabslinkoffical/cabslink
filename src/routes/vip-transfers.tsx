import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, ShieldCheck, Sparkles, Star, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import chauffeurImg from "@/assets/chauffeur.jpg";

export const Route = createFileRoute("/vip-transfers")({
  head: () => ({
    meta: [
      { title: "VIP Transfers — Cabslink Luxury Chauffeur Service" },
      { name: "description", content: "Discreet, refined VIP chauffeur transfers across the UK. First-class vehicles, vetted chauffeurs and absolute privacy." },
      { property: "og:title", content: "VIP Transfers — Cabslink" },
      { property: "og:description", content: "Discreet, refined VIP chauffeur transfers across the UK. First-class vehicles, vetted chauffeurs and absolute privacy." },
      { property: "og:url", content: "https://cabslink.lovable.app/vip-transfers" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/vip-transfers" }],
  }),
  component: VipPage,
});

function VipPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="VIP Transfers"
        title="A discreet, refined chauffeur service for VIPs and dignitaries."
        subtitle="Every detail considered — from the cabin you sit in to the chauffeur who drives you. Absolute privacy, absolute punctuality."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "VIP Transfers" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={chauffeurImg} alt="VIP chauffeur" width={1280} height={1600} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/5] shadow-[var(--shadow-elegant)]" />
          <div>
            <SectionHeader eyebrow="First-class travel" title="More than a transfer — an experience." subtitle="VIP clients trust Cabslink for a reason. Our most senior chauffeurs, our finest vehicles, and a service standard tailored to your protocol." />
            <ul className="mt-6 space-y-4">
              {[
                { i: Crown, t: "Top-tier vehicles", d: "Latest executive sedans and luxury SUVs, immaculately presented." },
                { i: ShieldCheck, t: "Vetted chauffeurs", d: "Senior, professionally trained and security-conscious." },
                { i: Sparkles, t: "Bespoke arrangements", d: "Multi-leg routes, security details, lead vehicles on request." },
                { i: Star, t: "Total discretion", d: "Confidentiality is the baseline, not a premium add-on." },
              ].map(f => (
                <li key={f.t} className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]"><f.i className="size-5" /></div>
                  <div><h4 className="font-semibold">{f.t}</h4><p className="text-sm text-muted-foreground mt-1">{f.d}</p></div>
                </li>
              ))}
            </ul>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/contact">Request VIP service <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
