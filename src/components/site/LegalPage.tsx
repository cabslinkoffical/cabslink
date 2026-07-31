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
    <SiteLayout>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: eyebrow }]}
      />
      <section className="section-y">
        <div className="container-x max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Last updated: {updated}</p>
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground mt-4">
            <strong>Draft policy —</strong> this page is a working template. Company details, jurisdiction, and specific
            terms marked <code>[ADMIN TO COMPLETE]</code> must be finalised before production launch. It is not
            finalised legal advice.
          </div>
          <div className="prose prose-neutral dark:prose-invert mt-6 max-w-none space-y-6 text-sm leading-relaxed">
            {children}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

export function AdminTodo({ note }: { note: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--gold)]/60 bg-[var(--gold)]/10 p-3 text-xs text-foreground">
      <mark className="bg-transparent font-bold text-[var(--gold-ink)]">[ADMIN TO COMPLETE]</mark> {note}
    </p>
  );
}
