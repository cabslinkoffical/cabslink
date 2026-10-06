import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  THEME_GROUPS, updateTourContent, listTourReviews, upsertTourReview, deleteTourReview,
} from "@/lib/scenic-admin.functions";

type Faq = { q: string; a: string };

function words(...parts: (string | null | undefined)[]) {
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

export function TourContentEditor({ t, onSaved }: { t: any; onSaved: () => void }) {
  const save = useServerFn(updateTourContent);
  const [f, setF] = useState({
    itinerary_md: t.itinerary_md ?? "",
    included_md: t.included_md ?? "",
    excluded_md: t.excluded_md ?? "",
    suits_md: t.suits_md ?? "",
    meta_description: t.meta_description ?? "",
    duration_hours: t.duration_hours ?? t.default_duration_hours ?? "",
    theme_group: (t.theme_group ?? "") as string,
    signature: !!t.signature,
  });
  const [faq, setFaq] = useState<Faq[]>(Array.isArray(t.faq) ? t.faq : []);
  const m = useMutation({
    mutationFn: () => save({ data: {
      id: t.id,
      itinerary_md: f.itinerary_md, included_md: f.included_md, excluded_md: f.excluded_md, suits_md: f.suits_md,
      meta_description: f.meta_description,
      duration_hours: f.duration_hours === "" ? null : Number(f.duration_hours),
      theme_group: (f.theme_group || null) as any,
      signature: f.signature,
      faq: faq.filter((x) => x.q.trim() && x.a.trim()),
    } }),
    onSuccess: () => { toast.success("Tour page content saved"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
  const total = words(t.description, f.itinerary_md, f.included_md, f.excluded_md, f.suits_md, ...faq.flatMap((x) => [x.q, x.a]));
  const area = (k: keyof typeof f, label: string, hint: string, rows = 5) => (
    <div className="md:col-span-2">
      <Label className="mb-1 block text-xs uppercase text-muted-foreground">{label}</Label>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      <Textarea rows={rows} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-5">
      <p className={`text-xs ${total >= 600 ? "text-success" : "text-warning"}`}>
        {total} words of written content on this tour page{total < 600 ? " — aim for at least 600." : "."}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label className="mb-2 block text-xs uppercase text-muted-foreground">Filter group (max 7)</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={f.theme_group} onChange={(e) => setF({ ...f, theme_group: e.target.value })}>
            <option value="">— None —</option>
            {THEME_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase text-muted-foreground">Duration (hours)</Label>
          <Input type="number" min={1} max={24} step={0.5} value={f.duration_hours}
            onChange={(e) => setF({ ...f, duration_hours: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs uppercase text-muted-foreground">Meta description ({f.meta_description.length}/155)</Label>
          <Input maxLength={160} value={f.meta_description} onChange={(e) => setF({ ...f, meta_description: e.target.value })} />
        </div>
        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <Switch checked={f.signature} onCheckedChange={(v) => setF({ ...f, signature: v })} />
          Show the “Signature” badge on this tour
        </label>
        {area("itinerary_md", "Timed itinerary", "One step per line, e.g. “08:30 — Pickup from your hotel”.", 8)}
        {area("included_md", "What's included", "One item per line. Replaces the old included list when filled.")}
        {area("excluded_md", "Not included", "One item per line.")}
        {area("suits_md", "Who this tour suits", "One line each, e.g. “First-time visitors to Scotland”.", 4)}
      </div>

      <div>
        <Label className="mb-2 block text-xs uppercase text-muted-foreground">Questions and answers</Label>
        <div className="space-y-3">
          {faq.map((x, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-border p-3">
              <Input placeholder="Question" value={x.q} onChange={(e) => setFaq(faq.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} />
              <Textarea rows={2} placeholder="Answer" value={x.a} onChange={(e) => setFaq(faq.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)))} />
              <Button variant="ghost" size="sm" className="justify-self-end text-destructive" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                <Trash2 className="mr-1 size-4" /> Remove
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setFaq([...faq, { q: "", a: "" }])}><Plus className="mr-1 size-4" /> Add question</Button>
        </div>
      </div>

      <Button disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending && <Loader2 className="mr-1 size-4 animate-spin" />} Save tour page content
      </Button>

      <TourReviewsEditor templateId={t.id} />
    </div>
  );
}

const blankReview = { reviewer_name: "", review_date: "", stars: 5, body: "", source_url: "" };

function TourReviewsEditor({ templateId }: { templateId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listTourReviews);
  const upsert = useServerFn(upsertTourReview);
  const remove = useServerFn(deleteTourReview);
  const key = ["admin", "tour-reviews", templateId];
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: { templateId } }) });
  const [r, setR] = useState(blankReview);
  const add = useMutation({
    mutationFn: () => upsert({ data: { template_id: templateId, ...r, stars: Number(r.stars), source_url: r.source_url.trim() || null, published: true } }),
    onSuccess: () => { setR(blankReview); toast.success("Review added"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not add review"),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm font-semibold">Guest reviews</p>
      <p className="mb-3 text-xs text-muted-foreground">Only add real reviews. The reviews block is hidden on the tour page when this list is empty.</p>
      <ul className="mb-4 space-y-2">
        {(q.data ?? []).map((x: any) => (
          <li key={x.id} className="flex items-start justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm">
            <span><b>{x.reviewer_name}</b> · {x.review_date} · {"★".repeat(x.stars)}<br /><span className="text-muted-foreground">{x.body}</span></span>
            <Button size="icon" variant="ghost" aria-label="Delete review" onClick={() => del.mutate(x.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input placeholder="Name" value={r.reviewer_name} onChange={(e) => setR({ ...r, reviewer_name: e.target.value })} />
        <Input type="date" value={r.review_date} onChange={(e) => setR({ ...r, review_date: e.target.value })} />
        <Input type="number" min={1} max={5} value={r.stars} onChange={(e) => setR({ ...r, stars: Number(e.target.value) })} aria-label="Stars" />
        <Textarea className="sm:col-span-3" rows={2} placeholder="Review text" value={r.body} onChange={(e) => setR({ ...r, body: e.target.value })} />
        <Input className="sm:col-span-3" placeholder="Source link (optional)" value={r.source_url} onChange={(e) => setR({ ...r, source_url: e.target.value })} />
      </div>
      <Button className="mt-3" size="sm" disabled={add.isPending || !r.reviewer_name || !r.review_date || !r.body} onClick={() => add.mutate()}>
        <Plus className="mr-1 size-4" /> Add review
      </Button>
    </div>
  );
}
