import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { isAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, CalendarCheck, MapPin, Ban, Car, Tag, Clock, Percent, UserCog, Users,
  CreditCard, Ticket, FileText, Bell, BarChart3, Shield, Settings as SettingsIcon, History,
  LogOut, ExternalLink, Search, Bell as BellIcon, Sun, Moon, Menu, X, Inbox, Gauge,
} from "lucide-react";
import { SidebarNav, type SidebarEntry } from "@/components/admin/SidebarNav";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

const NAV: SidebarEntry[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  {
    label: "Fleet & Pricing", icon: Car, items: [
      { to: "/admin/fleet", label: "Vehicles", icon: Car },
      { to: "/admin/mileage-pricing", label: "Mileage Pricing", icon: Gauge },
      { to: "/admin/pricing", label: "Route Pricing", icon: Tag },
      { to: "/admin/hourly-rate", label: "Hourly Rates", icon: Clock },
      { to: "/admin/surcharges", label: "Surcharges", icon: Percent },
      { to: "/admin/coupons", label: "Coupons", icon: Ticket },
    ],
  },
  {
    label: "People", icon: Users, items: [
      { to: "/admin/drivers", label: "Drivers", icon: UserCog },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/users", label: "Admin Users", icon: Shield },
    ],
  },
  {
    label: "Locations", icon: MapPin, items: [
      { to: "/admin/addresses", label: "Addresses", icon: MapPin },
      { to: "/admin/banned-addresses", label: "Banned Addresses", icon: Ban },
    ],
  },
  {
    label: "Communication", icon: Inbox, items: [
      { to: "/admin/messages", label: "Messages", icon: Inbox },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/content", label: "Website Content", icon: FileText },
    ],
  },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/logs", label: "Activity Logs", icon: History },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem("admin-theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("admin-theme", next ? "dark" : "light");
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <Logo />
          <button className="md:hidden text-slate-400" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <SidebarNav entries={NAV} />
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white">
            <ExternalLink className="size-3.5" /> View website
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center px-4 gap-3">
          <button className="md:hidden p-2 -ml-2 text-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Breadcrumbs />
          <div className="flex-1" />
          <div className="hidden lg:flex relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9 w-64 h-9 bg-muted/40" />
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground relative">
            <BellIcon className="size-4" />
          </Button>
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
              <DropdownMenuItem onClick={() => router.navigate({ to: "/admin/settings" as any })}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.navigate({ to: "/" })}>View website</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
