import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { adminListHourlyRates, adminSaveHourlyRate } from "@/lib/hourly.functions";

const opts = queryOptions({ queryKey: ["admin", "hourly-rates"], queryFn: () => adminListHourlyRates() });

export const Route = createFileRoute("/_authenticated/admin/hourly-rates")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const saveFn = useServerFn(adminSaveHourlyRate);
  const [rows, setRows] = useState<Record<string, any>>({});

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "hourly-rates"] }); toast.success("Hourly rate saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const val = (r: any, key: string) => rows[r.vehicleId]?.[key] ?? r[key];
  const set = (id: string, key: string, v: any) =>
    setRows((s) => ({ ...s, [id]: { ...(s[id] ?? {}), [key]: v } }));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Hourly Hire Rates"
        description="Per-hour price, minimum and maximum hire length for each vehicle. Used by the hourly booking flow."
      />

      {data.length === 0 ? (
        <EmptyState title="No active vehicles" />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-3">Vehicle</th>
                <th className="text-left p-3">Capacity</th>
                <th className="text-left p-3">£ / hour</th>
                <th className="text-left p-3">Min hours</th>
                <th className="text-left p-3">Max hours</th>
                <th className="text-left p-3">Active</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.vehicleId} className="border-t border-border">
                  <td className="p-3 font-medium">{r.vehicleName}</td>
                  <td className="p-3 text-muted-foreground">{r.passengers} pax · {r.luggage} bags</td>
                  <td className="p-3">
                    <Input type="number" min={0} step="0.5" className="w-28"
                      value={val(r, "pricePerHour")}
                      onChange={(e) => set(r.vehicleId, "pricePerHour", Number(e.target.value))} />
                  </td>
                  <td className="p-3">
                    <Input type="number" min={1} max={24} className="w-20"
                      value={val(r, "minHours")}
                      onChange={(e) => set(r.vehicleId, "minHours", Number(e.target.value))} />
                  </td>
                  <td className="p-3">
                    <Input type="number" min={1} max={24} className="w-20"
                      value={val(r, "maxHours")}
                      onChange={(e) => set(r.vehicleId, "maxHours", Number(e.target.value))} />
                  </td>
                  <td className="p-3">
                    <Switch checked={!!val(r, "active")} onCheckedChange={(v) => set(r.vehicleId, "active", v)} />
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({
                          vehicleId: r.vehicleId,
                          pricePerHour: Number(val(r, "pricePerHour")) || 0,
                          minHours: Number(val(r, "minHours")) || 1,
                          maxHours: Number(val(r, "maxHours")) || 12,
                          active: !!val(r, "active"),
                        })
                      }
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
