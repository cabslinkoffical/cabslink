import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { IMAGE_CREDITS } from "@/lib/image-credits";
import { PAGE_IMAGES } from "@/content/page-images";

const ALL_CREDITS = [
  ...IMAGE_CREDITS,
  ...Object.values(PAGE_IMAGES).map((p) => ({ label: p.label, file: p.file, author: p.author, license: p.license, page: p.page })),
];
import { PageHero } from "@/components/site/PageHero";

export const Route = createFileRoute("/image-credits")({
  head: () => normalizeHead({
    meta: [
      { title: "Image Credits | Cabslink Photography Attribution" },
      {
        name: "description",
        content:
          "Attribution for the photography used on Cabslink. All images are real photographs licensed from Wikimedia Commons contributors — no AI-generated imagery.",
      },
      { property: "og:title", content: "Image Credits | Cabslink" },
      {
        property: "og:description",
        content:
          "Photographer credits and licences for every photograph used across the Cabslink website.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/image-credits" }],
  }),
  component: ImageCreditsPage,
});

function ImageCreditsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Photography"
        title="Image credits"
        subtitle="Every photograph on this website is a real photograph of real vehicles, airports, stations and destinations. We do not use AI-generated imagery. Images are used under free licences from Wikimedia Commons contributors, credited below."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Image credits", to: "/image-credits" }]}
        width="reading"
        showCta={false}
      />

      <section className="section-y">
        <div className="container-x">
          <ul className="grid gap-4 md:grid-cols-2">
            {ALL_CREDITS.map((c) => (
              <li key={`${c.label}-${c.file}`} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="font-display text-lg font-semibold text-[var(--navy)]">{c.label}</p>
                <p className="mt-1 break-words text-sm text-muted-foreground">{c.file}</p>
                <p className="mt-3 text-sm text-foreground">
                  {c.author} — {c.license}
                </p>
                <a
                  href={c.page}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-block text-sm font-semibold text-[var(--gold-ink)] underline underline-offset-4 hover:text-[var(--navy)]"
                >
                  Source & licence
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </SiteLayout>
  );
}
