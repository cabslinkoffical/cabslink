import { TourContentEditor } from "@/components/admin/tours/TourContentEditor";
import { TourBuilder } from "@/components/admin/tours/TourBuilder";
import { duplicateTour } from "@/lib/tour-admin-tools.functions";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  ListChecks,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  SearchCheck,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { BulkTools } from "@/components/admin/BulkTools";
import { MediaUrlInput } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listScenicTemplates,
  publishScenicTemplate,
  refreshScenicTemplateStartingPrice,
  setScenicTemplateActive,
  updateScenicTemplateMeta,
} from "@/lib/scenic-admin.functions";
import { tourMetaDescription, tourMetaTitle, tourSeoChecks, tourTitleSource } from "@/lib/seo/tour-meta";

const opts = queryOptions({
  queryKey: ["admin", "scenic-templates"],
  queryFn: () => listScenicTemplates(),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/scenic-routes")({
  head: () => ({
    meta: [
      { title: "Tour Routes — Cabslink Admin" },
      { name: "description", content: "Manage Cabslink ready-made tours: pages, search listings, stops, prices and publishing." },
      { property: "og:title", content: "Tour Routes — Cabslink Admin" },
      { property: "og:description", content: "Manage Cabslink ready-made tours: pages, search listings, stops, prices and publishing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: ScenicRoutesPage,
});

type StatusFilter = "all" | "live" | "draft" | "attention";

const money = (pence: number | null | undefined) => (pence != null ? `£${Math.round(pence / 100).toLocaleString("en-GB")}` : null);

function ScenicRoutesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const toggleActive = useServerFn(setScenicTemplateActive);
  const togglePublish = useServerFn(publishScenicTemplate);
  const updateMeta = useServerFn(updateScenicTemplateMeta);
  const refreshPrice = useServerFn(refreshScenicTemplateStartingPrice);
  const copyTour = useServerFn(duplicateTour);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(data.templates[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("all");
  /** Step-by-step screen: closed, a new tour (null id) or an existing tour. */
  const [builder, setBuilder] = useState<{ id: string | null } | null>(null);
  const fromPrices = ((data as any).from_prices ?? {}) as Record<string, number | null>;
  const categoryNames = useMemo(
    () => Array.from(new Set((data.templates as any[]).map((t) => t.theme_group).filter(Boolean))).sort() as string[],
    [data.templates],
  );

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

  const seoById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tourSeoChecks>>();
    for (const t of data.templates as any[]) map.set(t.id, tourSeoChecks(t, (poisByTpl.get(t.id) ?? []).length));
    return map;
  }, [data.templates, poisByTpl]);

  const needsAttention = (template: any) => {
    const { missing, canPublish } = routeHealth(template);
    return missing > 0 || (!template.published && !canPublish) || fromPrices[template.id] == null;
  };

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.templates.filter((template: any) => {
      const matchesSearch =
        !term ||
        template.name?.toLowerCase().includes(term) ||
        template.slug?.toLowerCase().includes(term) ||
        template.theme?.toLowerCase().includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "live" && template.published) ||
        (filter === "draft" && !template.published) ||
        (filter === "attention" && needsAttention(template));
      const matchesCategory = category === "all" || (category === "none" ? !template.theme_group : template.theme_group === category);
      return matchesSearch && matchesFilter && matchesCategory;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.templates, filter, poisByTpl, search, category, fromPrices]);

  const selected =
    data.templates.find((template: any) => template.id === selectedId) ?? filteredTemplates[0] ?? null;
  const liveCount = data.templates.filter((template: any) => template.published).length;
  const attentionCount = data.templates.filter(needsAttention).length;
  const avgSeo = data.templates.length
    ? Math.round((data.templates as any[]).reduce((sum, t) => sum + (seoById.get(t.id)?.score ?? 0), 0) / data.templates.length)
    : 0;

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
        toast.success(active ? "Tour switched on" : "Tour switched off");
        await invalidate();
      } catch (error: any) {
        toast.error(error.message ?? "Unable to update tour");
      }
    });

  const handleTogglePublish = (template: any, published: boolean) =>
    withPending(template.id, "publish", async () => {
      try {
        await togglePublish({ data: { id: template.id, published } });
        toast.success(published ? "Tour is now on the website" : "Tour moved back to draft");
        await invalidate();
      } catch (error: any) {
        toast.error(error.message ?? "Unable to update publishing");
      }
    });

  const handleDuplicate = (template: any) =>
    withPending(template.id, "copy", async () => {
      try {
        const res = await copyTour({ data: { id: template.id } });
        await invalidate();
        setSelectedId(res.id);
        setFilter("all");
        setSearch("");
        setCategory("all");
        toast.success("Copied into a new draft. Rename it and change what you need.");
      } catch (error: any) {
        toast.error(error.message ?? "Unable to copy this tour");
      }
    });

  const stats: { label: string; value: string | number; tone?: "warn" }[] = [
    { label: "Tours", value: data.templates.length },
    { label: "On the website", value: liveCount },
    { label: "Drafts", value: data.templates.length - liveCount },
    { label: "Need attention", value: attentionCount, tone: attentionCount ? "warn" : undefined },
    { label: "Average SEO score", value: `${avgSeo}%` },
  ];

  return (
    <div className="-m-4 flex min-h-[calc(100vh-7.5rem)] flex-col bg-muted md:-m-6">
      <header className="border-b border-border bg-card px-5 py-5 lg:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <RouteIcon className="size-5 text-gold-ink" aria-hidden />
              <h1 className="font-display text-2xl font-extrabold text-foreground">Tour routes</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ready-made tours on the Tours page: their page, Google listing, stops, price and publishing.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button onClick={() => setBuilder({ id: null })}><Plus className="size-4" /> Create a tour</Button>
            <BulkTools entity="scenic_route_templates" onChanged={invalidate} />
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</dt>
              <dd className={`mt-1 font-display text-2xl font-extrabold ${s.tone === "warn" ? "text-gold-ink" : "text-foreground"}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex max-h-[36rem] flex-col border-b border-border bg-card lg:sticky lg:top-0 lg:max-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tours or web addresses"
                aria-label="Search tours"
                className="bg-background pl-9"
              />
            </div>
            <select
              aria-label="Filter by category"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="none">No category</option>
            </select>
            <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1" role="group" aria-label="Filter tours">
              {([
                ["all", "All"],
                ["live", "Live"],
                ["draft", "Drafts"],
                ["attention", "To fix"],
              ] as const).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filter === value ? "secondary" : "ghost"}
                  aria-pressed={filter === value}
                  className="h-8 px-1 text-xs"
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{filteredTemplates.length} of {data.templates.length} tours</p>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No tours match this view.</li>
            ) : (
              filteredTemplates.map((template: any) => {
                const { stops } = routeHealth(template);
                const isSelected = selected?.id === template.id;
                const price = money(fromPrices[template.id]);
                const seo = seoById.get(template.id)?.score ?? 0;
                return (
                  <li key={template.id} className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => setSelectedId(template.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                        isSelected ? "border-l-4 border-l-accent bg-accent/10" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                        {template.hero_image_url ? (
                          <img src={template.hero_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {template.theme_group || "No category"}
                          </span>
                          <StatusPill live={!!template.published} />
                        </span>
                        <span className="mt-0.5 block truncate font-display text-sm font-bold text-foreground">{template.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{stops.length} stops</span>
                          <span aria-hidden>·</span>
                          {price ? <span className="font-semibold text-foreground">From {price}</span> : <span className="font-semibold text-gold-ink">No price</span>}
                          <span aria-hidden>·</span>
                          <span className={seo >= 80 ? "text-foreground" : "text-gold-ink"}>SEO {seo}%</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <main className="min-w-0 bg-background">
          {selected ? (
            <RouteEditor
              key={selected.id}
              template={selected}
              fromPrice={fromPrices[selected.id] ?? null}
              seo={seoById.get(selected.id)!}
              {...routeHealth(selected)}
              pending={pending}
              onToggleActive={(active) => handleToggleActive(selected, active)}
              onTogglePublish={(published) => handleTogglePublish(selected, published)}
              onSaveMeta={(patch) =>
                withPending(selected.id, "meta", async () => {
                  try {
                    await updateMeta({ data: { id: selected.id, ...patch } });
                    toast.success("Tour details saved");
                    await invalidate();
                  } catch (error: any) {
                    toast.error(error.message ?? "Unable to save tour");
                  }
                })
              }
              onContentSaved={invalidate}
              onEditSteps={() => setBuilder({ id: selected.id })}
              onDuplicate={() => handleDuplicate(selected)}
              onRefreshPrice={() =>
                withPending(selected.id, "price", async () => {
                  try {
                    const result = await refreshPrice({ data: { id: selected.id } });
                    toast.success(
                      result.price_pence != null
                        ? `Saved price refreshed (£${(result.price_pence / 100).toFixed(0)})`
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
            <div className="grid min-h-80 place-items-center text-sm text-muted-foreground">Choose a tour on the left to manage it.</div>
          )}
        </main>
      </div>

      <TourBuilder
        open={!!builder}
        tourId={builder?.id ?? null}
        onClose={() => setBuilder(null)}
        onSaved={(id) => { setSelectedId(id); void invalidate(); }}
      />
    </div>
  );
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        live ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground ring-1 ring-border"
      }`}
    >
      <span className={`size-1.5 rounded-full ${live ? "bg-accent" : "bg-muted-foreground"}`} aria-hidden />
      {live ? "Live" : "Draft"}
    </span>
  );
}

