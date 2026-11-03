/**
 * Step-by-step create/edit screen for ready-made tours. Each "Next" saves the
 * draft (one admin-checked database routine for details and stops; the
 * existing tour-settings save for length and prices), so staff can stop at any
 * step and come back. Publishing is always a separate, explicit action.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, ExternalLink, Loader2, Monitor, Plus,
  Save, Search, Smartphone, Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";
import { MediaUrlInput } from "@/components/admin/media/MediaPicker";
import { PriceModeChoice } from "@/components/admin/PriceModeChoice";
import { getTourBuilderOptions, getTourDraft, saveTourDraft } from "@/lib/tour-admin-tools.functions";
import { saveTemplateTourSettings } from "@/lib/tour-hours-admin.functions";
import { publishScenicTemplate, setScenicTemplateActive } from "@/lib/scenic-admin.functions";
import { TOUR_STEPS, slugify, publishChecklist, readyToPublish } from "@/lib/tour-draft";

type Stop = { poi_id: string; name: string; mandatory: boolean; default_selected: boolean; minutes: number | null; active: boolean; hasPlace: boolean };

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function TourBuilder({ open, tourId, onClose, onSaved }: {
  open: boolean;
  tourId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const qc = useQueryClient();
  const fetchOptions = useServerFn(getTourBuilderOptions);
  const fetchDraft = useServerFn(getTourDraft);
  const saveDraft = useServerFn(saveTourDraft);
  const saveSettings = useServerFn(saveTemplateTourSettings);
  const setActive = useServerFn(setScenicTemplateActive);
  const publish = useServerFn(publishScenicTemplate);

  const options = useQuery({ queryKey: ["admin", "tour-builder-options"], queryFn: () => fetchOptions(), enabled: open });
  const [id, setId] = useState<string | null>(tourId);
  const draft = useQuery({
    queryKey: ["admin", "tour-draft", id],
    queryFn: () => fetchDraft({ data: { id: id! } }),
    enabled: open && !!id,
  });

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!tourId);
  const [slugTouched, setSlugTouched] = useState(!!tourId);
  const [published, setPublished] = useState(false);

  // Basics
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [theme, setTheme] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [hero, setHero] = useState("");
  // Start & finish
  const [start, setStart] = useState<SelectedPlace | null>(null);
  const [finish, setFinish] = useState<SelectedPlace | null>(null);
  const [sameFinish, setSameFinish] = useState(true);
  const [startMode, setStartMode] = useState<"customer" | "fixed">("customer");
  const [startTime, setStartTime] = useState("");
  const [fixedAddress, setFixedAddress] = useState<string | null>(null);
  // Stops
  const [stops, setStops] = useState<Stop[]>([]);
  const [poiSearch, setPoiSearch] = useState("");
  // Length & price
  const [hours, setHours] = useState("");
  const [minHours, setMinHours] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [includedMiles, setIncludedMiles] = useState("");
  const [bookable, setBookable] = useState(true);
  const [priceMode, setPriceMode] = useState<"manual" | "auto">("manual");
  const [prices, setPrices] = useState<Record<string, string>>({});
  // Review
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  // Reset when opened for a different tour.
  useEffect(() => {
    if (!open) return;
    setId(tourId); setStep(0); setLoaded(!tourId); setSlugTouched(!!tourId);
    if (!tourId) {
      setName(""); setSlug(""); setCategory(""); setTheme(""); setShortDesc(""); setDescription(""); setHero("");
      setStart(null); setFinish(null); setSameFinish(true); setStartMode("customer"); setStartTime(""); setFixedAddress(null);
      setStops([]); setHours(""); setMinHours(""); setMaxHours(""); setIncludedMiles(""); setBookable(true);
      setPriceMode("manual"); setPrices({}); setPublished(false);
    }
  }, [open, tourId]);

  // Prefill from the saved tour once.
  useEffect(() => {
    const d = draft.data;
    if (!d || loaded) return;
    const t = d.tour;
    setName(t.name ?? ""); setSlug(t.slug ?? ""); setCategory(t.theme_group ?? ""); setTheme(t.theme ?? "");
    setShortDesc(t.short_description ?? ""); setDescription(t.description ?? ""); setHero(t.hero_image_url ?? "");
    setStart(t.origin_place_id ? { placeId: t.origin_place_id, label: t.origin_label ?? "Start" } : null);
    const same = !t.destination_place_id || t.destination_place_id === t.origin_place_id;
    setSameFinish(same);
    setFinish(!same ? { placeId: t.destination_place_id, label: t.destination_label ?? "Finish" } : null);
    setStartMode(t.start_mode === "fixed" ? "fixed" : "customer");
    setStartTime(t.recommended_start_time ?? ""); setFixedAddress(t.fixed_start_address ?? null);
    setStops(d.stops.map((s: any) => ({
      poi_id: s.poi_id, name: s.points_of_interest?.name ?? "Stop", mandatory: !!s.mandatory,
      default_selected: s.default_selected !== false, minutes: s.recommended_visit_minutes ?? s.points_of_interest?.recommended_visit_minutes ?? null,
      active: !!s.points_of_interest?.active, hasPlace: !!s.points_of_interest?.place_id,
    })));
    const h = (v: any) => (v == null ? "" : String(Number(v)));
    setHours(h(t.default_duration_hours)); setMinHours(h(t.min_duration_hours)); setMaxHours(h(t.max_duration_hours));
    setIncludedMiles(h(t.included_miles)); setBookable(t.is_bookable !== false);
    setPriceMode(t.price_mode === "auto" ? "auto" : "manual");
    setPrices(Object.fromEntries(d.prices.map((p: any) => [p.vehicle_class_id, String(Number(p.price))])));
    setPublished(!!t.published && !!t.active);
    setLoaded(true);
  }, [draft.data, loaded]);

  const pois = options.data?.pois ?? [];
  const classes = options.data?.classes ?? [];
  const categories = options.data?.categories ?? [];
  const tiers = options.data?.tiers ?? [];
  const poiMatches = useMemo(() => {
    const q = poiSearch.trim().toLowerCase();
    const chosen = new Set(stops.map((s) => s.poi_id));
    return pois.filter((p: any) => !chosen.has(p.id) && (!q || `${p.name} ${p.category ?? ""}`.toLowerCase().includes(q))).slice(0, 12);
  }, [pois, poiSearch, stops]);

  const pricedVehicles = Object.values(prices).filter((v) => Number(v) > 0).length;
  const checks = publishChecklist({
    name, slug,
    origin_place_id: start?.placeId ?? null,
    destination_place_id: (sameFinish ? start?.placeId : finish?.placeId) ?? null,
    default_duration_hours: num(hours),
    stops: stops.map((s) => ({ active: s.active, hasPlace: s.hasPlace })),
    pricedVehicles,
    hasImage: !!hero.trim(),
  });

  async function persist(): Promise<string | null> {
    if (name.trim().length < 3 || slug.trim().length < 3) {
      toast.error("Add a tour name and web address first.");
      setStep(0);
      return null;
    }
    setSaving(true);
    try {
      const finishPlace = sameFinish ? start : finish;
      const res = await saveDraft({ data: {
        id,
        tour: {
          name: name.trim(), slug: slug.trim(),
          theme_group: category || null, theme: theme.trim() || null,
          short_description: shortDesc.trim() || null, description: description.trim() || null,
          hero_image_url: hero.trim() || null, recommended_start_time: startTime.trim() || null,
          origin_place_id: start?.placeId ?? null, origin_label: start?.label ?? null,
          destination_place_id: finishPlace?.placeId ?? null, destination_label: finishPlace?.label ?? null,
          start_mode: startMode,
          default_duration_hours: num(hours), min_duration_hours: num(minHours), max_duration_hours: num(maxHours),
          included_miles: num(includedMiles), is_bookable: bookable, price_mode: priceMode,
        },
        stops: stops.map((s) => ({ poi_id: s.poi_id, mandatory: s.mandatory, default_selected: s.default_selected || s.mandatory, recommended_visit_minutes: s.minutes })),
      } });
      const savedId = res.id;
      if (!id) setId(savedId);
      // Length and price use the existing tour-settings save, which also works out automatic prices.
      if (step >= 3 && Number(hours) > 0) {
        try {
          const r = await saveSettings({ data: {
            id: savedId, is_bookable: bookable,
            default_duration_hours: num(hours), min_duration_hours: num(minHours), max_duration_hours: num(maxHours),
            included_miles: num(includedMiles), start_mode: startMode, fixed_start_address: fixedAddress,
            price_mode: priceMode,
            prices: Object.entries(prices).filter(([, v]) => v.trim() !== "" && Number(v) >= 0).map(([vehicle_class_id, v]) => ({ vehicle_class_id, price: Number(v) })),
          } });
          if (priceMode === "auto" && (r as any)?.prices) {
            setPrices(Object.fromEntries(((r as any).prices as any[]).map((p) => [p.vehicle_class_id, String(p.price)])));
          }
        } catch (e: any) {
          toast.error(`Details saved, but prices weren't: ${e.message ?? "please check the length and stops."}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["admin", "scenic-templates"] });
      qc.invalidateQueries({ queryKey: ["admin", "tour-draft", savedId] });
      setPreviewKey((k) => k + 1);
      onSaved(savedId);
      return savedId;
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save the tour.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    const saved = await persist();
    if (saved) setStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1));
  }

  async function publishNow() {
    const saved = await persist();
    if (!saved) return;
    try {
      await setActive({ data: { id: saved, active: true } });
      await publish({ data: { id: saved, published: true } });
      setPublished(true);
      qc.invalidateQueries({ queryKey: ["admin", "scenic-templates"] });
      toast.success("Tour published — it's now on the website.");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't publish this tour.");
    }
  }

  const moveStop = (i: number, d: -1 | 1) => setStops((list) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    return copy;
  });

  const busy = !!tourId && !loaded;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{tourId ? `Edit tour: ${name || "…"}` : "Create a tour"}</DialogTitle>
          <DialogDescription>
            Work through the steps. Each "Next" saves your draft, so you can stop and come back. The tour only goes on the website when you press Publish.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-2" aria-label="Steps">
          {TOUR_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => (id || i === 0) && setStep(i)}
                disabled={!id && i > 0}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${i === step ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-border text-muted-foreground"} disabled:opacity-50`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>

        {busy || options.isLoading ? (
          <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</p>
        ) : (
          <div className="space-y-5 py-2">
            {step === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tb-name">Tour name</Label>
                  <Input id="tb-name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="Loch Lomond & the Trossachs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tb-slug">Web address</Label>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>/tours/</span>
                    <Input id="tb-slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
                  </div>
                  {published && <p className="text-xs text-warning">This tour is live. Changing its address breaks old links.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tb-cat">Category</Label>
                  <select id="tb-cat" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">— None —</option>
                    {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tb-theme">Theme label (shown on the tour card)</Label>
                  <Input id="tb-theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Lochs & Landscapes" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tb-short">Short description</Label>
                  <Input id="tb-short" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="One line for tour listings" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tb-desc">Longer description</Label>
                  <Textarea id="tb-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Main photo</Label>
                  <MediaUrlInput folder="tours" value={hero} onChange={setHero} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tb-start">Start point</Label>
                  <PlaceAutocomplete id="tb-start" value={start} onChange={setStart} placeholder="e.g. Edinburgh city centre" initialText={start?.label} />
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <Switch checked={sameFinish} onCheckedChange={setSameFinish} /> Finishes where it started
                </label>
                {!sameFinish && (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="tb-finish">Finish point</Label>
                    <PlaceAutocomplete id="tb-finish" value={finish} onChange={setFinish} placeholder="e.g. Glasgow" initialText={finish?.label} />
                  </div>
                )}
                <fieldset className="space-y-2 md:col-span-2">
                  <legend className="text-sm font-medium">Pickup</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tb-mode" checked={startMode === "customer"} onChange={() => setStartMode("customer")} /> Customer chooses their pickup address
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tb-mode" checked={startMode === "fixed"} onChange={() => setStartMode("fixed")} /> Always starts at the start point above
                  </label>
                </fieldset>
                <div className="space-y-1.5">
                  <Label htmlFor="tb-time">Suggested start time</Label>
                  <Input id="tb-time" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="08:30" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-2">
                  <Label htmlFor="tb-poi">Add stops from your Stops & landmarks list</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="tb-poi" className="pl-9" value={poiSearch} onChange={(e) => setPoiSearch(e.target.value)} placeholder="Search stops" />
                  </div>
                  <ul className="max-h-80 space-y-1 overflow-y-auto">
                    {poiMatches.map((p: any) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:border-[var(--gold)]"
                          onClick={() => setStops((l) => [...l, { poi_id: p.id, name: p.name, mandatory: false, default_selected: true, minutes: p.recommended_visit_minutes ?? null, active: !!p.active, hasPlace: !!p.place_id }])}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.category ?? "Stop"}{!p.active ? " · switched off" : ""}{!p.place_id ? " · no map location" : ""}</span>
                          </span>
                          <Plus className="size-4 shrink-0" />
                        </button>
                      </li>
                    ))}
                    {poiMatches.length === 0 && <li className="text-sm text-muted-foreground">No more stops match. Add new places in Stops & landmarks.</li>}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tour stops in order ({stops.length})</p>
                  {stops.length === 0 && <p className="text-sm text-muted-foreground">Add at least one stop.</p>}
                  <ol className="space-y-2">
                    {stops.map((s, i) => (
                      <li key={s.poi_id} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="grid size-6 place-items-center rounded bg-muted text-xs font-bold">{i + 1}</span>
                          <span className={`min-w-0 flex-1 truncate font-medium ${!s.active || !s.hasPlace ? "text-warning" : ""}`}>{s.name}</span>
                          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => moveStop(i, -1)}><ArrowUp className="size-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Move ${s.name} down`} disabled={i === stops.length - 1} onClick={() => moveStop(i, 1)}><ArrowDown className="size-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Remove ${s.name}`} onClick={() => setStops((l) => l.filter((x) => x.poi_id !== s.poi_id))}><Trash2 className="size-4" /></Button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 pl-8 text-xs">
                          <label className="flex items-center gap-1.5"><Switch checked={s.mandatory} onCheckedChange={(v) => setStops((l) => l.map((x) => x.poi_id === s.poi_id ? { ...x, mandatory: v, default_selected: v || x.default_selected } : x))} /> Must visit</label>
                          <label className="flex items-center gap-1.5"><Switch checked={s.default_selected || s.mandatory} disabled={s.mandatory} onCheckedChange={(v) => setStops((l) => l.map((x) => x.poi_id === s.poi_id ? { ...x, default_selected: v } : x))} /> Included by default</label>
                          <label className="flex items-center gap-1.5">
                            Visit
                            <Input type="number" min={0} max={600} className="h-7 w-20" value={s.minutes ?? ""} onChange={(e) => setStops((l) => l.map((x) => x.poi_id === s.poi_id ? { ...x, minutes: num(e.target.value) } : x))} />
                            min
                          </label>
                          {(!s.active || !s.hasPlace) && <span className="flex items-center gap-1 text-warning"><AlertTriangle className="size-3.5" /> Fix in Stops & landmarks before publishing</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tb-hours">Usual length (hours)</Label>
                    <select id="tb-hours" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={hours} onChange={(e) => setHours(e.target.value)}>
                      <option value="">Choose</option>
                      {tiers.map((t: any) => <option key={t.hours} value={String(Number(t.hours))}>{Number(t.hours)} hours ({t.included_miles} miles)</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="tb-min">Shortest</Label><Input id="tb-min" type="number" min={1} max={24} value={minHours} onChange={(e) => setMinHours(e.target.value)} placeholder="any" /></div>
                  <div className="space-y-1.5"><Label htmlFor="tb-max">Longest</Label><Input id="tb-max" type="number" min={1} max={24} value={maxHours} onChange={(e) => setMaxHours(e.target.value)} placeholder="any" /></div>
                  <div className="space-y-1.5"><Label htmlFor="tb-miles">Miles included</Label><Input id="tb-miles" type="number" min={0} value={includedMiles} onChange={(e) => setIncludedMiles(e.target.value)} placeholder="from length" /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={bookable} onCheckedChange={setBookable} /> Customers can book this tour online</label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Tour price</legend>
                  <PriceModeChoice value={priceMode} onChange={setPriceMode} />
                </fieldset>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{priceMode === "auto" ? "Prices worked out when you save (hourly rate × hours + route miles)" : "Price for each vehicle (leave blank to use its hourly rate)"}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classes.map((c: any) => (
                      <label key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                        <span>{c.name}</span>
                        <span className="flex items-center gap-1">£
                          <Input type="number" min={0} step="0.01" className="h-8 w-28" disabled={priceMode === "auto"} value={prices[c.id] ?? ""} onChange={(e) => setPrices((p) => ({ ...p, [c.id]: e.target.value }))} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-start gap-2 text-sm">
                      {c.ok ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <AlertTriangle className={`mt-0.5 size-4 ${c.required ? "text-destructive" : "text-warning"}`} />}
                      <span>{c.label}{!c.ok && !c.required ? " (recommended)" : ""}</span>
                    </li>
                  ))}
                </ul>
                {id && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant={previewWidth === "desktop" ? "secondary" : "outline"} onClick={() => setPreviewWidth("desktop")}><Monitor className="size-4" /> Desktop</Button>
                      <Button type="button" size="sm" variant={previewWidth === "mobile" ? "secondary" : "outline"} onClick={() => setPreviewWidth("mobile")}><Smartphone className="size-4" /> Phone</Button>
                      <a href={`/tour-preview/${id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold underline"><ExternalLink className="size-4" /> Open full preview</a>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-muted">
                      <iframe
                        key={previewKey}
                        title="Tour page preview"
                        src={`/tour-preview/${id}`}
                        className="mx-auto block h-[540px] bg-background"
                        style={{ width: previewWidth === "desktop" ? "100%" : 390 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void persist()} disabled={saving || busy}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft
            </Button>
            {step < TOUR_STEPS.length - 1 ? (
              <Button type="button" onClick={() => void next()} disabled={saving || busy}>
                Save & next <ArrowRight className="size-4" />
              </Button>
            ) : published ? (
              <Button type="button" onClick={() => void persist()} disabled={saving}>Save changes (tour is live)</Button>
            ) : (
              <Button type="button" onClick={() => void publishNow()} disabled={saving || !readyToPublish(checks)}>
                Publish tour
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
