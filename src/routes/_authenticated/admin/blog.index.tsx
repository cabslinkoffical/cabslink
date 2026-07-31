import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ExternalLink, Tag, Folder, User } from "lucide-react";
import { listAdminPosts, deletePost } from "@/lib/blog-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: blog." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBlogList,
});

function AdminBlogList() {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "blog", "posts"], queryFn: () => listAdminPosts() });

  const del = useMutation({
    mutationFn: (id: string) => deletePost({ data: { id } }),
    onSuccess: () => { toast.success("Post deleted"); qc.invalidateQueries({ queryKey: ["admin", "blog"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const filtered = (data as any[]).filter((r) =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Content Hub" description="Manage blog posts, categories, tags and authors.">
        <Link to="/admin/blog/categories"><Button variant="outline" size="sm"><Folder className="size-4 mr-1.5" />Categories</Button></Link>
        <Link to="/admin/blog/tags"><Button variant="outline" size="sm"><Tag className="size-4 mr-1.5" />Tags</Button></Link>
        <Link to="/admin/blog/authors"><Button variant="outline" size="sm"><User className="size-4 mr-1.5" />Authors</Button></Link>
        <Button size="sm" onClick={() => router.navigate({ to: "/admin/blog/$id", params: { id: "new" } })}>
          <Plus className="size-4 mr-1.5" />New post
        </Button>
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Search title or slug…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No posts yet. Click <strong>New post</strong> to start writing.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Author</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-3 py-2 text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">/blog/{r.slug}</div>
                  </td>
                  <td className="px-3 py-2">{r.category?.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.author?.name ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {r.status === "published" && (
                      <a href={`/blog/${r.slug}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" aria-label="View"><ExternalLink className="size-4" /></Button>
                      </a>
                    )}
                    <Link to="/admin/blog/$id" params={{ id: r.id }}>
                      <Button variant="ghost" size="icon" aria-label="Edit"><Edit className="size-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" aria-label="Delete"
                      onClick={() => { if (confirm(`Delete "${r.title}"?`)) del.mutate(r.id); }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