function RouteEditor({
  template: t,
  fromPrice,
  seo,
  stops,
  missing,
  canPublish,
  pending,
  onToggleActive,
  onTogglePublish,
  onSaveMeta,
  onRefreshPrice,
  onContentSaved,
  onEditSteps,
  onDuplicate,
}: {
  template: any;
  fromPrice: number | null;
  seo: ReturnType<typeof tourSeoChecks>;
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
  onContentSaved: () => void;
  onEditSteps: () => void;
  onDuplicate: () => void;
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
  const hours = t.duration_hours ?? t.default_duration_hours;
  const pageUrl = `https://cabslink.com/tours/${t.slug}`;
  const passed = seo.checks.filter((c) => c.ok).length;

  const facts: { icon: typeof Clock3; label: string; value: string }[] = [
    { icon: Tag, label: "From price", value: money(fromPrice) ?? "Not set" },
    { icon: Clock3, label: "Length", value: hours ? `${hours} hours` : "Not set" },
    { icon: MapPinned, label: "Stops", value: String(stops.length) },
    { icon: SearchCheck, label: "SEO score", value: `${seo.score}%` },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
      {/* Summary */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid gap-0 md:grid-cols-[14rem_minmax(0,1fr)]">
          <div className="relative h-40 bg-muted md:h-full">
            {t.hero_image_url ? (
              <img src={t.hero_image_url} alt={`Main photo for ${t.name}`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground"><ImageIcon className="size-6" aria-hidden /></div>
            )}
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill live={!!t.published} />
              {t.theme_group && <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.theme_group}</span>}
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-foreground lg:text-3xl">{t.name}</h2>
            {t.published ? (
              <a href={`/tours/${t.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-gold-ink underline-offset-2 hover:underline">
                cabslink.com/tours/{t.slug} <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">cabslink.com/tours/{t.slug} · not on the website yet</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="rounded-md bg-muted/60 px-3 py-2">
                  <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <f.icon className="size-3" aria-hidden /> {f.label}
                  </dt>
                  <dd className="mt-0.5 font-display text-base font-bold text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onEditSteps}><ListChecks className="size-4" /> Edit step by step</Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/tour-preview/${t.id}`} target="_blank" rel="noreferrer"><Eye className="size-4" /> Preview page</a>
            </Button>
            <Button size="sm" variant="outline" disabled={!!pending[`${t.id}:copy`]} onClick={onDuplicate}>
              {pending[`${t.id}:copy`] ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} Copy into new draft
            </Button>
          </div>
          <div className="flex items-center gap-5">
            <Label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
              Switched on
              <Switch checked={!!t.active} disabled={!!pending[`${t.id}:active`]} onCheckedChange={onToggleActive} />
            </Label>
            <Label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
              On website
              <Switch
                checked={!!t.published}
                disabled={!!pending[`${t.id}:publish`] || (!t.published && !canPublish)}
                onCheckedChange={onTogglePublish}
              />
            </Label>
          </div>
        </div>
      </section>

      {!canPublish && !t.published && (
        <Notice>To put this tour on the website: switch it on, set its start and finish places, and keep at least one working stop.</Notice>
      )}
      {fromPrice == null && <Notice>This tour has no price yet, so the Tours page can't show a “From” price. Set it under Price.</Notice>}

      <Tabs defaultValue="seo" className="mt-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-card p-1 ring-1 ring-border">
          <TabsTrigger value="seo" className="gap-1.5"><SearchCheck className="size-4" aria-hidden /> Google &amp; SEO <span className="text-xs text-muted-foreground">{passed}/{seo.checks.length}</span></TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5"><FileText className="size-4" aria-hidden /> Page content</TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5"><SlidersHorizontal className="size-4" aria-hidden /> Listing details</TabsTrigger>
          <TabsTrigger value="stops" className="gap-1.5"><MapPinned className="size-4" aria-hidden /> Stops ({stops.length})</TabsTrigger>
          <TabsTrigger value="price" className="gap-1.5"><Tag className="size-4" aria-hidden /> Price</TabsTrigger>
        </TabsList>

        <TabsContent value="seo" className="mt-5 space-y-5">
          <Panel title="How it looks on Google" hint="This is the title and description the tour page gives search engines.">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="truncate text-xs text-muted-foreground">{pageUrl}</p>
              <p className="mt-1 text-lg leading-snug text-primary underline-offset-2">{tourMetaTitle(t)}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{tourMetaDescription(t)}</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {tourTitleSource(t.slug) === "fixed"
                ? "This title is fixed to protect existing Google rankings."
                : "The title is made from the tour name. Change the name with “Edit step by step”."}{" "}
              Write your own description under Page content.
            </p>
          </Panel>

          <Panel title={`SEO checklist · ${seo.score}%`} hint="What Google and AI search tools need to understand and show this tour.">
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={seo.score} aria-valuemin={0} aria-valuemax={100} aria-label="SEO score">
              <div className="h-full rounded-full bg-accent" style={{ width: `${seo.score}%` }} />
            </div>
            <ul className="divide-y divide-border">
              {seo.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-2.5">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Done" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-label="To do" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm ${c.ok ? "text-foreground" : "font-semibold text-foreground"}`}>{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="content" className="mt-5">
          <Panel title="Tour page content" hint="The written page customers and search engines read. Only add true details.">
            <TourContentEditor key={t.id} t={t} onSaved={onContentSaved} />
          </Panel>
        </TabsContent>

        <TabsContent value="details" className="mt-5">
          <Panel title="Listing details" hint="Shown on the tour card on the Tours page and at the top of the tour page.">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="mb-2 block text-xs uppercase text-muted-foreground">Main photo</Label>
                <MediaUrlInput folder="tours" value={hero} onChange={setHero} />
              </div>
              <div>
                <Label className="mb-2 block text-xs uppercase text-muted-foreground">Theme</Label>
                <Input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="e.g. Scottish Highlands" />
              </div>
              <div>
                <Label className="mb-2 block text-xs uppercase text-muted-foreground">Suggested start time</Label>
                <Input value={startTime} onChange={(event) => setStartTime(event.target.value)} placeholder="e.g. 08:30" />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-2 block text-xs uppercase text-muted-foreground">Short description ({short.length} characters)</Label>
                <Input value={short} onChange={(event) => setShort(event.target.value)} placeholder="One line shown on the tour card" />
              </div>
            </div>
            <Button
              className="mt-5"
              disabled={!dirty || !!pending[`${t.id}:meta`]}
              onClick={() => onSaveMeta({
                hero_image_url: hero.trim() || null,
                short_description: short.trim() || null,
                theme: theme.trim() || null,
                recommended_start_time: startTime.trim() || null,
              })}
            >
              {pending[`${t.id}:meta`] && <Loader2 className="size-4 animate-spin" />}
              Save listing details
            </Button>
          </Panel>
        </TabsContent>

        <TabsContent value="stops" className="mt-5">
          <Panel title={`Stops in order (${stops.length})`} hint="Change stops with “Edit step by step”.">
            {stops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stops yet.</p>
            ) : (
              <ol className="relative space-y-0">
                {stops.map((stop: any, index: number) => {
                  const poi = stop.points_of_interest;
                  const bad = !poi?.active || !poi?.place_id;
                  return (
                    <li key={`${t.id}-${poi?.id ?? index}`} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{poi?.name ?? "Unnamed stop"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {stop.default_selected ? "Included by default" : "Optional stop"}
                          {stop.recommended_visit_minutes ? ` · ${stop.recommended_visit_minutes} min suggested` : ""}
                        </p>
                      </div>
                      {bad ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gold-ink"><AlertTriangle className="size-3.5" aria-hidden /> Needs fixing</span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-foreground"><CheckCircle2 className="size-3.5" aria-hidden /> Ready</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {missing > 0 && <p className="mt-3 text-xs font-semibold text-gold-ink">{missing} stop(s) need a map place or switching on before publishing.</p>}
          </Panel>
        </TabsContent>

        <TabsContent value="price" className="mt-5">
          <Panel title="Price" hint="The “From” price customers see on the Tours page and this tour's page.">
            <div className="flex flex-col gap-4 rounded-lg bg-muted/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">From price on the website</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-foreground">{money(fromPrice) ?? "Not set"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.price_mode === "auto" ? "Worked out automatically from hourly rate, hours and route miles." : "Typed-in prices per vehicle."}
                  {" "}Change prices with “Edit step by step”.
                </p>
              </div>
              <Button variant="outline" disabled={!!pending[`${t.id}:price`]} onClick={onRefreshPrice}>
                {pending[`${t.id}:price`] ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Refresh saved price
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-lg border border-accent/50 bg-accent/10 p-4 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      {hint && <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}
