import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, CalendarDays, Car, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmailCalendar } from "@/lib/marketing.functions";
import { monthGrid, campaignSendDays, afterTripDay, type CalendarTrip, type CalendarRule, type CalendarCampaign } from "@/lib/email-calendar";
import { ukDate } from "@/lib/uk-time";

type Item = { kind: "trip" | "campaign" | "auto"; label: string; detail: string };

function shiftMonth(m: string, by: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const STYLE: Record<Item["kind"], string> = {
  trip: "bg-primary/10 text-primary border-primary/20",
  campaign: "bg-accent/20 text-foreground border-accent/40",
  auto: "bg-success/15 text-success border-success/30",
};
const ICON = { trip: Car, campaign: Mail, auto: Zap };

export function EmailCalendar() {
  const today = ukDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);
  const fetchCal = useServerFn(getEmailCalendar);
  const q = useQuery({ queryKey: ["admin", "email-calendar", month], queryFn: () => fetchCal({ data: { month } }) });

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    const add = (d: string, it: Item) => { if (!map.has(d)) map.set(d, []); map.get(d)!.push(it); };
    if (!q.data) return map;
    const { from, to } = q.data;
    for (const t of q.data.trips as CalendarTrip[]) {
      if (t.date >= from && t.date <= to) add(t.date, { kind: "trip", label: `${t.time?.slice(0, 5) ?? ""} ${t.name}`.trim(), detail: `${t.ref} · ${t.kind}${t.status === "cancelled" ? " · cancelled" : ""}` });
      for (const r of q.data.rules as CalendarRule[]) {
        const d = afterTripDay(t, r);
        if (d && d >= from && d <= to && d >= today) add(d, { kind: "auto", label: r.name, detail: `For ${t.name} (${t.ref}), if the trip is completed` });
      }
    }
    for (const c of q.data.campaigns as CalendarCampaign[]) {
      for (const d of campaignSendDays(c, from, to)) add(d, { kind: "campaign", label: c.name, detail: `Scheduled campaign at ${String(c.sendHour).padStart(2, "0")}:00 UK time` });
    }
    return map;
  }, [q.data, today]);

  const weeks = monthGrid(month);
  const title = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const dayItems = picked ? byDay.get(picked) ?? [] : [];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold"><CalendarDays className="size-5" />Calendar of trips and emails</h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="size-4" /></Button>
          <span className="w-36 text-center text-sm font-medium">{title}</span>
          <Button size="icon" variant="outline" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="size-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => { setMonth(today.slice(0, 7)); setPicked(today); }}>Today</Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(["trip", "campaign", "auto"] as const).map((k) => { const I = ICON[k]; return <span key={k} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${STYLE[k]}`}><I className="size-3" />{k === "trip" ? "Trip" : k === "campaign" ? "Scheduled campaign" : "Automatic thank-you (expected)"}</span>; })}
      </div>
      {q.isError ? <p className="text-sm text-destructive">Could not load the calendar: {(q.error as Error).message}</p> : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[680px] grid-cols-7 gap-px overflow-hidden rounded border border-border bg-border text-xs">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-muted px-2 py-1 font-semibold">{d}</div>)}
            {weeks.flat().map((d, i) => {
              const items = d ? byDay.get(d) ?? [] : [];
              return (
                <button key={i} type="button" disabled={!d} onClick={() => d && setPicked(d)}
                  className={`min-h-24 bg-card p-1.5 text-left align-top ${!d ? "bg-muted/40" : "hover:bg-muted/50"} ${d === picked ? "ring-2 ring-inset ring-primary" : ""}`}>
                  {d && <div className={`mb-1 font-semibold ${d === today ? "text-primary" : ""}`}>{Number(d.slice(8))}</div>}
                  {items.slice(0, 3).map((it, j) => <div key={j} className={`mb-0.5 truncate rounded border px-1 ${STYLE[it.kind]}`}>{it.label}</div>)}
                  {items.length > 3 && <div className="text-muted-foreground">+{items.length - 3} more</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {q.isLoading && <p className="mt-2 text-xs text-muted-foreground">Loading…</p>}
      {picked && (
        <div className="mt-4 rounded border border-border p-3">
          <div className="mb-2 text-sm font-semibold">{new Date(`${picked}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</div>
          {dayItems.length === 0 ? <p className="text-xs text-muted-foreground">Nothing on this day.</p> : (
            <ul className="space-y-1.5 text-sm">{dayItems.map((it, j) => { const I = ICON[it.kind]; return (
              <li key={j} className="flex items-start gap-2"><I className="mt-0.5 size-4 shrink-0" /><div><div className="font-medium">{it.label}</div><div className="text-xs text-muted-foreground">{it.detail}</div></div></li>
            ); })}</ul>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Times are UK time. Paused or draft campaigns are not shown. "Come back" and enquiry emails depend on each person's later activity, so they are not placed on the calendar.</p>
    </section>
  );
}
