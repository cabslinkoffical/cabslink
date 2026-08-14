import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Ban, CheckCircle2 } from "lucide-react";

type Rule = {
  id: string;
  name: string;
  effect: string;
  rule_scope: string;
  active: boolean;
  priority: number;
  date_from: string | null;
  date_to: string | null;
  days_of_week: number[] | null;
  time_from: string | null;
  time_to: string | null;
  reason: string | null;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A rule applies to a calendar day when its date window and weekday mask allow it. */
export function ruleAppliesOn(rule: Rule, day: Date): boolean {
  if (!rule.active) return false;
  const key = iso(day);
  if (rule.date_from && key < rule.date_from) return false;
  if (rule.date_to && key > rule.date_to) return false;
  const dow = day.getDay(); // 0 = Sunday, matching the rule editor's DAYS order
  if (rule.days_of_week && rule.days_of_week.length > 0 && !rule.days_of_week.includes(dow)) return false;
  return true;
}

export function AvailabilityCalendar({ rules, onSelectRule }: { rules: Rule[]; onSelectRule?: (r: Rule) => void }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    // Grid starts on Monday
    const offset = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - offset);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    const out: Date[][] = [];
    for (let i = 0; i < 42; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cursor]);

  const forDay = (d: Date) => rules.filter((r) => ruleAppliesOn(r, d));
  const selectedRules = selected ? forDay(new Date(`${selected}T12:00:00`)) : [];

  const monthLabel = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{monthLabel}</div>
        <div className="flex gap-1">
          <Button aria-label="Previous month" size="sm" variant="outline"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
          <Button aria-label="Next month" size="sm" variant="outline"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          {DAY_LABELS.map((d) => <div key={d} className="p-2 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const key = iso(d);
            const dayRules = forDay(d);
            const blocked = dayRules.some((r) => r.effect === "block");
            const allowed = dayRules.some((r) => r.effect === "allow");
            const isToday = key === iso(today);
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected(key)}
                aria-label={`${key}${blocked ? " — blocked" : ""}`}
                className={`min-h-20 border-t border-l border-border p-1.5 text-left align-top transition-colors hover:bg-accent/40 ${
                  inMonth ? "" : "opacity-40"
                } ${selected === key ? "bg-accent/60" : ""}`}
              >
                <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
                <div className="mt-1 space-y-0.5">
                  {blocked && (
                    <div className="flex items-center gap-1 rounded bg-destructive/10 px-1 py-0.5 text-[10px] text-destructive">
                      <Ban className="size-3 shrink-0" /> Blocked
                    </div>
                  )}
                  {allowed && (
                    <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-1 py-0.5 text-[10px] text-emerald-700">
                      <CheckCircle2 className="size-3 shrink-0" /> Allow
                    </div>
                  )}
                  {dayRules.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">+{dayRules.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-semibold">{new Date(`${selected}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          {selectedRules.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Fully bookable — no active rules match this date.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {selectedRules.sort((a, b) => a.priority - b.priority).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5 font-medium">
                      {r.effect === "block" ? <Ban className="size-3.5 text-destructive" /> : <CheckCircle2 className="size-3.5 text-emerald-600" />}
                      {r.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.rule_scope} · priority {r.priority}
                      {(r.time_from || r.time_to) ? ` · ${r.time_from ?? "00:00"}–${r.time_to ?? "23:59"}` : " · all day"}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </div>
                  </div>
                  {onSelectRule && (
                    <Button size="sm" variant="ghost" onClick={() => onSelectRule(r)}>Edit</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
