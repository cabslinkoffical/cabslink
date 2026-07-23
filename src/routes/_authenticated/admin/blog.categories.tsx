import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SeoTable, PublishedPill } from "@/components/admin/SeoTable";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { listCategoriesAdmin, upsertCategory, deleteCategory } from "@/lib/blog-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/blog/categories")({
  component: AdminBlogCategories,
});

function AdminBlogCategories() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin", "blog", "categories"], queryFn: () => listCategoriesAdmin() });
  const [editing, setEditing] = useState<any>(null);

  const save = useMutation({
    mutationFn: (row: any) => upsertCategory({ data: row }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "blog", "categories"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin", "blog", "categories"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Blog categories" description="Top-level buckets for the content hub.">
        <Link to="/admin/blog"><Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1.5" />Back to posts</Button></Link>
        <Button size="sm" onClick={() => setEditing({ slug: "", name: "", description: "", sort_order: 100, active: true })}>
          <Plus className="size-4 mr-1.5" />New category
        </Button>
      </PageHeader>

      {editing && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>SEO title</Label><Input value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} /></div>
            <div><Label>Sort order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Meta description</Label><Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} /></div>
          <div><Label>Hero image URL</Label><Input value={editing.hero_image_url ?? ""} onChange={(e) => setEditing({ ...editing, hero_image_url: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Active
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>Save</Button>
          </div>
        </div>
      )}

      <SeoTable
        rows={data as any[]}
        cols={[
          { key: "name", header: "Name" },
          { key: "slug", header: "Slug", render: (r: any) => <span className="text-muted-foreground">/{r.slug}</span> },
          { key: "sort_order", header: "Order" },
          { key: "active", header: "Status", render: (r: any) => <PublishedPill on={r.active} /> },
        ]}
        onEdit={(r) => setEditing(r)}
        onDelete={(id) => { if (confirm("Delete category?")) del.mutate(id); }}
      />
    </div>
  );
}
