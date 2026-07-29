import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listMessages, updateMessage, deleteMessage } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mail, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "messages"], queryFn: () => listMessages() });

export const Route = createFileRoute("/_authenticated/admin/messages")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: MessagesPage,
});

const STATUS_BADGE: Record<string, string> = {
  new: "bg-warning/15 text-warning",
  read: "bg-info/15 text-info",
  resolved: "bg-success/15 text-success",
};

function MessagesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const upd = useMutation({
    mutationFn: useServerFn(updateMessage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "messages"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteMessage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "messages"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const active = data.find((m: any) => m.id === openId);

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">{data.length} total · {data.filter((m: any) => m.status === "new").length} unread</p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {data.length === 0 && <div className="p-8 text-center text-muted-foreground">No messages yet.</div>}
        {data.map((m: any) => (
          <div
            key={m.id}
            className={`p-4 flex items-start gap-3 hover:bg-muted/20 cursor-pointer ${m.status === "new" ? "bg-warning/5" : ""}`}
            onClick={() => {
              setOpenId(m.id);
              if (m.status === "new") upd.mutate({ data: { id: m.id, status: "read" } });
            }}
          >
            <div className="size-10 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] grid place-items-center font-semibold uppercase">
              {m.name?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate ${m.status === "new" ? "font-semibold" : ""}`}>{m.name} <span className="text-xs text-muted-foreground">· {m.email}</span></p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[m.status]}`}>{m.status}</span>
              </div>
              <p className="text-sm font-medium truncate">{m.subject || "(no subject)"}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{m.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {active && (
            <>
              <SheetHeader><SheetTitle>{active.subject || "Message"}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <p><strong>{active.name}</strong> · {active.email}{active.phone ? ` · ${active.phone}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(active.created_at).toLocaleString()}</p>
                <div className="rounded-lg border border-border bg-muted/30 p-4 whitespace-pre-wrap">{active.message}</div>
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button asChild size="sm" variant="gold" className="rounded-full"><a href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject ?? "Your enquiry")}`}><Mail className="size-4" /> Reply</a></Button>
                  {active.status !== "resolved" && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => upd.mutate({ data: { id: active.id, status: "resolved" } })}>
                      <CheckCircle2 className="size-4" /> Mark resolved
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="rounded-full text-destructive ml-auto" onClick={() => confirm("Delete this message?") && (del.mutate({ data: { id: active.id } }), setOpenId(null))}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
