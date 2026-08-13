import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { IMAGE_CREDITS } from "@/lib/image-credits";

export const Route = createFileRoute("/image-credits")({
  head: () => ({
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
      <section className="navy-scene py-16 md:py-24">
        <div className="container mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Photography</p>
          <h1 className="mt-3 font-heading text-3xl md:text-5xl text-primary-foreground">
            Image credits
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/75">
            Every photograph on this website is a real photograph of real vehicles, airports,
            stations and destinations. We do not use AI-generated imagery. Images are used under
            free licences from Wikimedia Commons contributors, credited below.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <ul className="grid gap-4 md:grid-cols-2">
            {IMAGE_CREDITS.map((c) => (
              <li key={`${c.label}-${c.file}`} className="rounded-2xl border bg-card p-5">
                <p className="font-heading text-lg text-foreground">{c.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.file}</p>
                <p className="mt-3 text-sm text-foreground">
                  {c.author} — {c.license}
                </p>
                <a
                  href={c.page}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-block text-sm font-medium text-primary underline"
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
