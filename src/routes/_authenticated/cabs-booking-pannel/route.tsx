import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, CalendarCheck, MapPin, Ban, Car, Tag, UserCog, Users,
  CreditCard, Ticket, FileText, BarChart3, Shield, Settings as SettingsIcon, History,
  LogOut, ExternalLink,  Menu, X, Inbox, Gauge,
  Plane, Plus, Wrench, CircleSlash2, PencilLine, Route as RouteIcon, ArrowLeftRight, Globe, UploadCloud, TrendingUp, Image as ImageIcon,
} from "lucide-react";
import { SidebarNav, type SidebarEntry } from "@/components/admin/SidebarNav";
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

const NAV: SidebarEntry[] = [
  { to: "/cabs-booking-pannel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    label: "Bookings", icon: CalendarCheck, items: [
      { to: "/cabs-booking-pannel/bookings", label: "All bookings", icon: CalendarCheck, search: { view: "", tab: "" } },
      { to: "/cabs-booking-pannel/bookings", label: "Upcoming", icon: CalendarCheck, search: { view: "", tab: "upcoming" } },
      { to: "/cabs-booking-pannel/bookings", label: "Confirmed", icon: CalendarCheck, search: { view: "", tab: "confirmed" } },
      { to: "/cabs-booking-pannel/bookings", label: "Cancelled", icon: CircleSlash2, search: { view: "", tab: "cancelled" } },
      { to: "/cabs-booking-pannel/bookings", label: "History", icon: History, search: { view: "", tab: "history" } },
      { to: "/cabs-booking-pannel/bookings", label: "Tour enquiries", icon: RouteIcon, search: { view: "tours" } },
      { to: "/cabs-booking-pannel/amendments", label: "Change requests", icon: PencilLine },
      { to: "/cabs-booking-pannel/cancellations", label: "Refunds", icon: CircleSlash2 },
    ],
  },
  {
    label: "Money & customers", icon: CreditCard, items: [
      { to: "/cabs-booking-pannel/payments", label: "Payments", icon: CreditCard },
      { to: "/cabs-booking-pannel/messages", label: "Messages", icon: Inbox },
      { to: "/cabs-booking-pannel/customers", label: "Customers", icon: Users },
      { to: "/cabs-booking-pannel/drivers", label: "Driver applications", icon: UserCog },
    ],
  },
  {
    label: "Prices & vehicles", icon: Car, items: [
      { to: "/cabs-booking-pannel/vehicle-classes", label: "Vehicles", icon: Car },
      { to: "/cabs-booking-pannel/pricing-schemes", label: "Prices", icon: Gauge },
      { to: "/cabs-booking-pannel/extras", label: "Extras", icon: Plus },
      { to: "/cabs-booking-pannel/coupons", label: "Coupons", icon: Ticket },
      { to: "/cabs-booking-pannel/availability", label: "Blocked dates", icon: Ban },
      { to: "/cabs-booking-pannel/addresses", label: "Addresses", icon: MapPin },
      { to: "/cabs-booking-pannel/banned-addresses", label: "Banned addresses", icon: Ban },
    ],
  },
  {
    label: "Tours", icon: RouteIcon, items: [
      { to: "/cabs-booking-pannel/scenic-routes", label: "Tour routes", icon: RouteIcon },
      { to: "/cabs-booking-pannel/pois", label: "Stops & landmarks", icon: MapPin },
      { to: "/cabs-booking-pannel/tour-hours", label: "Hours & mileage", icon: Gauge },
      { to: "/cabs-booking-pannel/tour-settings", label: "Tour settings", icon: SettingsIcon },
    ],
  },
  {
    label: "Website content", icon: FileText, items: [
      { to: "/cabs-booking-pannel/blog", label: "Blog posts", icon: FileText, exact: true },
      { to: "/cabs-booking-pannel/blog/categories", label: "Blog categories", icon: Tag },
      { to: "/cabs-booking-pannel/blog/tags", label: "Blog tags", icon: Tag },
      { to: "/cabs-booking-pannel/blog/authors", label: "Blog authors", icon: UserCog },
      { to: "/cabs-booking-pannel/media", label: "Media library", icon: ImageIcon },
    ],
  },
  {
    label: "SEO", icon: Globe, items: [
      { to: "/cabs-booking-pannel/seo", label: "Overview", icon: Globe, exact: true },
      { to: "/cabs-booking-pannel/seo/pages", label: "Pages", icon: FileText },
      { to: "/cabs-booking-pannel/seo/locations", label: "Locations", icon: MapPin },
      { to: "/cabs-booking-pannel/seo/airports", label: "Airports", icon: Plane },
      { to: "/cabs-booking-pannel/seo/services", label: "Services", icon: Wrench },
      { to: "/cabs-booking-pannel/seo/routes", label: "Routes", icon: RouteIcon },
      { to: "/cabs-booking-pannel/seo/redirects", label: "Redirects", icon: ArrowLeftRight },
      { to: "/cabs-booking-pannel/seo/import", label: "Import", icon: UploadCloud },
    ],
  },
  {
    label: "Reports", icon: BarChart3, items: [
      { to: "/cabs-booking-pannel/analytics", label: "Analytics", icon: TrendingUp },
      { to: "/cabs-booking-pannel/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Settings", icon: SettingsIcon, items: [
      { to: "/cabs-booking-pannel/settings", label: "General settings", icon: SettingsIcon },
      { to: "/cabs-booking-pannel/users", label: "Admin users", icon: Shield },
      { to: "/cabs-booking-pannel/dispatch", label: "Dispatch link", icon: RouteIcon },
      { to: "/cabs-booking-pannel/logs", label: "Activity logs", icon: History },
    ],
  },
];


function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
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
        className={`fixed inset-y-0 left-0 z-40 w-64 admin-sidebar text-white flex flex-col transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-gold/20 flex items-center justify-between">
          <Logo />
          <button aria-label="Close menu" className="md:hidden text-white/55" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <SidebarNav entries={NAV} />
        <div className="p-3 border-t border-gold/20 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/55 hover:text-gold transition">
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
              <DropdownMenuItem onClick={() => router.navigate({ to: "/cabs-booking-pannel/settings" as any })}>Settings</DropdownMenuItem>
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
