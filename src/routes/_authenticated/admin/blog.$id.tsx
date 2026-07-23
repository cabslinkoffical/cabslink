import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react";
import {
  getAdminPost, upsertPost, deletePost,
  listCategoriesAdmin, listTagsAdmin, listAuthorsAdmin,
} from "@/lib/blog-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/blog/$id")({
  component: PostEditor,
});

type FaqItem = { q: string; a: string };
type TocItem = { id: string; text: string; level: number };

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  body_md: string;
  category_id: string;
  author_id: string;
  featured_image_url: string;
  featured_image_alt: string;
  status: "draft" | "review" | "scheduled" | "published" | "archived";
  reading_minutes: number;
  seo_title: string;
  meta_description: string;
  og_image_url: string;
  canonical_override: string;
  robots_status: string;
  cluster_key: string;
  pillar: boolean;
  featured: boolean;
  faqs: FaqItem[];
  key_takeaways: string[];
  toc: TocItem[];
  related_service_slugs: string[];
  related_location_slugs: string[];
  related_route_slugs: string[];
  tag_ids: string[];
};

const empty: FormState = {
  slug: "", title: "", subtitle: "", excerpt: "", body_md: "",
  category_id: "", author_id: "", featured_image_url: "", featured_image_alt: "",
  status: "draft", reading_minutes: 3,
  seo_title: "", meta_description: "", og_image_url: "", canonical_override: "",
  robots_status: "index,follow", cluster_key: "",
  pillar: false, featured: false,
  faqs: [], key_takeaways: [], toc: [],
  related_service_slugs: [], related_location_slugs: [], related_route_slugs: [],
  tag_ids: [],
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100);
}

function extractToc(md: string): TocItem[] {
  const lines = md.split("\n");
  const out: TocItem[] = [];
  const used = new Set<string>();
  for (const line of lines) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].trim();
    let base = slugify(text) || `h${out.length}`;
    let id = base; let i = 1;
    while (used.has(id)) id = `${base}-${i++}`;
    used.add(id);
    out.push({ id, text, level });
  }
  return out;
}

function PostEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [slugDirty, setSlugDirty] = useState(false);

  const categories = useQuery({ queryKey: ["admin", "blog", "categories"], queryFn: () => listCategoriesAdmin() });
  const tags = useQuery({ queryKey: ["admin", "blog", "tags"], queryFn: () => listTagsAdmin() });
  const authors = useQuery({ queryKey: ["admin", "blog", "authors"], queryFn: () => listAuthorsAdmin() });
  const existing = useQuery({
    queryKey: ["admin", "blog", "post", id],
    queryFn: () => getAdminPost({ data: { id } }),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!isNew && existing.data) {
      const d: any = existing.data;
      setForm({
        slug: d.slug ?? "", title: d.title ?? "", subtitle: d.subtitle ?? "",
        excerpt: d.excerpt ?? "", body_md: d.body_md ?? "",
        category_id: d.category_id ?? "", author_id: d.author_id ?? "",
        featured_image_url: d.featured_image_url ?? "",
        featured_image_alt: d.featured_image_alt ?? "",
        status: d.status ?? "draft", reading_minutes: d.reading_minutes ?? 3,
        seo_title: d.seo_title ?? "", meta_description: d.meta_description ?? "",
        og_image_url: d.og_image_url ?? "", canonical_override: d.canonical_override ?? "",
        robots_status: d.robots_status ?? "index,follow", cluster_key: d.cluster_key ?? "",
        pillar: !!d.pillar, featured: !!d.featured,
        faqs: Array.isArray(d.faqs) ? d.faqs : [],
        key_takeaways: Array.isArray(d.key_takeaways) ? d.key_takeaways : [],
        toc: Array.isArray(d.toc) ? d.toc : [],
        related_service_slugs: d.related_service_slugs ?? [],
        related_location_slugs: d.related_location_slugs ?? [],
        related_route_slugs: d.related_route_slugs ?? [],
        tag_ids: d.tag_ids ?? [],
      });
      setSlugDirty(true);
    }
  }, [existing.data, isNew]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...(isNew ? {} : { id }),
        ...form,
        toc: extractToc(form.body_md),
        reading_minutes: Math.max(1, Math.min(60, Math.round(form.body_md.split(/\s+/).length / 220) || form.reading_minutes)),
        category_id: form.category_id || null,
        author_id: form.author_id || null,
        featured_image_url: form.featured_image_url || null,
        featured_image_alt: form.featured_image_alt || null,
        subtitle: form.subtitle || null,
        excerpt: form.excerpt || null,
        seo_title: form.seo_title || null,
        meta_description: form.meta_description || null,
        og_image_url: form.og_image_url || null,
        canonical_override: form.canonical_override || null,
        cluster_key: form.cluster_key || null,
        related_post_ids: [],
      };
      return upsertPost({ data: payload as any });
    },
    onSuccess: (r: any) => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "blog"] });
      if (isNew && r?.id) router.navigate({ to: "/admin/blog/$id", params: { id: r.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const del = useMutation({
    mutationFn: () => deletePost({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); router.navigate({ to: "/admin/blog" }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  function updateTitle(v: string) {
    setForm((f) => ({ ...f, title: v, slug: slugDirty ? f.slug : slugify(v) }));
  }

  return (
    <div className="max-w-6xl">
      <PageHeader title={isNew ? "New post" : "Edit post"} description="Write, structure and publish content hub articles.">
        <Link to="/admin/blog"><Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1.5" />Back</Button></Link>
        {!isNew && (
          <Button variant="outline" size="sm" onClick={() => { if (confirm("Delete this post?")) del.mutate(); }}>
            <Trash2 className="size-4 mr-1.5 text-destructive" />Delete
          </Button>
        )}
        <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
          <Save className="size-4 mr-1.5" />{save.isPending ? "Saving…" : "Save"}
        </Button>
      </PageHeader>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => updateTitle(e.target.value)} placeholder="Ultimate Edinburgh Airport transfer guide" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => { setSlugDirty(true); setForm({ ...form, slug: slugify(e.target.value) }); }} placeholder="edinburgh-airport-transfer-guide" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <div>
            <Label>Excerpt (used in list previews & meta fallback)</Label>
            <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div>
            <Label>Featured image URL</Label>
            <Input value={form.featured_image_url} onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <Label>Featured image alt</Label>
            <Input value={form.featured_image_alt} onChange={(e) => setForm({ ...form, featured_image_alt: e.target.value })} />
          </div>

          <div>
            <Label>Body (Markdown)</Label>
            <Textarea rows={22} value={form.body_md} onChange={(e) => setForm({ ...form, body_md: e.target.value })}
              className="font-mono text-sm" placeholder={"## Introduction\n\nWrite your article here in Markdown…"} />
            <p className="mt-1 text-xs text-muted-foreground">
              Use `## Heading` and `### Subheading` to auto-generate the table of contents. Supports GitHub-flavoured markdown.
            </p>
          </div>

          {/* Key takeaways */}
          <ListEditor
            label="Key takeaways (bullet points)"
            items={form.key_takeaways}
            onChange={(v) => setForm({ ...form, key_takeaways: v })}
            placeholder="Book at least 24 hours in advance for airport transfers."
          />

          {/* FAQs */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="!m-0">FAQ items</Label>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, faqs: [...form.faqs, { q: "", a: "" }] })}>
                <Plus className="size-4 mr-1" />Add
              </Button>
            </div>
            <div className="space-y-3">
              {form.faqs.map((f, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={f.q} placeholder="Question" onChange={(e) => {
                      const next = [...form.faqs]; next[i] = { ...next[i], q: e.target.value }; setForm({ ...form, faqs: next });
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, j) => j !== i) })}>
                      <X className="size-4" />
                    </Button>
                  </div>
                  <Textarea rows={2} value={f.a} placeholder="Answer" onChange={(e) => {
                    const next = [...form.faqs]; next[i] = { ...next[i], a: e.target.value }; setForm({ ...form, faqs: next });
                  }} />
                </div>
              ))}
              {form.faqs.length === 0 && <p className="text-xs text-muted-foreground">Adding 3–8 FAQs enables FAQ rich snippets.</p>}
            </div>
          </div>

          {/* Internal linking */}
          <ListEditor label="Related service slugs (e.g. airport-transfers)"
            items={form.related_service_slugs}
            onChange={(v) => setForm({ ...form, related_service_slugs: v })}
            placeholder="airport-transfers" />
          <ListEditor label="Related location slugs (e.g. edinburgh)"
            items={form.related_location_slugs}
            onChange={(v) => setForm({ ...form, related_location_slugs: v })}
            placeholder="edinburgh" />
          <ListEditor label="Related route slugs (e.g. edinburgh-to-glasgow)"
            items={form.related_route_slugs}
            onChange={(v) => setForm({ ...form, related_route_slugs: v })}
            placeholder="edinburgh-to-glasgow" />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">In review</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category_id || "__none"} onValueChange={(v) => setForm({ ...form, category_id: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— none —</SelectItem>
                  {(categories.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Author</Label>
              <Select value={form.author_id || "__none"} onValueChange={(v) => setForm({ ...form, author_id: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Choose author" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— none —</SelectItem>
                  {(authors.data ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured on hub
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.pillar} onCheckedChange={(v) => setForm({ ...form, pillar: v })} /> Cornerstone / pillar
            </label>
            <div>
              <Label>Cluster key</Label>
              <Input value={form.cluster_key} onChange={(e) => setForm({ ...form, cluster_key: e.target.value })} placeholder="airport-transfers" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-2">
              {(tags.data ?? []).map((t: any) => {
                const on = form.tag_ids.includes(t.id);
                return (
                  <button key={t.id} type="button"
                    className={"rounded-full border px-3 py-1 text-xs transition " + (on ? "bg-[var(--navy)] text-white border-[var(--navy)]" : "border-border hover:border-primary")}
                    onClick={() => setForm({ ...form, tag_ids: on ? form.tag_ids.filter((x) => x !== t.id) : [...form.tag_ids, t.id] })}>
                    {t.name}
                  </button>
                );
              })}
              {(tags.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No tags yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO</p>
            <div>
              <Label>SEO title</Label>
              <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              <p className="mt-1 text-[11px] text-muted-foreground">{form.seo_title.length}/60 recommended</p>
            </div>
            <div>
              <Label>Meta description</Label>
              <Textarea rows={3} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
              <p className="mt-1 text-[11px] text-muted-foreground">{form.meta_description.length}/160 recommended</p>
            </div>
            <div>
              <Label>OG image URL</Label>
              <Input value={form.og_image_url} onChange={(e) => setForm({ ...form, og_image_url: e.target.value })} />
            </div>
            <div>
              <Label>Canonical override</Label>
              <Input value={form.canonical_override} onChange={(e) => setForm({ ...form, canonical_override: e.target.value })} placeholder="Leave blank for default" />
            </div>
            <div>
              <Label>Robots</Label>
              <Input value={form.robots_status} onChange={(e) => setForm({ ...form, robots_status: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-xl border border-border p-4">
      <Label className="!mb-2 block">{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onChange([...items, draft.trim()]); setDraft(""); } }} />
        <Button size="sm" variant="outline" onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}>
          <Plus className="size-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              {it}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
