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
import { listAuthorsAdmin, upsertAuthor, deleteAuthor } from "@/lib/blog-admin.functions";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/blog/authors")({
  head: () => ({
    meta: [
      { title: "Blog › Authors — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: blog › authors." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBlogAuthors,
});

function AdminBlogAuthors() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin", "blog", "authors"], queryFn: () => listAuthorsAdmin() });
  const [editing, setEditing] = useState<any>(null);

  const save = useMutation({
    mutationFn: (row: any) => upsertAuthor({ data: { ...row, links: row.links ?? {} } }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "blog", "authors"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteAuthor({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin", "blog", "authors"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Blog authors" description="Editorial bylines with photo, role and bio.">
        <Link to="/cabs-booking-pannel/blog"><Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1.5" />Back</Button></Link>
        <Button size="sm" onClick={() => setEditing({ slug: "", name: "", active: true, links: {} })}>
          <Plus className="size-4 mr-1.5" />New author
        </Button>
      </PageHeader>

      {editing && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Role</Label><Input value={editing.role ?? ""} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></div>
            <div><Label>Avatar URL</Label><Input value={editing.avatar_url ?? ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} /></div>
          </div>
          <div><Label>Bio</Label><Textarea rows={3} value={editing.bio ?? ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></div>
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
          { key: "role", header: "Role" },
          { key: "slug", header: "Slug", render: (r: any) => <span className="text-muted-foreground">/{r.slug}</span> },
          { key: "active", header: "Status", render: (r: any) => <PublishedPill on={r.active} /> },
        ]}
        onEdit={(r) => setEditing(r)}
        onDelete={(id) => { if (confirm("Delete author?")) del.mutate(id); }}
      />
    </div>
  );
}
