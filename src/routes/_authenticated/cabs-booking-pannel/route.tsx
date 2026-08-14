import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { isAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, CalendarCheck, MapPin, Ban, Car, Tag, UserCog, Users,
  CreditCard, Ticket, FileText, BarChart3, Shield, Settings as SettingsIcon, History,
  LogOut, ExternalLink, Sun, Moon, Menu, X, Inbox, Gauge, Percent,
  Plane, Wrench, Route as RouteIcon, ArrowLeftRight, Globe, UploadCloud, Newspaper,
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

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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
  { to: "/cabs-booking-pannel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/cabs-booking-pannel/bookings", label: "Bookings", icon: CalendarCheck },
  {
    label: "Fleet & Pricing", icon: Car, items: [
      { to: "/cabs-booking-pannel/vehicle-classes", label: "Vehicle Classes", icon: Car },
      { to: "/cabs-booking-pannel/fleet-images", label: "Fleet Image Audit", icon: UploadCloud },
      
      { to: "/cabs-booking-pannel/mileage-pricing", label: "Mileage Pricing", icon: Gauge },
      { to: "/cabs-booking-pannel/hourly-rates", label: "Hourly Rates", icon: Gauge },

      { to: "/cabs-booking-pannel/pricing", label: "Route Pricing", icon: Tag },
      { to: "/cabs-booking-pannel/location-pricing", label: "Location Pricing", icon: MapPin },
      { to: "/cabs-booking-pannel/pricing-modifiers", label: "Pricing Modifiers", icon: Percent },
      { to: "/cabs-booking-pannel/availability", label: "Availability Rules", icon: Ban },
      { to: "/cabs-booking-pannel/pricing-preview", label: "Quote Preview", icon: Gauge },
      { to: "/cabs-booking-pannel/surcharges", label: "Surcharges", icon: Percent },
      { to: "/cabs-booking-pannel/coupons", label: "Coupons", icon: Ticket },

    ],
  },
  {
    label: "People", icon: Users, items: [
      { to: "/cabs-booking-pannel/drivers", label: "Drivers", icon: UserCog },
      { to: "/cabs-booking-pannel/customers", label: "Customers", icon: Users },
      { to: "/cabs-booking-pannel/users", label: "Admin Users", icon: Shield },
    ],
  },
  {
    label: "Locations", icon: MapPin, items: [
      { to: "/cabs-booking-pannel/addresses", label: "Addresses", icon: MapPin },
      { to: "/cabs-booking-pannel/banned-addresses", label: "Banned Addresses", icon: Ban },
    ],
  },
  {
    label: "Communication", icon: Inbox, items: [
      { to: "/cabs-booking-pannel/messages", label: "Messages", icon: Inbox },
    ],
  },
  {
    label: "Scenic Tours", icon: MapPin, items: [
      { to: "/cabs-booking-pannel/pois", label: "Points of Interest", icon: MapPin },
      { to: "/cabs-booking-pannel/scenic-routes", label: "Route Templates", icon: MapPin },
      { to: "/cabs-booking-pannel/tour-settings", label: "Tour Settings", icon: SettingsIcon },
    ],
  },
  {
    label: "Content Hub", icon: Newspaper, items: [
      { to: "/cabs-booking-pannel/blog", label: "Posts", icon: FileText },
      { to: "/cabs-booking-pannel/blog/categories", label: "Categories", icon: Tag },
      { to: "/cabs-booking-pannel/blog/tags", label: "Tags", icon: Tag },
      { to: "/cabs-booking-pannel/blog/authors", label: "Authors", icon: UserCog },
    ],
  },
  {
    label: "SEO", icon: Globe, items: [
      { to: "/cabs-booking-pannel/seo", label: "Overview", icon: Globe },
      { to: "/cabs-booking-pannel/seo/import", label: "Import", icon: UploadCloud },
      { to: "/cabs-booking-pannel/seo/locations", label: "Locations", icon: MapPin },
      { to: "/cabs-booking-pannel/seo/airports", label: "Airports", icon: Plane },
      { to: "/cabs-booking-pannel/seo/services", label: "Services", icon: Wrench },
      { to: "/cabs-booking-pannel/seo/routes", label: "Popular Routes", icon: RouteIcon },
      { to: "/cabs-booking-pannel/seo/pages", label: "SEO Pages", icon: FileText },
      { to: "/cabs-booking-pannel/seo/issues", label: "Content Issues", icon: Shield },
      { to: "/cabs-booking-pannel/seo/redirects", label: "Redirects", icon: ArrowLeftRight },
    ],
  },
  { to: "/cabs-booking-pannel/payments", label: "Payments", icon: CreditCard },
  { to: "/cabs-booking-pannel/reports", label: "Reports", icon: BarChart3 },
  { to: "/cabs-booking-pannel/logs", label: "Activity Logs", icon: History },
  { to: "/cabs-booking-pannel/settings", label: "Settings", icon: SettingsIcon },
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
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--navy)] text-white flex flex-col border-r border-white/10 transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <Logo />
          <button aria-label="Close menu" className="md:hidden text-white/55" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <SidebarNav entries={NAV} />
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/55 hover:text-white">
            <ExternalLink className="size-3.5" /> View website
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center px-4 gap-3">
          <button aria-label="Open menu" className="md:hidden p-2 -ml-2 text-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Breadcrumbs />
          <div className="flex-1" />
          {/* Global admin search is not yet wired to a backend index — hidden until implemented. */}
          {/* Notification bell is not yet wired to a real notification stream — hidden until implemented. */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground" aria-label="Toggle theme">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
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
              <DropdownMenuItem onClick={() => router.navigate({ to: "/cabs-booking-pannel/settings" as any })}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.navigate({ to: "/" })}>View website</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">Sign out</DropdownMenuItem>
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
