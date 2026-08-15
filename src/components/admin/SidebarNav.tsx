import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };
export type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };
export type SidebarEntry = NavItem | NavGroup;

function isGroup(e: SidebarEntry): e is NavGroup {
  return "items" in e;
}

const isActive = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.to : pathname.startsWith(item.to);

export function SidebarNav({ entries }: { entries: SidebarEntry[] }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return entries;
    const out: SidebarEntry[] = [];
    for (const e of entries) {
      if (isGroup(e)) {
        const items = e.items.filter(i => i.label.toLowerCase().includes(q));
        if (items.length || e.label.toLowerCase().includes(q)) out.push({ ...e, items: items.length ? items : e.items });
      } else if (e.label.toLowerCase().includes(q)) {
        out.push(e);
      }
    }
    return out;
  }, [entries, q]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/40" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages…"
            aria-label="Search admin pages"
            className="w-full h-9 rounded-lg bg-white/[0.06] border border-white/10 pl-8 pr-8 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-gold/50 focus:bg-white/[0.1] transition"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto admin-scroll px-2 py-3 space-y-0.5">
        {filtered.map((e, i) =>
          isGroup(e) ? (
            <Group key={e.label} group={e} pathname={pathname} forceOpen={!!q} />
          ) : (
            <LinkItem key={i} item={e} active={isActive(e, pathname)} />
          )
        )}
        {q && filtered.length === 0 && (
          <p className="px-3 py-6 text-xs text-white/45">No pages match “{query}”.</p>
        )}
      </nav>
    </div>
  );
}

function LinkItem({ item, active, indent = false }: { item: NavItem; active: boolean; indent?: boolean }) {
  return (
    <Link
      to={item.to as any}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition group",
        indent && "pl-9",
        active
          ? "admin-nav-active font-semibold"
          : "text-white/65 hover:bg-white/[0.07] hover:text-white"
      )}
    >
      <item.icon className={cn("size-4 shrink-0", active ? "text-gold" : "text-white/45 group-hover:text-gold")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Group({ group, pathname, forceOpen }: { group: NavGroup; pathname: string; forceOpen?: boolean }) {
  const hasActive = group.items.some(i => isActive(i, pathname));
  const [open, setOpen] = useState(hasActive);
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
  const expanded = forceOpen || open;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={expanded}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
          hasActive ? "text-white font-medium" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
        )}
      >
        <group.icon className={cn("size-4 shrink-0", hasActive ? "text-gold" : "text-white/45")} />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map(it => (
            <LinkItem key={it.to} item={it} active={isActive(it, pathname)} indent />
          ))}
        </div>
      )}
    </div>
  );
}
