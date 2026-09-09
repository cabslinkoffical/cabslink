import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDriverApplications, updateMessage, deleteMessage } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Mail, Phone, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";

type Application = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const opts = queryOptions({
  queryKey: ["admin", "driver-applications"],
  queryFn: () => listDriverApplications() as Promise<Application[]>,
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/drivers")({
  head: () => ({
    meta: [
      { title: "Driver applications — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: drivers who applied through the website." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const { data: applications } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const update = useServerFn(updateMessage);
  const del = useServerFn(deleteMessage);
  const [view, setView] = useViewMode("drivers", "grid");
  const [q, setQ] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "driver-applications"] });

  const mark = useMutation({
    mutationFn: (id: string) => update({ data: { id, status: "resolved" } }),
    onSuccess: () => { invalidate(); toast.success("Marked as reviewed"); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const rows = term
    ? applications.filter((a) =>
        [a.name, a.email, a.phone].some((v) => (v ?? "").toLowerCase().includes(term)))
    : applications;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver applications"
        description="Everyone who applied to drive with Cabslink through the website. Driver accounts and job allocation are handled in the dispatch panel."
      >
        <ViewToggle mode={view} onChange={setView} />
      </PageHeader>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email or phone"
        className="max-w-sm"
      />

      {rows.length === 0 ? (
        <EmptyState title="No driver applications yet" />
      ) : (
        <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "grid gap-3"}>
          {rows.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{a.name ?? "—"}</div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="size-3" /> {a.email ?? "—"}
                  </div>
                  <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Phone className="size-3" /> {a.phone ?? "—"}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {a.message ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("en-GB")}
                </span>
                <div className="flex gap-1">
                  {a.status !== "resolved" ? (
                    <Button size="sm" variant="ghost" disabled={mark.isPending} onClick={() => mark.mutate(a.id)}>
                      <Check className="mr-1 size-3.5" /> Reviewed
                    </Button>
                  ) : null}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="mr-1 size-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete this application?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(a.id)} className="bg-destructive">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
