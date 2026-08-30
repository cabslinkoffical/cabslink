import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { listMessages, updateMessage, deleteMessage } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mail, Trash2, CheckCircle2, List, LayoutGrid, Search } from "lucide-react";
import { toast } from "sonner";
import { CannedEmailComposer } from "@/components/admin/CannedEmailComposer";

const opts = queryOptions({ queryKey: ["admin", "messages"], queryFn: () => listMessages() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: messages." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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

const VIEW_KEY = "admin-messages-view";

function MessagesPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "messages"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };
  const upd = useMutation({
    mutationFn: useServerFn(updateMessage),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteMessage),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [view, setView] = useState<"list" | "cards">("list");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_KEY) : null;
    if (saved === "cards" || saved === "list") setView(saved);
  }, []);
  const setViewPersist = (v: "list" | "cards") => {
    setView(v);
    try { window.localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };

  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((m: any) =>
      [m.name, m.email, m.subject, m.message, m.phone].some((f: any) => String(f ?? "").toLowerCase().includes(term)),
    );
  }, [data, q]);

  const [openId, setOpenId] = useState<string | null>(null);
  const active = data.find((m: any) => m.id === openId);

  const open = (m: any) => {
    setOpenId(m.id);
    if (m.status === "new") upd.mutate({ data: { id: m.id, status: "read" } });
  };

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">{data.length} total · {data.filter((m: any) => m.status === "new").length} unread</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" className="pl-9 w-56" />
          </div>
          <div className="flex rounded-full border border-border overflow-hidden">
            <button type="button" aria-label="List view" onClick={() => setViewPersist("list")}
              className={`px-3 py-2 ${view === "list" ? "bg-[var(--gold)] text-[var(--navy)]" : "text-muted-foreground hover:bg-muted/40"}`}>
              <List className="size-4" />
            </button>
            <button type="button" aria-label="Card view" onClick={() => setViewPersist("cards")}
              className={`px-3 py-2 ${view === "cards" ? "bg-[var(--gold)] text-[var(--navy)]" : "text-muted-foreground hover:bg-muted/40"}`}>
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 && <div className="admin-card p-8 text-center text-muted-foreground">No messages found.</div>}

      {rows.length > 0 && view === "list" && (
        <div className="admin-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Message</th>
                <th className="px-4 py-3 text-left">Received</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m: any) => (
                <tr key={m.id} className={`hover:bg-muted/20 cursor-pointer ${m.status === "new" ? "bg-warning/5" : ""}`} onClick={() => open(m)}>
                  <td className="px-4 py-3">
                    <Button aria-label="Open message" size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); open(m); }}>
                      <Mail className="size-4" />
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div className={m.status === "new" ? "font-semibold" : ""}>{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{m.subject || "(no subject)"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell max-w-[320px] truncate text-muted-foreground">{m.message}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && view === "cards" && (
        <div className="admin-card divide-y divide-border">
          {rows.map((m: any) => (
            <div
              key={m.id}
              className={`p-4 flex items-start gap-3 hover:bg-muted/20 cursor-pointer ${m.status === "new" ? "bg-warning/5" : ""}`}
              onClick={() => open(m)}
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
      )}

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader><SheetTitle>{active.subject || "Message"}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <p><strong>{active.name}</strong> · {active.email}{active.phone ? ` · ${active.phone}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(active.created_at).toLocaleString()}</p>
                <div className="rounded-lg border border-border bg-muted/30 p-4 whitespace-pre-wrap">{active.message}</div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">Send a reply email</p>
                  <CannedEmailComposer
                    scope="message"
                    targetId={active.id}
                    vars={{ name: active.name, ref: active.subject ?? "", reason: "" }}
                    onSent={invalidate}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <Button asChild size="sm" variant="outline" className="rounded-full"><a href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject ?? "Your enquiry")}`}><Mail className="size-4" /> Open in mail app</a></Button>
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
