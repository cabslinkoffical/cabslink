import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordMarketingOptIn } from "@/lib/marketing.functions";

type Source = "booking" | "tour_booking" | "hourly_booking" | "custom_tour" | "contact" | "corporate" | "tour_enquiry";

/**
 * Unticked "send me offers" box. Consent is saved only after the form it
 * sits in has been submitted successfully (call `record`).
 */
export function useMarketingOptIn(source: Source) {
  const [checked, setChecked] = useState(false);
  const save = useServerFn(recordMarketingOptIn);
  const record = (p: { email?: string | null; name?: string | null; phone?: string | null }) => {
    if (!checked || !p.email) return;
    void save({ data: { email: p.email, name: p.name ?? "", phone: p.phone ?? "", source } }).catch(() => { /* consent is optional; never block the form */ });
  };
  const element = (
    <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--navy)]"
      />
      <span>Email me occasional offers and discount codes. You can unsubscribe at any time.</span>
    </label>
  );
  return { checked, element, record };
}
