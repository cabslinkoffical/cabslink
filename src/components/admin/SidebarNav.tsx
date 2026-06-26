import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };
export type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };
export type SidebarEntry = NavItem | NavGroup;

function isGroup(e: SidebarEntry): e is NavGroup {
  return "items" in e;
}

export function SidebarNav({ entries }: { entries: SidebarEntry[] }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      {entries.map((e, i) =>
        isGroup(e) ? <Group key={i} group={e} pathname={pathname} /> : <LinkItem key={i} item={e} active={e.exact ? pathname === e.to : pathname.startsWith(e.to)} />
      )}
    </nav>
  );
}

function LinkItem({ item, active, indent = false }: { item: NavItem; active: boolean; indent?: boolean }) {
  return (
    <Link
      to={item.to as any}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition group",
        indent && "pl-9",
        active
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      )}
    >
      <item.icon className={cn("size-4 shrink-0", active ? "" : "text-slate-400 group-hover:text-white")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Group({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActive = group.items.some(i => i.exact ? pathname === i.to : pathname.startsWith(i.to));
  const [open, setOpen] = useState(hasActive);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
          hasActive ? "text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        )}
      >
        <group.icon className="size-4 shrink-0 text-slate-400" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map(it => (
            <LinkItem key={it.to} item={it} active={it.exact ? pathname === it.to : pathname.startsWith(it.to)} indent />
          ))}
        </div>
      )}
    </div>
  );
}
