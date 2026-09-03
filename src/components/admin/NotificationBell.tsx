import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell, BellRing, CalendarCheck, Inbox, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { listAdminNotifications, type AdminNotification } from "@/lib/admin-notifications.functions";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const SEEN_KEY = "admin-notifications-seen-at";
const SOUND_KEY = "admin-notifications-sound";

/** Two-tone telephone-style ring, synthesised so no audio asset is needed. */
function playRing() {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const start = ctx.currentTime;
  const beep = (at: number, freq: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(0.18, start + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + at);
    osc.stop(start + at + dur + 0.02);
  };
  beep(0, 880, 0.18);
  beep(0.22, 1180, 0.18);
  beep(0.6, 880, 0.18);
  beep(0.82, 1180, 0.18);
  window.setTimeout(() => void ctx.close().catch(() => {}), 1400);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Admin topbar cluster: a manual refresh button plus a live notification bell
 * that polls for new bookings and messages and rings on arrival.
 */
export function AdminNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<string>("");
  const [sound, setSound] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY) ?? new Date(Date.now() - 86_400_000).toISOString());
    setSound(localStorage.getItem(SOUND_KEY) !== "off");
  }, []);

  const query = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => listAdminNotifications(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const items: AdminNotification[] = query.data?.items ?? [];

  const unread = useMemo(
    () => (seenAt ? items.filter((i) => i.createdAt > seenAt) : []),
    [items, seenAt],
  );

  // Ring only for items that appeared after the first successful load.
  useEffect(() => {
    if (!query.data) return;
    const ids = new Set(items.map((i) => i.id));
    if (knownIds.current === null) {
      knownIds.current = ids;
      return;
    }
    const fresh = items.filter((i) => !knownIds.current!.has(i.id));
    knownIds.current = ids;
    if (fresh.length === 0) return;
    if (sound) {
      try { playRing(); } catch { /* autoplay blocked until first interaction */ }
    }
    const first = fresh[0]!;
    toast.info(fresh.length === 1 ? first.title : `${fresh.length} new notifications`, {
      description: fresh.length === 1 ? first.subtitle : undefined,
    });
  }, [query.data, items, sound]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([queryClient.invalidateQueries(), router.invalidate()]);
      toast.success("Data refreshed");
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, router]);

  const markAllRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) { try { playRing(); } catch { /* ignore */ } }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={refreshAll}
        disabled={refreshing}
        aria-label="Refresh admin data"
        title="Refresh data"
        className="grid size-9 place-items-center rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition disabled:opacity-60"
      >
        <RefreshCw className={`size-[18px] ${refreshing ? "animate-spin" : ""}`} />
      </button>

      <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) void query.refetch(); }}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={unread.length ? `${unread.length} unread notifications` : "Notifications"}
            className="relative grid size-9 place-items-center rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition"
          >
            {unread.length > 0 ? <BellRing className="size-[18px] text-[var(--gold-ink)]" /> : <Bell className="size-[18px]" />}
            {unread.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-white">
                {unread.length > 9 ? "9+" : unread.length}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[340px] p-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); toggleSound(); }}
                title={sound ? "Ring sound on" : "Ring sound off"}
                aria-label={sound ? "Turn ring sound off" : "Turn ring sound on"}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); void query.refetch(); }}
                title="Check for new notifications"
                aria-label="Check for new notifications"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <DropdownMenuSeparator className="my-0" />

          <div className="max-h-[340px] overflow-y-auto">
            {query.isLoading && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>}
            {query.isError && <p className="px-3 py-6 text-center text-sm text-destructive">Could not load notifications.</p>}
            {query.data && items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing new right now.</p>
            )}
            {items.map((n) => {
              const isNew = !!seenAt && n.createdAt > seenAt;
              return (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => { markAllRead(); router.navigate({ to: n.href as never }); }}
                  className={`flex items-start gap-2.5 px-3 py-2.5 ${isNew ? "bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]" : ""}`}
                >
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-muted text-[var(--gold-ink)]">
                    {n.kind === "booking" ? <CalendarCheck className="size-4" /> : <Inbox className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold">{n.title}</span>
                      {isNew && <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />}
                    </span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{n.subtitle}</span>
                    <span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-0" />
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread.length === 0}
            className="w-full px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--gold-ink)] hover:bg-muted disabled:opacity-50"
          >
            Mark all as read
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
