import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, GraduationCap, Users, Heart, CalendarClock, Phone } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { solutionList } from "@/lib/seo/travel-solutions";
import { publishedServices } from "@/lib/seo/service-registry";
import { SITE } from "@/lib/site";

const URL = "https://cabslink.com/travel-solutions";
const TITLE = "Travel Solutions — Business, Student & Group | Cabslink";
const DESCRIPTION =
  "Travel for every passenger: business accounts, student airport-to-campus runs, family transfers with child seats, group minibus hire and event shuttles.";


const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "business-travel": Briefcase,
  "student-travel": GraduationCap,
  "family-travel": Heart,
  "group-travel": Users,
  "event-travel": CalendarClock,
};

function schema() {
  const solutions = solutionList();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        url: URL,
        about: {
          "@type": "LocalBusiness",
          name: SITE.name,
          telephone: SITE.phoneUK,
          email: SITE.email,
          url: "https://cabslink.com",
        },
      },
      {
        "@type": "ItemList",
        name: "Travel solutions",
        itemListElement: solutions.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.hubTitle,
          url: `${URL}/${s.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
          { "@type": "ListItem", position: 2, name: "Travel Solutions", item: URL },
        ],
      },
    ],
  };
}

export const Route = createFileRoute("/travel-solutions/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(schema()) }],
  }),
  component: TravelSolutionsHub,
});

function TravelSolutionsHub() {
  const solutions = solutionList();
  const services = publishedServices();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Travel solutions"
        title="Travel built around who's travelling."
        subtitle="Start from your situation — a client visit, an arrival week, a family holiday, a 40-person wedding — and we'll match it to the right service, vehicle class and price."
        primaryLabel="Get a quote"
        primaryTo="/book"
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Travel solutions" }]}
      />

      <section className="section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Choose your situation"
            title="Five ways people travel with us"
            subtitle="Each solution explains the problems we hear most and the services that solve them."
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s) => {
              const Icon = ICONS[s.slug] ?? Users;
              return (
                <li key={s.slug}>
                  <Link
                    to="/travel-solutions/$slug"
                    params={{ slug: s.slug }}
                    className="group flex h-full flex-col rounded-2xl border bg-background p-6 shadow-[var(--shadow-raised)] transition hover:border-[var(--gold)]"
                  >
                    <div className="grid size-11 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="mt-4 font-display text-xl font-semibold">{s.hubTitle}</h2>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.hubBlurb}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--gold-ink)]">
                      Explore <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-[var(--navy)] text-[var(--navy-foreground)] section-y">
        <div className="container-x">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Or browse by service</p>
          <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Every service we publish
          </h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  to={s.url}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium hover:border-[var(--gold)]"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="gold" className="rounded-lg">
              <Link to="/book">Get a fixed price <ArrowRight className="size-4" /></Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-lg bg-transparent text-[var(--navy-foreground)] border-[var(--navy-foreground)]/30 hover:bg-white/10"
            >
              <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>
                <Phone className="size-4" /> {SITE.phoneUK}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
