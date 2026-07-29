import { AlertTriangle } from "lucide-react";

const LEGAL_PAGES = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms & Conditions", path: "/terms" },
  { label: "Cookie Policy", path: "/cookies" },
  { label: "Booking & Cancellation", path: "/booking-policy" },
  { label: "Refund Policy", path: "/refund-policy" },
  { label: "Accessibility", path: "/accessibility" },
];

/**
 * Admin-only banner. Static reminder that legal pages contain
 * `[ADMIN TO COMPLETE]` markers and must be finalised before public launch.
 * Not shown on the public site; not a hard deploy gate.
 */
export function LegalReadinessBanner() {
  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs text-foreground">
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
        <div>
          <strong className="block">Pre-launch: legal pages need finalising.</strong>
          <p className="mt-1 text-muted-foreground">
            The following pages contain <code>[ADMIN TO COMPLETE]</code> placeholders that must be replaced with the
            operating company's real details (registration, VAT, ICO, jurisdiction, refund windows) before you go live:
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {LEGAL_PAGES.map((p) => (
              <li key={p.path}>
                <a href={p.path} target="_blank" rel="noreferrer" className="underline hover:text-warning">{p.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
