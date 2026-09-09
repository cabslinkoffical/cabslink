import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Loader2,
  MapPinned,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { BulkTools } from "@/components/admin/BulkTools";
import { MediaUrlInput } from "@/components/admin/media/MediaPicker";
import { EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  listScenicTemplates,
  publishScenicTemplate,
  refreshScenicTemplateStartingPrice,
  setScenicTemplateActive,
  updateScenicTemplateMeta,
} from "@/lib/scenic-admin.functions";

const opts = queryOptions({
  queryKey: ["admin", "scenic-templates"],
  queryFn: () => listScenicTemplates(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/scenic-routes")({
  head: () => ({
    meta: [
      { title: "Scenic Routes — Cabslink Admin" },
      { name: "description", content: "Manage Cabslink scenic route templates and publishing." },
      { property: "og:title", content: "Scenic Routes — Cabslink Admin" },
      { property: "og:description", content: "Manage Cabslink scenic route templates and publishing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: ScenicRoutesPage,
});

type StatusFilter = "all" | "live" | "draft" | "attention";

function ScenicRoutesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const toggleActive = useServerFn(setScenicTemplateActive);
  const togglePublish = useServerFn(publishScenicTemplate);
  const updateMeta = useServerFn(updateScenicTemplateMeta);
  const refreshPrice = useServerFn(refreshScenicTemplateStartingPrice);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(data.templates[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const poisByTpl = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of data.template_pois as any[]) {
      const list = map.get(row.route_template_id) ?? [];
      list.push(row);
      map.set(row.route_template_id, list);
    }
    return map;
  }, [data.template_pois]);

  const routeHealth = (template: any) => {
    const stops = poisByTpl.get(template.id) ?? [];
    const activePoiCount = stops.filter(
      (stop: any) => stop.points_of_interest?.active && stop.points_of_interest?.place_id,
    ).length;
    const missing = stops.length - activePoiCount;
    const canPublish =
      !!template.active &&
      !!template.slug &&
      !!template.origin_place_id &&
      !!template.destination_place_id &&
      activePoiCount > 0;
    return { stops, missing, canPublish };
  };

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.templates.filter((template: any) => {
      const { missing, canPublish } = routeHealth(template);
      const matchesSearch =
        !term ||
        template.name?.toLowerCase().includes(term) ||
        template.slug?.toLowerCase().includes(term) ||
        template.theme?.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "live" && template.published) ||
        (filter === "draft" && !template.published) ||
        (filter === "attention" && (missing > 0 || (!template.published && !canPublish)));
      return matchesSearch && matchesFilter;
    });
  }, [data.templates, filter, poisByTpl, search]);

  const selected =
    data.templates.find((template: any) => template.id === selectedId) ?? filteredTemplates[0] ?? null;
  const liveCount = data.templates.filter((template: any) => template.published).length;
  const attentionCount = data.templates.filter((template: any) => {
    const health = routeHealth(template);
    return health.missing > 0 || (!template.published && !health.canPublish);
  }).length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "scenic-templates"] });
  const withPending = async (id: string, key: string, fn: () => Promise<void>) => {
    setPending((current) => ({ ...current, [`${id}:${key}`]: true }));
    try {
      await fn();
    } finally {
      setPending((current) => ({ ...current, [`${id}:${key}`]: false }));
    }
  };

  const handleToggleActive = (template: any, active: boolean) =>
    withPending(template.id, "active", async () => {
      try {
        await toggleActive({ data: { id: template.id, active } });
        toast.success(active ? "Route activated" : "Route deactivated");
        await invalidate();
      } catch (error: any) {
        toast.error(error.message ?? "Unable to update route");
      }
    });

  const handleTogglePublish = (template: any, published: boolean) =>
    withPending(template.id, "publish", async () => {
      try {
        await togglePublish({ data: { id: template.id, published } });
        toast.success(published ? "Route published" : "Route moved to draft");
        await invalidate();
      } catch (error: any) {
        toast.error(error.message ?? "Unable to update publishing");
      }
    });

  if (data.templates.length === 0) {
    return (
      <div>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Scenic Routes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Build and publish curated day tours.</p>
          </div>
          <BulkTools entity="scenic_route_templates" onChanged={invalidate} />
        </div>
        <EmptyState title="No route templates yet" />
      </div>
    );
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-7.5rem)] flex-col overflow-hidden bg-muted md:-m-6">
      <header className="flex flex-col gap-4 border-b border-border bg-card px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="size-5 text-accent" aria-hidden />
            <h1 className="font-display text-2xl font-extrabold text-foreground">Scenic Routes</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.templates.length} templates · {liveCount} live · {attentionCount} need attention
          </p>
        </div>
        <BulkTools entity="scenic_route_templates" onChanged={invalidate} />
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex max-h-[34rem] flex-col border-b border-border bg-card lg:max-h-none lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border bg-muted/40 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search routes, themes or slugs"
                className="bg-card pl-9"
              />
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1" aria-label="Filter routes">
              {(["all", "live", "draft", "attention"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filter === value ? "secondary" : "ghost"}
                  className="h-8 px-1 text-[11px] capitalize"
                  onClick={() => setFilter(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No routes match this view.</p>
            ) : (
              filteredTemplates.map((template: any) => {
                const { stops, missing, canPublish } = routeHealth(template);
                const isSelected = selected?.id === template.id;
                return (
                  <Button
                    key={template.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedId(template.id)}
                    className={`h-auto w-full justify-start rounded-none border-b border-border px-5 py-4 text-left ${
                      isSelected ? "border-l-4 border-l-accent bg-accent/5" : "border-l-4 border-l-transparent"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-[10px] font-bold uppercase text-muted-foreground">
                          {template.theme || "Uncategorised"}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] font-bold uppercase ${
                            template.published ? "text-success" : "text-muted-foreground"
                          }`}
                        >
                          {template.published ? "Live" : "Draft"}
                        </span>
                      </span>
                      <span className="block truncate font-display text-sm font-bold text-foreground">
                        {template.name}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs font-normal text-muted-foreground">
                        <span>{stops.length} stops</span>
                        <span aria-hidden>·</span>
                        <span>{template.starting_price_pence != null ? `£${(template.starting_price_pence / 100).toFixed(0)}` : "No price"}</span>
                      </span>
                      {(missing > 0 || (!template.published && !canPublish)) && (
                        <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-warning">
                          <AlertTriangle className="size-3" /> Needs attention
                        </span>
                      )}
                    </span>
                  </Button>
                );
              })
            )}
          </div>
        </aside>

        <main className="overflow-y-auto bg-background">
          {selected ? (
            <RouteEditor
              key={selected.id}
              template={selected}
              {...routeHealth(selected)}
              pending={pending}
              onToggleActive={(active) => handleToggleActive(selected, active)}
              onTogglePublish={(published) => handleTogglePublish(selected, published)}
              onSaveMeta={(patch) =>
                withPending(selected.id, "meta", async () => {
                  try {
                    await updateMeta({ data: { id: selected.id, ...patch } });
                    toast.success("Route details saved");
                    await invalidate();
                  } catch (error: any) {
                    toast.error(error.message ?? "Unable to save route");
                  }
                })
              }
              onRefreshPrice={() =>
                withPending(selected.id, "price", async () => {
                  try {
                    const result = await refreshPrice({ data: { id: selected.id } });
                    toast.success(
                      result.price_pence != null
                        ? `Starting price refreshed (£${(result.price_pence / 100).toFixed(0)})`
                        : "Price cleared — check pricing setup",
                    );
                    await invalidate();
                  } catch (error: any) {
                    toast.error(error.message ?? "Unable to refresh price");
                  }
                })
              }
            />
          ) : (
            <div className="grid min-h-80 place-items-center text-sm text-muted-foreground">Select a route to manage it.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function RouteEditor({
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
  onToggleActive: (value: boolean) => void;
  onTogglePublish: (value: boolean) => void;
  onSaveMeta: (patch: {
    hero_image_url?: string | null;
    short_description?: string | null;
    theme?: string | null;
    recommended_start_time?: string | null;
  }) => void;
  onRefreshPrice: () => void;
}) {
  const [hero, setHero] = useState(t.hero_image_url ?? "");
  const [short, setShort] = useState(t.short_description ?? "");
  const [theme, setTheme] = useState(t.theme ?? "");
  const [startTime, setStartTime] = useState(t.recommended_start_time ?? "");
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
    <div className="mx-auto max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
      <div className="mb-7 flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold uppercase ${t.published ? "text-success" : "text-muted-foreground"}`}>
              {t.published ? "Live route" : "Draft route"}
            </span>
            <span className="text-xs text-muted-foreground">/{t.slug}</span>
          </div>
          <h2 className="font-display text-3xl font-extrabold text-foreground">{t.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-5 rounded-md border border-border bg-card px-4 py-3">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            Active
            <Switch
              checked={!!t.active}
              disabled={!!pending[`${t.id}:active`]}
              onCheckedChange={onToggleActive}
            />
          </Label>
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            Published
            <Switch
              checked={!!t.published}
              disabled={!!pending[`${t.id}:publish`] || (!t.published && !canPublish)}
              onCheckedChange={onTogglePublish}
            />
          </Label>
        </div>
      </div>

      {!canPublish && !t.published && (
        <div className="mb-7 flex gap-3 rounded-md border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>To publish, activate this route, set its origin and destination Place IDs, and keep at least one active stop with a Place ID.</p>
        </div>
      )}

      <section className="mb-9">
        <SectionHeading number="01" icon={SlidersHorizontal} title="Route details" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="mb-2 block text-xs uppercase text-muted-foreground">Hero image</Label>
            <MediaUrlInput folder="tours" value={hero} onChange={setHero} />
            {hero && (
              <div className="mt-3 flex items-center gap-3">
                <img src={hero} alt="" className="h-16 w-24 rounded-md border border-border object-cover" />
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ImageIcon className="size-3.5" /> Current route image</span>
              </div>
            )}
          </div>
          <div>
            <Label className="mb-2 block text-xs uppercase text-muted-foreground">Theme</Label>
            <Input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="e.g. Scottish Highlands" />
          </div>
          <div>
            <Label className="mb-2 block text-xs uppercase text-muted-foreground">Recommended start time</Label>
            <Input value={startTime} onChange={(event) => setStartTime(event.target.value)} placeholder="e.g. 08:30" />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-2 block text-xs uppercase text-muted-foreground">Short description</Label>
            <Input value={short} onChange={(event) => setShort(event.target.value)} placeholder="One-line pitch shown on the tour listing" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={!dirty || !!pending[`${t.id}:meta`]}
            onClick={() => onSaveMeta({
              hero_image_url: hero.trim() || null,
              short_description: short.trim() || null,
              theme: theme.trim() || null,
              recommended_start_time: startTime.trim() || null,
            })}
          >
            {pending[`${t.id}:meta`] && <Loader2 className="size-4 animate-spin" />}
            Save route details
          </Button>
        </div>
      </section>

      <section className="mb-9">
        <SectionHeading number="02" icon={Clock3} title="Pricing" />
        <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Current starting price</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{priceLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tour fee £{((t.tour_fee_pence ?? 0) / 100).toFixed(2)}
              {t.starting_price_calculated_at && ` · Last refreshed ${new Date(t.starting_price_calculated_at).toLocaleString()}`}
            </p>
          </div>
          <Button variant="outline" disabled={!!pending[`${t.id}:price`]} onClick={onRefreshPrice}>
            {pending[`${t.id}:price`] ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh price
          </Button>
        </div>
      </section>

      <section>
        <SectionHeading number="03" icon={MapPinned} title={`Stop sequence (${stops.length})`} />
        <div className="overflow-hidden rounded-md border border-border">
          {stops.map((stop: any, index: number) => {
            const poi = stop.points_of_interest;
            const bad = !poi?.active || !poi?.place_id;
            return (
              <div key={`${t.id}-${poi?.id ?? index}`} className="flex items-center gap-4 border-b border-border bg-card px-4 py-3 last:border-b-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted font-display text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${bad ? "text-warning" : "text-foreground"}`}>{poi?.name ?? "Unnamed stop"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stop.default_selected ? "Included by default" : "Optional stop"}
                    {stop.recommended_visit_minutes ? ` · ${stop.recommended_visit_minutes} min recommended` : ""}
                  </p>
                </div>
                {bad ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-warning"><AlertTriangle className="size-3.5" /> Fix required</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" /> Ready</span>
                )}
              </div>
            );
          })}
        </div>
        {missing > 0 && <p className="mt-3 text-xs text-warning">{missing} stop(s) need a Place ID or activation before publishing.</p>}
      </section>
    </div>
  );
}

function SectionHeading({ number, icon: Icon, title }: { number: string; icon: typeof MapPinned; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-xs font-bold text-accent">{number}</span>
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <h3 className="font-display text-lg font-bold uppercase text-foreground">{title}</h3>
    </div>
  );
}