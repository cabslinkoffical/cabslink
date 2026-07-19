import { Link } from "@tanstack/react-router";
import type { PublicSeoPage, PublicSeoSection } from "@/lib/seo-public.functions";
import { Button } from "@/components/ui/button";

/**
 * Renders a published seo_pages record + its sections.
 * Section body is treated as plain text with paragraph splitting.
 * structured_payload drives specialised sections (FAQ, popular_destinations, etc.).
 */
export function SeoPageRenderer({ page }: { page: PublicSeoPage }) {
  const hero = page.featured_image_url || page.og_image_url || page.entity?.hero_image_url || null;

  return (
    <main className="min-h-screen bg-background">
      <section className="relative border-b bg-gradient-to-b from-muted/40 to-background">
        {hero && (
          <div className="absolute inset-0 -z-10 opacity-30">
            <img src={hero} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">{page.h1}</h1>
          {page.short_intro && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">{page.short_intro}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/book">Book now</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/contact">Get a quote</Link></Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-12 max-w-4xl">
        {page.sections.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </div>
    </main>
  );
}

function SectionBlock({ section }: { section: PublicSeoSection }) {
  const payload = section.structured_payload || {};

  if (section.section_type === "faqs") {
    const items = Array.isArray((payload as any).items) ? (payload as any).items : [];
    return (
      <section>
        {section.heading && <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>}
        <div className="space-y-4">
          {items.map((it: any, i: number) => (
            <details key={i} className="rounded-lg border bg-card p-4">
              <summary className="cursor-pointer font-medium">{it.question}</summary>
              <p className="mt-2 text-muted-foreground text-sm">{it.answer}</p>
            </details>
          ))}
        </div>
      </section>
    );
  }

  if (section.section_type === "popular_destinations" || section.section_type === "nearby_airports" || section.section_type === "nearby_cities") {
    const items = Array.isArray((payload as any).items) ? (payload as any).items : [];
    return (
      <section>
        {section.heading && <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it: any, i: number) => (
            <li key={i} className="rounded-lg border bg-card p-4 hover:bg-accent transition">
              {it.href ? (
                <a href={it.href} className="font-medium hover:underline">{it.label}</a>
              ) : (
                <span className="font-medium">{it.label}</span>
              )}
              {it.description && <p className="text-sm text-muted-foreground mt-1">{it.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      {section.heading && <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>}
      {section.body && (
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {section.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </section>
  );
}

export function buildSeoHead(page: PublicSeoPage, origin: string) {
  const url = `${origin}${page.canonical_override || page.path}`;
  const image = page.og_image_url || page.featured_image_url || page.entity?.hero_image_url || null;
  const meta: Array<Record<string, string>> = [
    { title: page.seo_title },
    { name: "description", content: page.meta_description },
    { name: "robots", content: page.robots_status || "index,follow" },
    { property: "og:title", content: page.seo_title },
    { property: "og:description", content: page.meta_description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: page.seo_title },
    { name: "twitter:description", content: page.meta_description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: page.seo_title,
        description: page.meta_description,
        url,
        ...(image ? { image } : {}),
        dateModified: page.updated_at,
      }),
    }],
  };
}
