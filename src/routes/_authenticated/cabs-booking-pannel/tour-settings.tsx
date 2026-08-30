import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTourSettings, updateTourSettings } from "@/lib/scenic-admin.functions";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/admin/ui";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "tour-settings"], queryFn: () => getTourSettings() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/tour-settings")({
  head: () => ({
    meta: [
      { title: "Tour Settings — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: tour settings." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: TourSettingsPage,
});

const DEFAULTS = {
  sightseeing_threshold_minutes: 30,
  tour_threshold_minutes: 120,
  tour_threshold_stops: 3,
  max_selected_stops: 8,
  included_stop_minutes: 15,
  price_per_extra_15min_pence: 500,
  max_detour_miles: 50,
  max_detour_minutes: 90,
  poi_discovery_enabled: false,
};

function TourSettingsPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const save = useServerFn(updateTourSettings);
  const [form, setForm] = useState<any>({ ...DEFAULTS, ...(data ?? {}) });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...DEFAULTS, ...(data ?? {}) }); }, [data]);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: form });
      toast.success("Settings updated");
      await qc.invalidateQueries({ queryKey: ["admin", "tour-settings"] });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ k, label, hint, type = "number" }: any) => (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[k] ?? ""}
        onChange={(e) => setForm({ ...form, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Tour Settings" description="Thresholds and pricing for sightseeing and private tours." />
      <div className="admin-card p-5 space-y-5">
        <section>
          <h2 className="text-sm font-semibold mb-3">Classification thresholds</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field k="sightseeing_threshold_minutes" label="Sightseeing threshold (min)" hint="Total attraction minutes to become a sightseeing transfer." />
            <Field k="tour_threshold_minutes" label="Tour threshold (min)" hint="Total attraction minutes to become a private tour." />
            <Field k="tour_threshold_stops" label="Tour threshold (stops)" hint="Attraction stops needed to trigger tour conversion." />
            <Field k="max_selected_stops" label="Max selected stops" />
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-3">Stop pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field k="included_stop_minutes" label="Included minutes per stop" />
            <Field k="price_per_extra_15min_pence" label="Extra 15-min block (pence)" />
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-3">Detour limits</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field k="max_detour_miles" label="Max detour (miles)" />
            <Field k="max_detour_minutes" label="Max detour (minutes)" />
          </div>
        </section>
        <section className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <Label>Live POI discovery (Search Along Route)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              When off, only curated template POIs are offered — no extra Google Routes cost.
            </p>
          </div>
          <Switch
            checked={!!form.poi_discovery_enabled}
            onCheckedChange={(v) => setForm({ ...form, poi_discovery_enabled: v })}
          />
        </section>
        <div className="flex justify-end pt-2">
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </div>
  );
}
