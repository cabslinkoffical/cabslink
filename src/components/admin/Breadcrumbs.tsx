import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  "cabs-booking-pannel": "Dashboard",
  bookings: "Bookings",
  cancellations: "Cancellations & Refunds",
  messages: "Messages",
  payments: "Payments",
  "vehicle-classes": "Vehicle Classes",
  "pricing-schemes": "Pricing Schemes",
  extras: "Extras",
  coupons: "Coupons",
  availability: "Availability Rules",
  drivers: "Drivers",
  customers: "Customers",
  users: "Admin Users",
  "scenic-routes": "Tour Routes",
  pois: "Stops & Landmarks",
  "tour-settings": "Tour Settings",
  addresses: "Addresses",
  "banned-addresses": "Banned Addresses",
  blog: "Blog",
  categories: "Categories",
  tags: "Tags",
  authors: "Authors",
  seo: "SEO",
  pages: "Pages",
  sections: "Sections",
  locations: "Locations",
  airports: "Airports",
  services: "Services",
  routes: "Routes",
  redirects: "Redirects",
  import: "Import",
  reports: "Reports",
  settings: "Settings",
  logs: "Activity Logs",
  new: "New",
};

const isId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s) || /^\d+$/.test(s);

export function Breadcrumbs() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    crumbs.push({ href: acc, label: LABELS[p] ?? (isId(p) ? "Details" : p.replace(/-/g, " ")) });
  }
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href} className={`flex items-center gap-1 ${last ? "min-w-0" : "hidden sm:flex"}`}>
            {i > 0 && <ChevronRight className="size-3 shrink-0" />}
            {last ? (
              <span className="truncate text-foreground font-medium capitalize">{c.label}</span>
            ) : (
              <Link to={c.href as any} className="hover:text-foreground capitalize whitespace-nowrap">{c.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
