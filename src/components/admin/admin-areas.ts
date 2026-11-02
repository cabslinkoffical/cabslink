import {
  LayoutDashboard, CalendarCheck, MapPin, Ban, Car, Tag, UserCog, Users,
  CreditCard, Ticket, FileText, BarChart3, Shield, Settings as SettingsIcon, History,
  Inbox, Gauge, Plane, Plus, Wrench, CircleSlash2, PencilLine, Route as RouteIcon,
  ArrowLeftRight, Globe, UploadCloud, TrendingUp, Image as ImageIcon, Calculator, SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { SidebarEntry, NavItem } from "@/components/admin/SidebarNav";

/**
 * The staff console is split into three areas, each with its own menu:
 * the dashboard (figures and reports), bookings & messages, and settings.
 * The settings entries also carry a description for the All settings page.
 */
export type AdminAreaId = "dashboard" | "bookings" | "settings";

export type SettingItem = NavItem & { description: string };
export type SettingGroup = { label: string; icon: LucideIcon; blurb: string; items: SettingItem[] };

export const SETTINGS_GROUPS: SettingGroup[] = [
  {
    label: "Prices & vehicles", icon: Car, blurb: "What customers can book and what it costs.",
    items: [
      { to: "/cabs-booking-pannel/vehicle-classes", label: "Vehicles", icon: Car, description: "Vehicle classes, seats, bags, photos and which are bookable." },
      { to: "/cabs-booking-pannel/pricing-schemes", label: "Prices", icon: Gauge, description: "Fare schemes, mileage bands, fixed routes and surcharges." },
      { to: "/cabs-booking-pannel/pricing-preview", label: "Price checker", icon: Calculator, description: "Test a journey and see exactly how its fare is worked out." },
      { to: "/cabs-booking-pannel/extras", label: "Extras", icon: Plus, description: "Child seats, meet & greet and other add-ons per vehicle." },
      { to: "/cabs-booking-pannel/coupons", label: "Coupons", icon: Ticket, description: "Discount codes, limits and expiry dates." },
      { to: "/cabs-booking-pannel/availability", label: "Blocked dates", icon: Ban, description: "Dates and times when bookings are closed." },
      { to: "/cabs-booking-pannel/addresses", label: "Addresses", icon: MapPin, description: "Saved places and quick-pick addresses." },
      { to: "/cabs-booking-pannel/banned-addresses", label: "Banned addresses", icon: Ban, description: "Places the booking form will refuse." },
    ],
  },
  {
    label: "Tours", icon: RouteIcon, blurb: "Day tours, their stops and how they are priced.",
    items: [
      { to: "/cabs-booking-pannel/scenic-routes", label: "Tour routes", icon: RouteIcon, description: "Ready-made tours shown on the website." },
      { to: "/cabs-booking-pannel/pois", label: "Stops & landmarks", icon: MapPin, description: "Places customers can add to a tour." },
      { to: "/cabs-booking-pannel/tour-hours", label: "Hours & mileage", icon: Gauge, description: "Hourly rates and included miles per vehicle." },
      { to: "/cabs-booking-pannel/tour-settings", label: "Tour settings", icon: SettingsIcon, description: "Tour-wide rules such as minimum hours." },
    ],
  },
  {
    label: "Website content", icon: FileText, blurb: "Articles and photos on the public site.",
    items: [
      { to: "/cabs-booking-pannel/blog", label: "Blog posts", icon: FileText, exact: true, description: "Write, edit and publish articles." },
      { to: "/cabs-booking-pannel/blog/categories", label: "Blog categories", icon: Tag, description: "Sections that group articles." },
      { to: "/cabs-booking-pannel/blog/tags", label: "Blog tags", icon: Tag, description: "Topic labels for articles." },
      { to: "/cabs-booking-pannel/blog/authors", label: "Blog authors", icon: UserCog, description: "Bylines shown on articles." },
      { to: "/cabs-booking-pannel/media", label: "Media library", icon: ImageIcon, description: "Every uploaded photo and file." },
    ],
  },
  {
    label: "Search & pages", icon: Globe, blurb: "How pages appear on Google and where old links go.",
    items: [
      { to: "/cabs-booking-pannel/seo", label: "SEO overview", icon: Globe, exact: true, description: "Health of every public page at a glance." },
      { to: "/cabs-booking-pannel/seo/pages", label: "Pages", icon: FileText, description: "Titles, descriptions and content of location pages." },
      { to: "/cabs-booking-pannel/seo/locations", label: "Locations", icon: MapPin, description: "Towns and areas you serve." },
      { to: "/cabs-booking-pannel/seo/airports", label: "Airports", icon: Plane, description: "Older airport records." },
      { to: "/cabs-booking-pannel/seo/services", label: "Services", icon: Wrench, description: "Service descriptions used on pages." },
      { to: "/cabs-booking-pannel/seo/routes", label: "Routes", icon: RouteIcon, description: "Popular journey pages." },
      { to: "/cabs-booking-pannel/seo/redirects", label: "Redirects", icon: ArrowLeftRight, description: "Send old web addresses to new pages." },
      { to: "/cabs-booking-pannel/seo/import", label: "Import", icon: UploadCloud, description: "Bring in pages from a spreadsheet." },
    ],
  },
  {
    label: "Business & system", icon: SlidersHorizontal, blurb: "Company details, staff access and connections.",
    items: [
      { to: "/cabs-booking-pannel/settings", label: "General settings", icon: SettingsIcon, description: "Company details, emails, payments and booking rules." },
      { to: "/cabs-booking-pannel/users", label: "Admin users", icon: Shield, description: "Who can sign in to this console." },
      { to: "/cabs-booking-pannel/dispatch", label: "Dispatch link", icon: RouteIcon, description: "Connection that sends jobs to drivers." },
    ],
  },
];

export const ADMIN_AREAS: { id: AdminAreaId; label: string; short: string; icon: LucideIcon; home: string; nav: SidebarEntry[] }[] = [
  {
    id: "dashboard", label: "Dashboard & reports", short: "Dashboard", icon: LayoutDashboard, home: "/cabs-booking-pannel",
    nav: [
      { to: "/cabs-booking-pannel", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/cabs-booking-pannel/analytics", label: "Analytics", icon: TrendingUp },
      { to: "/cabs-booking-pannel/reports", label: "Reports", icon: BarChart3 },
      { to: "/cabs-booking-pannel/payments", label: "Payments", icon: CreditCard },
      { to: "/cabs-booking-pannel/customers", label: "Customers", icon: Users },
      { to: "/cabs-booking-pannel/logs", label: "Activity logs", icon: History },
    ],
  },
  {
    id: "bookings", label: "Bookings & messages", short: "Bookings", icon: CalendarCheck, home: "/cabs-booking-pannel/bookings",
    nav: [
      {
        label: "Bookings", icon: CalendarCheck, items: [
          { to: "/cabs-booking-pannel/bookings", label: "All bookings", icon: CalendarCheck, search: { view: "", tab: "" } },
          { to: "/cabs-booking-pannel/bookings", label: "Upcoming", icon: CalendarCheck, search: { view: "", tab: "upcoming" } },
          { to: "/cabs-booking-pannel/bookings", label: "Confirmed", icon: CalendarCheck, search: { view: "", tab: "confirmed" } },
          { to: "/cabs-booking-pannel/bookings", label: "Cancelled", icon: CircleSlash2, search: { view: "", tab: "cancelled" } },
          { to: "/cabs-booking-pannel/bookings", label: "History", icon: History, search: { view: "", tab: "history" } },
          { to: "/cabs-booking-pannel/bookings", label: "Tour enquiries", icon: RouteIcon, search: { view: "tours" } },
        ],
      },
      { to: "/cabs-booking-pannel/amendments", label: "Change requests", icon: PencilLine },
      { to: "/cabs-booking-pannel/cancellations", label: "Refunds", icon: CircleSlash2 },
      { to: "/cabs-booking-pannel/messages", label: "Messages", icon: Inbox },
      { to: "/cabs-booking-pannel/drivers", label: "Driver applications", icon: UserCog },
    ],
  },
  {
    id: "settings", label: "Settings", short: "Settings", icon: SettingsIcon, home: "/cabs-booking-pannel/site-settings",
    nav: [
      { to: "/cabs-booking-pannel/site-settings", label: "All settings", icon: SlidersHorizontal, exact: true },
      ...SETTINGS_GROUPS.map((g) => ({ label: g.label, icon: g.icon, items: g.items })),
    ],
  },
];

function navPaths(entries: SidebarEntry[]): NavItem[] {
  return entries.flatMap((e) => ("items" in e ? e.items : [e]));
}

/** Which area a console address belongs to (longest matching menu path wins). */
export function areaForPath(pathname: string): AdminAreaId {
  let best: { id: AdminAreaId; len: number } = { id: "dashboard", len: -1 };
  for (const a of ADMIN_AREAS) {
    for (const item of navPaths(a.nav)) {
      const root = "/cabs-booking-pannel";
      const hit = item.to === root ? pathname === root || pathname === root + "/" : pathname === item.to || pathname.startsWith(item.to + "/");
      if (hit && item.to.length > best.len) best = { id: a.id, len: item.to.length };
    }
  }
  return best.id;
}
