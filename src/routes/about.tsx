import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, ArrowRight, Shield } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { ABOUT } from "@/content/about";
import { FACTS } from "@/lib/site-facts";
import { listPublicVehicleClasses } from "@/lib/vehicle-classes.functions";
import { safeJsonLd } from "@/lib/safe-json-ld";
import edinburghImg from "@/assets/edinburgh.jpg";

const CANONICAL = "https://cabslink.com/about";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Cabslink — Airport Transfers from Edinburgh" },
      { name: "description", content: "Cabslink Limited: pre-booked airport transfers, private hire and day tours from Edinburgh, with fixed prices and meet and greet on every airport pickup." },
      { property: "og:title", content: "About Cabslink — Airport Transfers from Edinburgh" },
      { property: "og:description", content: "Pre-booked airport transfers, private hire and day tours from Edinburgh, with fixed prices and meet and greet on every airport pickup." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
            { "@type": "ListItem", position: 2, name: "About", item: CANONICAL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://cabslink.com/#organization",
          name: "Cabslink",
          legalName: FACTS.company.legalName,
          url: "https://cabslink.com",
          telephone: FACTS.company.phone,
          address: {
            "@type": "PostalAddress",
            streetAddress: "263a Leith Walk",
            addressLocality: "Edinburgh",
            postalCode: "EH6 8NY",
            addressCountry: "GB",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: ABOUT.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: classes } = useQuery({
    queryKey: ["public-vehicle-classes"],
    queryFn: () => listPublicVehicleClasses(),
    staleTime: 60_000,
  });

  return (
    <SiteLayout>
      <PageHero
        eyebrow="About Cabslink"
        title={ABOUT.heroTitle}
        subtitle={ABOUT.heroSubtitle}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "About" }]}
      />

      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <img src={edinburghImg} alt="Edinburgh skyline, Cabslink's home city" width={1600} height={1024} loading="lazy" className="rounded-3xl w-full object-cover aspect-[4/3] shadow-[var(--shadow-elegant)]" />
          <div>
            <SectionHeader eyebrow="Who we are" title="A private hire company based in Edinburgh." />
            {ABOUT.whoWeAre.map((p) => (
              <p key={p} className="mt-4 text-muted-foreground">{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="What you can rely on" title="The rules we work to." center />
          <ul className="mt-10 mx-auto max-w-3xl space-y-4">
            {ABOUT.promises.map((p) => (
              <li key={p.t} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
                <Shield className="size-5 text-[var(--gold-ink)] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display font-semibold text-[var(--navy)]">{p.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <SectionHeader eyebrow="Our fleet" title="Vehicle classes you can book." center />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(classes ?? []).map((c) => (
              <div key={c.id} className="rounded-2xl bg-card border border-border p-6">
                <Car className="size-6 text-[var(--gold-ink)]" />
                <h3 className="mt-4 font-display text-lg font-semibold">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.passengers} passengers · {c.large_luggage} large bags
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="gold" className="rounded-full"><Link to="/fleet">View the full fleet</Link></Button>
          </div>
        </div>
      </section>

      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="Your booking, step by step." center />
          <ol className="mt-12 grid gap-4 md:grid-cols-5">
            {ABOUT.howItWorks.map((step, i) => (
              <li key={step} className="rounded-2xl bg-card border border-border p-5 text-center">
                <div className="mx-auto grid size-10 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold-ink)] font-display font-semibold">{i + 1}</div>
                <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        eyebrow="Ready when you are"
        title="Book your journey"
        subtitle="Get a fixed price online in a few minutes."
        tone="gold"
      />

      <section className="section-y">
        <div className="container-x max-w-3xl">
          <SectionHeader eyebrow="FAQ" title="Common questions" center />
          <div className="mt-8">
            <FaqBlock items={ABOUT.faqs.map((f) => ({ q: f.q, a: f.a }))} />
          </div>
          <p className="mt-8 text-center text-sm">
            <Link to="/booking-policy" className="inline-flex items-center gap-1 text-[var(--gold-ink)] hover:underline">
              Read the full booking &amp; cancellation policy <ArrowRight className="size-3.5" />
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
