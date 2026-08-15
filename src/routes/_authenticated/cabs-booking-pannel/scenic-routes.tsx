import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listScenicTemplates,
  setScenicTemplateActive,
  publishScenicTemplate,
  updateScenicTemplateMeta,
  refreshScenicTemplateStartingPrice,
} from "@/lib/scenic-admin.functions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

const opts = queryOptions({
  queryKey: ["admin", "scenic-templates"],
  queryFn: () => listScenicTemplates(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/scenic-routes")({
  head: () => ({
    meta: [
      { title: "Scenic Routes — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: scenic routes." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: ScenicRoutesPage,
});

function ScenicRoutesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const toggleActive = useServerFn(setScenicTemplateActive);
  const togglePublish = useServerFn(publishScenicTemplate);
  const updateMeta = useServerFn(updateScenicTemplateMeta);
  const refreshPrice = useServerFn(refreshScenicTemplateStartingPrice);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const poisByTpl = new Map<string, any[]>();
  for (const row of data.template_pois as any[]) {
    const list = poisByTpl.get(row.route_template_id) ?? [];
    list.push(row);
    poisByTpl.set(row.route_template_id, list);
  }

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "scenic-templates"] });

  const withPending = async (id: string, key: string, fn: () => Promise<void>) => {
    setPending((p) => ({ ...p, [`${id}:${key}`]: true }));
    try {
      await fn();
    } finally {
      setPending((p) => ({ ...p, [`${id}:${key}`]: false }));
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Scenic Route Templates"
        description="Curated multi-stop templates. Activate first, then publish to expose the tour on the public site."
      />
      {data.templates.length === 0 ? (
        <EmptyState title="No templates yet" />
      ) : (
        <div className="space-y-6">
          {data.templates.map((t: any) => {
            const stops = poisByTpl.get(t.id) ?? [];
            const activePoiCount = stops.filter(
              (s: any) => s.points_of_interest?.active && s.points_of_interest?.place_id,
            ).length;
            const missing = stops.length - activePoiCount;
            const canPublish =
              !!t.active &&
              !!t.slug &&
              !!t.origin_place_id &&
              !!t.destination_place_id &&
              activePoiCount > 0;
            return (
              <TemplateCard
                key={t.id}
                template={t}
                stops={stops}
                missing={missing}
                canPublish={canPublish}
                pending={pending}
                onToggleActive={(v) =>
                  withPending(t.id, "active", async () => {
                    try {
                      await toggleActive({ data: { id: t.id, active: v } });
                      toast.success(v ? "Activated" : "Deactivated");
                      await invalidate();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  })
                }
                onTogglePublish={(v) =>
                  withPending(t.id, "publish", async () => {
                    try {
                      await togglePublish({ data: { id: t.id, published: v } });
                      toast.success(v ? "Published" : "Unpublished");
                      await invalidate();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  })
                }
                onSaveMeta={(patch) =>
                  withPending(t.id, "meta", async () => {
                    try {
                      await updateMeta({ data: { id: t.id, ...patch } });
                      toast.success("Details saved");
                      await invalidate();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  })
                }
                onRefreshPrice={() =>
                  withPending(t.id, "price", async () => {
                    try {
                      const r = await refreshPrice({ data: { id: t.id } });
                      toast.success(
                        r.price_pence != null
                          ? `Starting price refreshed (£${(r.price_pence / 100).toFixed(0)})`
                          : "Price cleared — check pricing setup",
                      );
                      await invalidate();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  })
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template: t,
  stops,
  missing,
  canPublish,
  pending,
  onToggleActive,
  onTogglePublish,
  onSaveMeta,
  onRefreshPrice,
}: {
  template: any;
  stops: any[];
  missing: number;
  canPublish: boolean;
  pending: Record<string, boolean>;
  onToggleActive: (v: boolean) => void;
  onTogglePublish: (v: boolean) => void;
  onSaveMeta: (patch: {
    hero_image_url?: string | null;
    short_description?: string | null;
    theme?: string | null;
    recommended_start_time?: string | null;
  }) => void;
  onRefreshPrice: () => void;
}) {
  const [hero, setHero] = useState<string>(t.hero_image_url ?? "");
  const [short, setShort] = useState<string>(t.short_description ?? "");
  const [theme, setTheme] = useState<string>(t.theme ?? "");
  const [startTime, setStartTime] = useState<string>(t.recommended_start_time ?? "");

  const dirty =
    hero !== (t.hero_image_url ?? "") ||
    short !== (t.short_description ?? "") ||
    theme !== (t.theme ?? "") ||
    startTime !== (t.recommended_start_time ?? "");

  const priceLabel =
    t.starting_price_pence_cache != null
      ? `£${(t.starting_price_pence_cache / 100).toFixed(0)} ${t.starting_price_currency ?? "GBP"}`
      : "Not calculated";

  return (
    <div className="admin-card p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{t.name}</h3>
            <span className="text-xs text-muted-foreground">/{t.slug}</span>
            {t.published ? (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-success/10 text-success">
                Live
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Draft
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
          <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
            <span>Service: {t.service_type}</span>
            <span>Bidirectional: {t.bidirectional ? "yes" : "no"}</span>
            <span>Fee: £{((t.tour_fee_pence ?? 0) / 100).toFixed(2)}</span>
            <span>Starting: {priceLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Active
            <Switch
              checked={!!t.active}
              disabled={!!pending[`${t.id}:active`]}
              onCheckedChange={onToggleActive}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Published
            <Switch
              checked={!!t.published}
              disabled={!!pending[`${t.id}:publish`] || (!t.published && !canPublish)}
              onCheckedChange={onTogglePublish}
            />
          </label>
        </div>
      </div>

      {!canPublish && !t.published && (
        <p className="text-xs text-warning mt-2">
          To publish: activate the template, set origin/destination Place IDs, and add at least
          one active POI with a Place ID.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Hero image URL</Label>
          <Input
            value={hero}
            onChange={(e) => setHero(e.target.value)}
            placeholder="https://…/hero.jpg"
          />
        </div>
        <div>
          <Label className="text-xs">Theme</Label>
          <Input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Highlands"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Short description (listing card)</Label>
          <Input
            value={short}
            onChange={(e) => setShort(e.target.value)}
            placeholder="One-line pitch for the tour listing"
          />
        </div>
        <div>
          <Label className="text-xs">Recommended start time</Label>
          <Input
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="e.g. 08:30"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!dirty || !!pending[`${t.id}:meta`]}
          onClick={() =>
            onSaveMeta({
              hero_image_url: hero.trim() || null,
              short_description: short.trim() || null,
              theme: theme.trim() || null,
              recommended_start_time: startTime.trim() || null,
            })
          }
        >
          {pending[`${t.id}:meta`] && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Save details
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!pending[`${t.id}:price`]}
          onClick={onRefreshPrice}
        >
          {pending[`${t.id}:price`] ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh starting price
        </Button>
        {t.starting_price_calculated_at && (
          <span className="text-[11px] text-muted-foreground">
            Last calc: {new Date(t.starting_price_calculated_at).toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/50 divide-y divide-border">
        {stops.map((s: any, i: number) => {
          const poi = s.points_of_interest;
          const bad = !poi?.active || !poi?.place_id;
          return (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                <span className={bad ? "text-warning" : ""}>{poi?.name ?? "—"}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {bad ? "needs Place ID / activation" : s.default_selected ? "default on" : "optional"}
              </span>
            </div>
          );
        })}
      </div>
      {missing > 0 && (
        <p className="text-xs text-warning mt-2">
          {missing} stop(s) missing Place ID or not active.
        </p>
      )}
    </div>
  );
}
