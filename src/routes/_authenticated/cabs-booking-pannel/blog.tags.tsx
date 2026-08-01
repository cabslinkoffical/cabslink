import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeoTable } from "@/components/admin/SeoTable";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { listTagsAdmin, upsertTag, deleteTag } from "@/lib/blog-admin.functions";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/blog/tags")({
  head: () => ({
    meta: [
      { title: "Blog › Tags — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: blog › tags." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBlogTags,
});

function AdminBlogTags() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin", "blog", "tags"], queryFn: () => listTagsAdmin() });
  const [editing, setEditing] = useState<any>(null);

  const save = useMutation({
    mutationFn: (row: any) => upsertTag({ data: row }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "blog", "tags"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteTag({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin", "blog", "tags"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Blog tags" description="Fine-grained topical tags applied to posts.">
        <Link to="/cabs-booking-pannel/blog"><Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1.5" />Back</Button></Link>
        <Button size="sm" onClick={() => setEditing({ slug: "", name: "" })}>
          <Plus className="size-4 mr-1.5" />New tag
        </Button>
      </PageHeader>

      {editing && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          </div>
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
        ]}
        onEdit={(r) => setEditing(r)}
        onDelete={(id) => { if (confirm("Delete tag?")) del.mutate(id); }}
      />
    </div>
  );
}
