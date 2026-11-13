import { runSeoChecks, type SeoCheckInput } from "@/lib/seo-live-checks";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/** Google-style preview plus live checklist for any admin editor. */
export function SeoLiveCheck({ path, ...input }: SeoCheckInput & { path?: string }) {
  const checks = runSeoChecks(input);
  const passed = checks.filter((c) => c.ok).length;
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-[11px] text-muted-foreground truncate">cabslink.com{path ?? ""}</p>
        <p className="text-base font-medium text-primary truncate">{input.title || "Page title"}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{input.description || "Description shown on Google."}</p>
      </div>
      <p className="text-xs font-semibold">Search checklist · {passed}/{checks.length} passed</p>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs">
            {c.ok ? <CheckCircle2 className="size-3.5 text-success shrink-0" /> : c.level === "error"
              ? <XCircle className="size-3.5 text-destructive shrink-0" /> : <AlertTriangle className="size-3.5 text-warning shrink-0" />}
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
