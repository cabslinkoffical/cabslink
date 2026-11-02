/** Manual or automatic tour pricing, shared by the add-tour dialog and the tour price editor. */
export type PriceMode = "manual" | "auto";

const OPTIONS: Array<{ value: PriceMode; title: string; body: string }> = [
  { value: "manual", title: "Set prices myself", body: "Type a fixed price for each vehicle." },
  {
    value: "auto",
    title: "Work it out automatically",
    body: "Each vehicle's hourly rate × tour hours, plus the tour's route miles × its mile rate. Updates when rates change.",
  },
];

export function PriceModeChoice({ value, onChange }: { value: PriceMode; onChange: (v: PriceMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Tour price" className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg border p-3 text-left text-sm transition-colors ${
            value === o.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted"
          }`}
        >
          <span className="block font-semibold">{o.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{o.body}</span>
        </button>
      ))}
    </div>
  );
}
