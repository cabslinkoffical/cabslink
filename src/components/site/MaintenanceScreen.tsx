import { SITE } from "@/lib/site";

/** Shown to public visitors while the admin "Maintenance mode" switch is ON. */
export function MaintenanceScreen({ companyName }: { companyName?: string | null }) {
  const name = companyName || SITE.name;
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--navy,#0E182C)] px-4 py-16 text-center">
      <div className="max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">{name}</p>
        <h1 className="mt-5 font-display text-3xl font-semibold text-white sm:text-4xl">
          We're carrying out scheduled maintenance
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Online booking is briefly unavailable while we update our systems. Our 24/7 team is still
          taking reservations by phone or email — we'll have the site back shortly.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--gold-foreground)]"
          >
            Call {SITE.phoneUK}
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white"
          >
            {SITE.email}
          </a>
        </div>
      </div>
    </div>
  );
}
