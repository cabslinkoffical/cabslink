import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, MailX } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { unsubscribeMarketing } from "@/lib/marketing.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => (typeof s.token === "string" ? { token: s.token.slice(0, 64) } : {}),
  head: () => normalizeHead({
    meta: [
      { title: "Unsubscribe from offer emails | Cabslink" },
      { name: "description", content: "Stop receiving Cabslink offer and discount emails." },
      { property: "og:title", content: "Unsubscribe from offer emails | Cabslink" },
      { property: "og:description", content: "Stop receiving Cabslink offer and discount emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const run = useServerFn(unsubscribeMarketing);
  const [state, setState] = useState<"idle" | "busy" | "done" | "already" | "invalid">(token ? "idle" : "invalid");
  const confirm = async () => {
    setState("busy");
    try { const r = await run({ data: { token: token ?? "" } }); setState(r.result); }
    catch { setState("invalid"); }
  };
  return (
    <SiteLayout>
      <section className="mx-auto max-w-lg px-4 py-20 text-center">
        {state === "done" || state === "already" ? (
          <>
            <CheckCircle2 className="mx-auto size-10 text-[var(--gold-ink)]" />
            <h1 className="mt-3 font-display text-2xl font-bold">You're unsubscribed</h1>
            <p className="mt-2 text-muted-foreground">You won't get any more offer emails from us. Booking confirmations and updates about your journeys will still arrive.</p>
          </>
        ) : state === "invalid" ? (
          <>
            <MailX className="mx-auto size-10 text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-bold">This link isn't valid</h1>
            <p className="mt-2 text-muted-foreground">Please use the unsubscribe link from your most recent offer email, or contact us and we'll remove you.</p>
          </>
        ) : (
          <>
            <MailX className="mx-auto size-10 text-[var(--gold-ink)]" />
            <h1 className="mt-3 font-display text-2xl font-bold">Stop offer emails?</h1>
            <p className="mt-2 text-muted-foreground">You'll stop receiving discounts and offers. Emails about your bookings are not affected.</p>
            <Button variant="gold" className="mt-6 rounded-full" disabled={state === "busy"} onClick={confirm}>
              {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
            </Button>
          </>
        )}
        <div className="mt-8"><Link to="/" className="text-sm font-semibold text-[var(--gold-ink)]">Back to home</Link></div>
      </section>
    </SiteLayout>
  );
}
