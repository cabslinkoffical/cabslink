import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/admin/ui";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  getTourHoursConfig,
  saveTourTier,
  deleteTourTier,
  saveTourRules,
  saveClassTourRates,
  saveTemplateTourSettings,
  type TourHoursConfig,
} from "@/lib/tour-hours-admin.functions";

const opts = queryOptions({
  queryKey: ["admin", "tour-hours"],
  queryFn: () => getTourHoursConfig(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/tour-hours")({
  head: () => ({
    meta: [
      { title: "Tour Hours & Mileage — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: tour hours, mileage allowances and tour rates." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: TourHoursPage,
});

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function TourHoursPage() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Tour Hours & Mileage"
        description="Customers buy a block of hours; each block carries a mileage allowance. Miles above the allowance are charged. Hours cannot be exceeded."
      />
      <Tabs defaultValue="tiers">
        <TabsList className="mb-5 flex-wrap">
          <TabsTrigger value="tiers">Hours &amp; mileage</TabsTrigger>
          <TabsTrigger value="rules">Tour rules</TabsTrigger>
          <TabsTrigger value="rates">Vehicle rates</TabsTrigger>
          <TabsTrigger value="premade">Premade tours</TabsTrigger>
        </TabsList>
        <TabsContent value="tiers"><TiersTab tiers={data.tiers} /></TabsContent>
        <TabsContent value="rules"><RulesTab rules={data.rules} /></TabsContent>
        <TabsContent value="rates"><RatesTab classes={data.classes} /></TabsContent>
        <TabsContent value="premade"><PremadeTab templates={data.templates} classes={data.classes} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ Hours & mileage ------------------------------ */

function TiersTab({ tiers }: { tiers: TourHoursConfig["tiers"] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveTourTier);
  const remove = useServerFn(deleteTourTier);
  const [rows, setRows] = useState(tiers);
  const [busy, setBusy] = useState(false);

  useEffect(() => setRows(tiers), [tiers]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin", "tour-hours"] });
  }

  async function saveRow(r: TourHoursConfig["tiers"][number]) {
    setBusy(true);
    try {
      await save({
        data: {
          id: r.id.startsWith("new-") ? null : r.id,
          hours: r.hours,
          included_miles: r.included_miles,
          is_bookable: r.is_bookable,
          sort_order: r.sort_order,
        },
      });
      toast.success(`${r.hours} hours saved`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow(r: TourHoursConfig["tiers"][number]) {
    if (r.id.startsWith("new-")) {
      setRows(rows.filter((x) => x.id !== r.id));
      return;
    }
    if (!confirm(`Remove the ${r.hours}-hour option?`)) return;
    setBusy(true);
    try {
      await remove({ data: { id: r.id } });
      toast.success("Removed");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card p-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        One row per bookable duration. Nothing assumes a fixed miles-per-hour ratio — a ten-hour day can be
        deliberately more or less generous than two five-hour ones.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Hours</th>
              <th className="text-left px-3 py-2">Miles included</th>
              <th className="text-left px-3 py-2">Order</th>
              <th className="text-left px-3 py-2">Bookable</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Input
                    className="w-24"
                    type="number"
                    step="0.5"
                    value={r.hours}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...r, hours: Number(e.target.value) };
                      setRows(next);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="w-28"
                    type="number"
                    value={r.included_miles}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...r, included_miles: Number(e.target.value) };
                      setRows(next);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="w-20"
                    type="number"
                    value={r.sort_order}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...r, sort_order: Number(e.target.value) };
                      setRows(next);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Switch
                    checked={r.is_bookable}
                    onCheckedChange={(v) => {
                      const next = [...rows];
                      next[i] = { ...r, is_bookable: v };
                      setRows(next);
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button size="sm" disabled={busy} onClick={() => saveRow(rows[i]!)}>Save</Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => deleteRow(r)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        onClick={() =>
          setRows([
            ...rows,
            {
              id: `new-${Date.now()}`,
              hours: 0,
              included_miles: 0,
              is_bookable: true,
              sort_order: rows.length + 1,
            },
          ])
        }
      >
        <Plus className="size-4 mr-1" /> Add duration
      </Button>
    </div>
  );
}

/* --------------------------------- Rules --------------------------------- */

function RulesTab({ rules }: { rules: TourHoursConfig["rules"] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveTourRules);
  const [form, setForm] = useState(rules);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(rules), [rules]);

  if (!form) return <div className="admin-card p-5 text-sm">No tour rules row found.</div>;

  const F = ({ k, label, hint, type = "number" }: any) => (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={(form as any)[k] ?? ""}
        onChange={(e) =>
          setForm({ ...form, [k]: type === "number" ? Number(e.target.value) : e.target.value } as any)
        }
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="admin-card p-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <F k="earliest_start_time" label="Earliest start" type="time" />
        <F k="latest_finish_time" label="Latest finish" type="time" />
        <F k="max_bookable_hours" label="Longest bookable day (hours)" hint="Anything longer goes to an enquiry, not a quote." />
        <F k="minimum_stop_minutes" label="Shortest time at a stop (minutes)" hint="Every stop is costed at least this long in the tour clock. Customers can ask for longer, never shorter." />
        <F k="pickup_buffer_minutes" label="Pick-up buffer (minutes)" />
        <F k="mileage_tolerance_miles" label="Mileage tolerance (miles)" hint="Overage inside this band is not charged after the tour." />
        <F k="minimum_notice_hours" label="Minimum notice (hours)" />
        <F k="checkout_hold_minutes" label="Checkout hold (minutes)" hint="Unpaid tour bookings expire after this." />
        <F
          k="same_day_cutoff_time"
          label="Same-day booking closes at"
          type="time"
          hint="After this time today's tours can no longer be booked online."
        />
        <F
          k="poi_radius_factor"
          label="Suggested stop radius (share of the miles included)"
          hint="0.5 suggests places up to half the mileage allowance away, so the round trip still fits."
        />
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <Label>Allow same-day tours</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Turn off to stop today's tours being booked online at any time.
            </p>
          </div>
          <Switch
            checked={form.allow_same_day}
            onCheckedChange={(v) => setForm({ ...form, allow_same_day: v })}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await save({ data: form as any });
              toast.success("Tour rules saved");
              await qc.invalidateQueries({ queryKey: ["admin", "tour-hours"] });
            } catch (e: any) {
              toast.error(e.message ?? "Save failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save rules"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Vehicle rates ------------------------------ */

function RatesTab({ classes }: { classes: TourHoursConfig["classes"] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveClassTourRates);
  const [rows, setRows] = useState(classes);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setRows(classes), [classes]);

  const cols: Array<[keyof TourHoursConfig["classes"][number], string]> = [
    ["hourly_rate", "Hourly rate £"],
    ["extra_hour_rate", "Extra hour £"],
    ["extra_mile_rate", "Extra mile £"],
    ["min_hours", "Min hours"],
    ["max_hours", "Max hours"],
    ["max_passengers", "Max pax"],
    ["max_luggage", "Max bags"],
    ["max_tours_per_day", "Tours/day"],
  ];

  return (
    <div className="admin-card p-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        Hourly and extra-mile rates for custom tours, plus how many tours a day each class can take — a date at
        capacity is closed on the booking form.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Vehicle class</th>
              {cols.map(([, l]) => (
                <th key={l} className="text-left px-3 py-2">{l}</th>
              ))}
              <th className="text-right px-3 py-2">Save</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{c.name}</td>
                {cols.map(([k]) => (
                  <td key={String(k)} className="px-3 py-2">
                    <Input
                      className="w-24"
                      type="number"
                      step="0.01"
                      value={(c as any)[k] ?? ""}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...c, [k]: num(e.target.value) } as any;
                        setRows(next);
                      }}
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    disabled={busy === c.id}
                    onClick={async () => {
                      setBusy(c.id);
                      const r = rows[i]!;
                      try {
                        await save({
                          data: {
                            id: r.id,
                            hourly_rate: r.hourly_rate,
                            extra_hour_rate: r.extra_hour_rate,
                            extra_mile_rate: r.extra_mile_rate,
                            min_hours: r.min_hours,
                            max_hours: r.max_hours,
                            max_passengers: r.max_passengers,
                            max_luggage: r.max_luggage,
                            max_tours_per_day: r.max_tours_per_day,
                          },
                        });
                        toast.success(`${r.name} saved`);
                        await qc.invalidateQueries({ queryKey: ["admin", "tour-hours"] });
                      } catch (e: any) {
                        toast.error(e.message ?? "Save failed");
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Save
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Premade tours ------------------------------ */

function PremadeTab({
  templates,
  classes,
}: {
  templates: TourHoursConfig["templates"];
  classes: TourHoursConfig["classes"];
}) {
  const qc = useQueryClient();
  const save = useServerFn(saveTemplateTourSettings);
  const [rows, setRows] = useState(templates);
  const [openId, setOpenId] = useState<string | null>(templates[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setRows(templates), [templates]);

  const active = rows.find((t) => t.id === openId) ?? null;

  function patch(p: Partial<TourHoursConfig["templates"][number]>) {
    setRows(rows.map((t) => (t.id === openId ? { ...t, ...p } : t)));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="admin-card p-2 max-h-[540px] overflow-y-auto">
        {rows.map((t) => (
          <button
            key={t.id}
            onClick={() => setOpenId(t.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              t.id === openId ? "bg-navy text-navy-foreground" : "hover:bg-muted"
            }`}
          >
            <span className="block truncate font-medium">{t.name}</span>
            <span className="block text-xs opacity-75">
              {t.is_bookable ? "Bookable" : "Not bookable"}
              {t.default_duration_hours ? ` · ${t.default_duration_hours}h` : ""}
              {t.included_miles ? ` · ${t.included_miles} mi` : ""}
            </span>
          </button>
        ))}
      </div>

      {!active ? (
        <div className="admin-card p-5 text-sm text-muted-foreground">Select a tour.</div>
      ) : (
        <div className="admin-card p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">{active.name}</h2>
            <label className="flex items-center gap-2 text-sm">
              Bookable
              <Switch checked={active.is_bookable} onCheckedChange={(v) => patch({ is_bookable: v })} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Default duration (hours)</Label>
              <Input type="number" step="0.5" value={active.default_duration_hours ?? ""}
                onChange={(e) => patch({ default_duration_hours: num(e.target.value) })} />
            </div>
            <div>
              <Label>Miles included</Label>
              <Input type="number" value={active.included_miles ?? ""}
                onChange={(e) => patch({ included_miles: num(e.target.value) })} />
            </div>
            <div>
              <Label>Shortest duration (hours)</Label>
              <Input type="number" step="0.5" value={active.min_duration_hours ?? ""}
                onChange={(e) => patch({ min_duration_hours: num(e.target.value) })} />
            </div>
            <div>
              <Label>Longest duration (hours)</Label>
              <Input type="number" step="0.5" value={active.max_duration_hours ?? ""}
                onChange={(e) => patch({ max_duration_hours: num(e.target.value) })} />
            </div>
            <div>
              <Label>Start point</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={active.start_mode}
                onChange={(e) => patch({ start_mode: e.target.value })}
              >
                <option value="customer">Customer's own address</option>
                <option value="fixed">Fixed start point</option>
              </select>
            </div>
            <div>
              <Label>Fixed start address</Label>
              <Input
                value={active.fixed_start_address ?? ""}
                disabled={active.start_mode !== "fixed"}
                onChange={(e) => patch({ fixed_start_address: e.target.value || null })}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Fixed price per vehicle class</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Leave blank for a class that cannot take this tour. Added stops are charged on top by the mileage rules.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((c) => {
                const current = active.prices.find((p) => p.vehicle_class_id === c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{c.name}</span>
                    <Input
                      className="w-28"
                      type="number"
                      step="0.01"
                      value={current?.price ?? ""}
                      onChange={(e) => {
                        const v = num(e.target.value);
                        const others = active.prices.filter((p) => p.vehicle_class_id !== c.id);
                        patch({
                          prices: v == null ? others : [...others, { vehicle_class_id: c.id, price: v }],
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await save({
                    data: {
                      id: active.id,
                      is_bookable: active.is_bookable,
                      default_duration_hours: active.default_duration_hours,
                      min_duration_hours: active.min_duration_hours,
                      max_duration_hours: active.max_duration_hours,
                      included_miles: active.included_miles,
                      start_mode: active.start_mode as "customer" | "fixed",
                      fixed_start_address: active.fixed_start_address,
                      prices: active.prices,
                    },
                  });
                  toast.success("Tour saved");
                  await qc.invalidateQueries({ queryKey: ["admin", "tour-hours"] });
                } catch (e: any) {
                  toast.error(e.message ?? "Save failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save tour"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
