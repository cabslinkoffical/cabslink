import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Shield, Users, Globe2, Heart, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import edinburghImg from "@/assets/edinburgh.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Cabslink — Trusted UK Chauffeur & Airport Transfer Company" },
      { name: "description", content: "Cabslink is a UK-based premium airport transfer and chauffeur company. Learn about our story, values and the team behind every journey." },
      { property: "og:title", content: "About Cabslink" },
      { property: "og:description", content: "A UK-based premium airport transfer and chauffeur company built on punctuality and trust." },
      { property: "og:url", content: "https://cabslink.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const values = [
    { icon: Shield, title: "Reliability", desc: "On-time, every time — flight-tracked and door-to-door." },
    { icon: Award, title: "Quality", desc: "Modern, immaculately maintained vehicles and vetted chauffeurs." },
    { icon: Heart, title: "Care", desc: "Calm, courteous service that treats every passenger as a VIP." },
    { icon: Sparkles, title: "Discretion", desc: "Privacy first — the standard expected by corporate clients." },
  ];
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About Cabslink"
        title="A modern UK chauffeur service, built on punctuality and trust."
        subtitle="From Edinburgh to every UK airport — Cabslink delivers premium transfers, executive chauffeurs and bespoke private travel for individuals, families and businesses."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "About" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={edinburghImg} alt="Edinburgh skyline at golden hour" width={1600} height={1024} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/3] shadow-[var(--shadow-elegant)]" />
          <div>
            <SectionHeader eyebrow="Our story" title="A premium standard, made simple." subtitle="Cabslink was founded with a single goal: to make professional, high-quality transport effortless. We saw too many travellers stressed by late drivers, hidden fees and inconsistent service — so we built something better." />
            <p className="mt-6 text-muted-foreground">
              Today, Cabslink operates a modern fleet across the UK from our Edinburgh base.
              We serve private travellers, families, corporate accounts, event organisers and
              tour groups — and we hold ourselves to the same high standard on every single ride.
            </p>
            <Button asChild variant="gold" className="mt-8 rounded-full"><Link to="/services">Explore our services</Link></Button>
          </div>
        </div>
      </section>

      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="What we stand for" title="Our values" center />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(v => (
              <div key={v.title} className="rounded-2xl bg-card border border-border p-6">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]"><v.icon className="size-5" /></div>
                <h3 className="mt-5 font-display text-xl font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, k: "50k+", v: "Passengers served" },
            { icon: Globe2, k: "All UK", v: "Airports covered" },
            { icon: Award, k: "10+ yrs", v: "On the road" },
          ].map(s => (
            <div key={s.v} className="rounded-2xl bg-[var(--navy)] text-white p-8 text-center">
              <s.icon className="size-7 text-[var(--gold)] mx-auto" />
              <p className="font-display text-4xl text-[var(--gold)] mt-3">{s.k}</p>
              <p className="mt-1 text-white/75">{s.v}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
