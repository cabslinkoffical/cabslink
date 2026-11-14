import { useQuery } from "@tanstack/react-query";
import { listPublicExtras } from "@/lib/extras-public.functions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { coverName, coverPromise, type CancellationCover } from "@/lib/cancellation-cover";
import { cancellationCoverOffered } from "@/lib/uk-time";

export function DayBookingExtras({ classId, passengers, quantities, onChange, cover, onCover, pickupDate }: {
  classId: string; passengers: number; quantities: Record<string, number>;
  onChange: (key: string, quantity: number) => void; cover: CancellationCover; onCover: (v: CancellationCover) => void;
  pickupDate: string;
}) {
  const extras = useQuery({ queryKey: ["public-extras", classId], queryFn: () => listPublicExtras({ data: { classId } }), staleTime: 300_000 });
  const seats = (extras.data ?? []).filter((e) => e.category === "child_seat").reduce((t, e) => t + (quantities[e.key] ?? 0), 0);
  return <div className="space-y-4 border-t border-border pt-5">
    <h3 className="font-display text-lg font-bold">Extras</h3>
    {extras.isError ? <div className="text-sm text-destructive">Extras could not be loaded. <Button variant="outline" size="sm" onClick={() => extras.refetch()}>Try again</Button></div> : extras.isPending ? <p className="text-sm text-muted-foreground">Loading extras…</p> : null}
    {(["child_seat", "meet_greet", "waiting", "other"] as const).map((category) => {
      const items = (extras.data ?? []).filter((e) => e.category === category);
      if (!items.length) return null;
      return <div key={category}>
        <h4 className="mb-2 text-sm font-semibold">{category === "child_seat" ? "Child seats" : category === "meet_greet" ? "Meet & greet" : category === "waiting" ? "Waiting time" : "Other extras"}</h4>
        <div className="divide-y divide-border">{items.map((e) => {
          const n = quantities[e.key] ?? 0;
          const max = Math.min(e.max_quantity, category === "child_seat" ? Math.max(0, passengers - seats + n) : e.max_quantity);
          const single = e.price_basis === "per_booking" || e.max_quantity <= 1;
          const values = e.price_basis === "per_minute" ? [0, ...Array.from({ length: Math.floor(max / 15) }, (_, i) => (i + 1) * 15)] : Array.from({ length: Math.min(max, 600) + 1 }, (_, i) => i);
          return <div key={e.key} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-sm font-semibold">{e.name}</p>{e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}<p className="text-xs font-semibold text-gold-ink">£{(e.price_pence / 100).toFixed(2)}{e.price_basis === "per_hour" ? " per hour" : e.price_basis === "per_minute" ? " per minute" : category === "child_seat" ? " per seat" : ""}</p></div>
            {single ? <Switch aria-label={`Add ${e.name}`} checked={n > 0} onCheckedChange={(v) => onChange(e.key, v ? 1 : 0)} /> : <Select value={String(n)} onValueChange={(v) => onChange(e.key, Number(v))}><SelectTrigger className="w-24 shrink-0" aria-label={`${e.name} quantity`}><SelectValue /></SelectTrigger><SelectContent>{values.map((v) => <SelectItem key={v} value={String(v)}>{v === 0 ? "None" : `${v}${e.price_basis === "per_hour" ? " h" : e.price_basis === "per_minute" ? " min" : ""}`}</SelectItem>)}</SelectContent></Select>}
          </div>;
        })}</div>
      </div>;
    })}
    <h4 className="text-sm font-semibold">Cancellation cover</h4>
    <div className="grid gap-2">{(["standard", "flexible", "non_refundable"] as const).map((v) => <Button key={v} variant={cover === v ? "secondary" : "outline"} className="h-auto justify-start whitespace-normal py-3 text-left" aria-pressed={cover === v} onClick={() => onCover(v)}><span><span className="block font-semibold">{coverName(v)}</span><span className="block text-xs font-normal text-muted-foreground">{coverPromise(v)}</span></span></Button>)}</div>
  </div>;
}