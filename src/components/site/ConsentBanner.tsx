/**
 * Region-gated analytics consent banner.
 *
 * Only rendered for visitors located in a region that requires consent, and
 * only while they have not decided. Accepting and declining are equally easy,
 * and the choice can be changed later from the footer ("Cookie settings").
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { analyticsAllowed, onConsentChange, readConsent, regionRequiresConsent, setConsent } from "@/lib/consent";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    const evaluate = async () => {
      const decided = readConsent() !== "unset";
      if (decided) { if (alive) setVisible(false); return; }
      const needed = await regionRequiresConsent();
      if (alive) setVisible(needed);
    };
    void evaluate();
    const off = onConsentChange(() => { void evaluate(); });
    return () => { alive = false; off(); };
  }, []);

  if (!visible) return null;

  const decide = (choice: "granted" | "denied") => {
    setConsent(choice);
    setVisible(false);
    void analyticsAllowed();
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--gold)]/30 bg-[var(--navy)] text-white shadow-2xl">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <div className="text-sm leading-relaxed">
            <p className="font-display text-base font-semibold text-[var(--gold)]">We value your privacy</p>
            <p className="mt-1 text-white/80">
              We use analytics cookies to understand how our website is used so we can improve booking. They are
              off until you accept. See our{" "}
              <Link to="/cookies" className="underline decoration-[var(--gold)] underline-offset-2 hover:text-white">Cookie Policy</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline decoration-[var(--gold)] underline-offset-2 hover:text-white">Privacy Policy</Link>.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col md:flex-row">
            <button
              type="button"
              onClick={() => decide("denied")}
              className="flex-1 rounded-full border border-white/40 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => decide("granted")}
              className="flex-1 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
