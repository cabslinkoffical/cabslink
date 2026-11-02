import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ExternalLink, Menu, X, ArrowLeft } from "lucide-react";
import { ADMIN_AREAS, areaForPath } from "@/components/admin/admin-areas";
import { SidebarNav } from "@/components/admin/SidebarNav";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminNotifications } from "@/components/admin/NotificationBell";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const user = context.user;
    if (!user) throw redirect({ to: "/auth" });

    // The parent route already validated this browser session. Check the role
    // with that same session instead of making a second server-function hop,
    // which can race token persistence immediately after sign-in.
    const { data: hasAdminRole, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (error) throw error;
    if (!hasAdminRole) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

const ADMIN_ROLE_RECHECK_MS = 5 * 60 * 1000;

function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const areaId = areaForPath(pathname);
  const area = ADMIN_AREAS.find((a) => a.id === areaId) ?? ADMIN_AREAS[0];
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Re-check the admin role every 5 minutes and when the window regains focus;
  // a removed role signs the user out instead of leaving the panel open.
  useEffect(() => {
    let stopped = false;
    async function recheck() {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return;
      const { data: ok, error } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (stopped || error) return;
      if (!ok) {
        await supabase.auth.signOut();
        toast.error("Your admin access has been removed.");
        router.navigate({ to: "/auth" });
      }
    }
    const timer = window.setInterval(recheck, ADMIN_ROLE_RECHECK_MS);
    window.addEventListener("focus", recheck);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", recheck);
    };
  }, [router]);

  useEffect(() => {
    localStorage.removeItem("admin-theme");
    document.documentElement.classList.remove("dark");
  }, []);


  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex admin-shell">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[calc(100%-3rem)] overflow-hidden admin-sidebar text-white flex flex-col transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-gold/20 flex items-center justify-between">
          <Logo />
          <button aria-label="Close menu" className="md:hidden text-white/70" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <div className="px-3 pt-3">
          {area.id !== "dashboard" && (
            <Link
              to="/cabs-booking-pannel"
              className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-white/80 ring-1 ring-white/10 transition hover:bg-white/[0.07] hover:text-gold"
            >
              <ArrowLeft className="size-4" /> Back to dashboard
            </Link>
          )}
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold text-navy"><area.icon className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-gold">You are in</span>
              <span className="block truncate text-sm font-semibold text-white">{area.label}</span>
            </span>
          </div>
        </div>
        <SidebarNav key={area.id} entries={area.nav} />
        <div className="shrink-0 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] border-t border-gold/20 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-gold transition">
            <ExternalLink className="size-3.5" /> View website
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/[0.07] hover:text-white transition">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="sticky top-0 z-20 admin-topbar h-14 flex items-center px-4 gap-3">
          <button aria-label="Open menu" className="md:hidden p-2 -ml-2 text-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Breadcrumbs />
          <div className="flex-1" />

          {/* Global admin search is not yet wired to a backend index — hidden until implemented. */}
          <AdminNotifications />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted">
                <Avatar className="size-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{email[0]?.toUpperCase() ?? "A"}</AvatarFallback></Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">{email || "Admin"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Signed in as<br/><span className="text-xs font-normal text-muted-foreground">{email}</span></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.navigate({ to: "/cabs-booking-pannel/site-settings" as any })}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.navigate({ to: "/" })}>View website</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
