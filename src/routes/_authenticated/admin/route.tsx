import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { isAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CalendarCheck, Inbox, Car, Users, LogOut, ExternalLink } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const res = await isAdmin();
      if (!res.isAdmin) throw redirect({ to: "/" });
    } catch (e) {
      if ((e as any)?.to) throw e;
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/messages", label: "Messages", icon: Inbox },
  { to: "/admin/fleet", label: "Fleet", icon: Car },
  { to: "/admin/users", label: "Users", icon: Users },
];

function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: s => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface)]">
      <aside className="hidden md:flex w-64 flex-col bg-[var(--navy)] text-white border-r border-white/5">
        <div className="px-6 py-5 border-b border-white/10">
          <Logo />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mt-2">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-[var(--gold)] text-[var(--gold-foreground)]"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="size-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white">
            <ExternalLink className="size-3.5" /> View website
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/5 hover:text-white">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between bg-[var(--navy)] text-white px-4 py-3 border-b border-white/10">
          <Logo />
          <Button size="sm" variant="ghost" onClick={signOut} className="text-white hover:text-[var(--gold)]">
            <LogOut className="size-4" />
          </Button>
        </header>
        <nav className="md:hidden flex overflow-x-auto bg-card border-b border-border">
          {NAV.map(item => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 ${active ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-foreground/70"}`}>
                <item.icon className="size-3.5" />{item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
