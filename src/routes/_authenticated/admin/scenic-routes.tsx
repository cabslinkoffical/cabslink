import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listScenicTemplates, setScenicTemplateActive } from "@/lib/scenic-admin.functions";
import { Switch } from "@/components/ui/switch";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { toast } from "sonner";

const opts = queryOptions({
  queryKey: ["admin", "scenic-templates"],
  queryFn: () => listScenicTemplates(),
});

export const Route = createFileRoute("/_authenticated/admin/scenic-routes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: ScenicRoutesPage,
});

function ScenicRoutesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const toggle = useServerFn(setScenicTemplateActive);

  const poisByTpl = new Map<string, any[]>();
  for (const row of data.template_pois as any[]) {
    const list = poisByTpl.get(row.route_template_id) ?? [];
    list.push(row);
    poisByTpl.set(row.route_template_id, list);
  }

  async function onToggle(id: string, active: boolean) {
    try {
      await toggle({ data: { id, active } });
      toast.success(active ? "Template activated" : "Template deactivated");
      await qc.invalidateQueries({ queryKey: ["admin", "scenic-templates"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Scenic Route Templates"
        description="Curated multi-stop templates. Activate one only after every stop has a valid Place ID."
      />
      {data.templates.length === 0 ? (
        <EmptyState title="No templates yet" />
      ) : (
        <div className="space-y-4">
          {data.templates.map((t: any) => {
            const stops = poisByTpl.get(t.id) ?? [];
            const missing = stops.filter(
              (s: any) => !s.points_of_interest?.active || !s.points_of_interest?.place_id,
            ).length;
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{t.name}</h3>
                      <span className="text-xs text-muted-foreground">/{t.slug}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                      <span>Service: {t.service_type}</span>
                      <span>Bidirectional: {t.bidirectional ? "yes" : "no"}</span>
                      <span>Optimisation: {t.optimisation_allowed ? "allowed" : "locked"}</span>
                      <span>Fee: £{((t.tour_fee_pence ?? 0) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch checked={!!t.active} onCheckedChange={(v) => onToggle(t.id, v)} />
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-border bg-background/50 divide-y divide-border">
                  {stops.map((s: any, i: number) => {
                    const poi = s.points_of_interest;
                    const bad = !poi?.active || !poi?.place_id;
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="text-muted-foreground mr-2">{i + 1}.</span>
                          <span className={bad ? "text-amber-600" : ""}>{poi?.name ?? "—"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {bad ? "needs Place ID / activation" : "ready"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {missing > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    {missing} stop(s) missing Place ID or not active — cannot activate this template.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
