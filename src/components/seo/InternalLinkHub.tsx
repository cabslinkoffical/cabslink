/**
 * InternalLinkHub — renders the automated services ↔ airports ↔ locations
 * cross-link modules for one page, plus a booking CTA so the links guide
 * users toward a quote rather than dead-ending.
 */
import { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { LinkModuleList } from "@/components/seo/LinkModuleList";
import { linkHubQuery } from "@/lib/internal-links.functions";

type Props = {
  kind: "location" | "airport" | "service";
  slug: string;
  heading?: string;
  className?: string;
};

function Hub({ kind, slug, heading, className }: Props) {
  const { data } = useSuspenseQuery(linkHubQuery(kind, slug));
  if (!data.modules.length) return null;

  return (
    <section className={className ?? "mt-14"} aria-label="Related pages">
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">
          Explore more
        </div>
        <h2 className="mt-1 text-2xl font-bold text-[var(--navy)] sm:text-3xl">
          {heading ?? "Where to next"}
        </h2>
      </div>
      <LinkModuleList modules={data.modules} />
      <p className="mt-5 text-sm text-[var(--navy)]/70">
        Know your journey already?{" "}
        <Link to="/book" search={{ q: "" }} className="inline-flex items-center gap-1 font-semibold text-[var(--gold-ink)] underline">
          Get an instant fixed price <ArrowRight className="size-3.5" />
        </Link>
      </p>
    </section>
  );
}

export function InternalLinkHub(props: Props) {
  return (
    <Suspense fallback={null}>
      <Hub {...props} />
    </Suspense>
  );
}
