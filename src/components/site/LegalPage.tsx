import type { ReactNode } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";

export function LegalPage({
  eyebrow,
  title,
  subtitle,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <SiteLayout cta={{ heading: <>Questions about <span className="text-gold">this policy</span>?</>, subtitle: "Our team can explain any part of it before or after you book.", label: "Contact us", to: "/contact", trackAs: "final_cta_legal" }}>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: eyebrow }]}
        align="left"
        width="reading"
        showCta={false}
      />
      <section className="section-y bg-surface-2">
        <div className="container-x max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Last updated: {updated}</p>
          <div className="prose prose-neutral dark:prose-invert mt-6 max-w-none space-y-6 text-sm leading-relaxed">
            {children}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
