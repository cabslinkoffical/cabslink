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
      <strong>[ADMIN TO COMPLETE]</strong> {note}
    </p>
  );
}
