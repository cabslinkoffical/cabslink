import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, Loader2, MapPin, Search, Users, Briefcase, Car } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE } from "@/lib/site";
import { minutesLabel } from "@/lib/tour-quote";
import { CUSTOM_TOUR_STATUSES, normaliseCustomTourRef, customTourLookupSchema } from "@/lib/custom-tour-requests";
import { getCustomTourRequestStatus, type CustomTourStatusView } from "@/lib/custom-tour-requests.functions";

export const Route = createFileRoute("/custom-tour-status")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search.ref === "string" ? { ref: search.ref.slice(0, 40) } : {},
  head: () => normalizeHead({
    meta: [
      { title: `Check your custom tour request | ${SITE.name}` },
      { name: "description", content: "Check the status of your Cabslink custom tour request with your CL-CT reference and the email you used." },
      { property: "og:title", content: `Check your custom tour request | ${SITE.name}` },
      { property: "og:description", content: "See where your custom day tour request is up to, using your reference and email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/custom-tour-status" }],
  }),
  component: CustomTourStatusPage,
});

/** Progress rail order; "rejected" is shown on its own rather than as a step. */
const RAIL = CUSTOM_TOUR_STATUSES.filter((s) => s !== "rejected");

function CustomTourStatusPage() {
  const search = Route.useSearch();
  const lookup = useServerFn(getCustomTourRequestStatus);
  const [reference, setReference] = useState(search.ref ?? "");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomTourStatusView | null>(null);

  useEffect(() => { if (search.ref) setReference(search.ref); }, [search.ref]);

  const check = useMutation({
    mutationFn: () => lookup({ data: { reference, email } }),
    onSuccess: (res) => { setResult(res); setFormError(null); },
    onError: (e: Error) => { setResult(null); setFormError(e.message || "We couldn't check your request. Please try again."); },
  });

  return (
    <SiteLayout hideCta>
      <section className="mx-auto max-w-3xl px-4 pt-28 pb-16 md:pt-32">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">Custom tours</p>
        <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Check your custom tour request</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Enter the reference we gave you (it starts with CL-CT) and the email address you used. For a booked journey or tour, use{" "}
          <Link to="/manage-booking" className="font-semibold text-foreground underline">Manage booking</Link> instead.
        </p>

        <form
          className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = customTourLookupSchema.safeParse({ reference, email });
            if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? "Check your reference and email."); return; }
            setReference(normaliseCustomTourRef(reference));
            check.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ct-ref">Reference</Label>
            <Input id="ct-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="CL-CT-2026-00001" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-email">Email</Label>
            <Input id="ct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <Button type="submit" variant="gold" className="rounded-full" disabled={check.isPending}>
            {check.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Check status
          </Button>
          {formError && <p role="alert" className="text-sm font-semibold text-destructive sm:col-span-3">{formError}</p>}
        </form>

        {result && <StatusCard r={result} />}
      </section>
    </SiteLayout>
  );
}

function StatusCard({ r }: { r: CustomTourStatusView }) {
  const at = RAIL.indexOf(r.status as (typeof RAIL)[number]);
  return (
    <div className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Reference</p>
          <p className="font-mono text-lg font-bold tracking-wider">{r.reference}</p>
        </div>
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">{r.statusLabel}</span>
      </div>
      <p className="text-sm">{r.statusMessage}</p>

      {r.status !== "rejected" && (
        <ol className="grid grid-cols-5 gap-1.5" aria-label="Request progress">
          {RAIL.map((s, i) => (
            <li key={s} className="space-y-1">
              <span className={`block h-1.5 rounded-full ${i <= at ? "bg-[var(--gold)]" : "bg-border"}`} />
              <span className={`block text-[11px] capitalize ${i === at ? "font-bold" : "text-muted-foreground"}`}>{s}</span>
            </li>
          ))}
        </ol>
      )}

      {r.price != null && (
        <div className="rounded-2xl border border-[var(--gold)]/50 bg-[var(--surface)] px-4 py-3">
          <p className="text-xs text-muted-foreground">Price from our tour team</p>
          <p className="font-display text-2xl font-bold text-[var(--gold-ink)]">£{r.price.toFixed(2)}</p>
        </div>
      )}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarDays className="size-4 text-[var(--gold-ink)]" /> {r.tourDate}</p>
        <p className="flex items-center gap-2"><Clock className="size-4 text-[var(--gold-ink)]" /> From {r.startTime} · {r.hours} hours</p>
        <p className="flex items-center gap-2"><Users className="size-4 text-[var(--gold-ink)]" /> {r.passengers} {r.passengers === 1 ? "passenger" : "passengers"}</p>
        <p className="flex items-center gap-2"><Briefcase className="size-4 text-[var(--gold-ink)]" /> {r.luggage} suitcases</p>
        {r.vehicleName && <p className="flex items-center gap-2"><Car className="size-4 text-[var(--gold-ink)]" /> {r.vehicleName}</p>}
      </div>

      <div>
        <p className="font-display font-bold">Your itinerary</p>
        <ol className="mt-2 space-y-1.5 text-sm">
          <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> <span><strong>Start:</strong> {r.startLabel}</span></li>
          {r.stops.map((s, i) => (
            <li key={i} className="pl-6">{i + 1}. {s.name}{s.dwellMinutes ? <span className="text-muted-foreground"> · {minutesLabel(s.dwellMinutes)}</span> : null}</li>
          ))}
          <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> <span><strong>Finish:</strong> {r.endLabel || r.startLabel}</span></li>
        </ol>
      </div>

      {r.updates.length > 0 && (
        <div>
          <p className="font-display font-bold">Updates from our team</p>
          <ul className="mt-2 space-y-3">
            {r.updates.map((u, i) => (
              <li key={i} className="rounded-2xl border border-border bg-background p-3 text-sm">
                <p className="text-xs text-muted-foreground">{new Date(u.at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Questions about this request? Call {SITE.phoneUK} or email {SITE.email} and quote your reference.
      </p>
    </div>
  );
}
