import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  "cabs-booking-pannel": "Dashboard",
  bookings: "Bookings",
  fleet: "Fleet",
  addresses: "Addresses",
  "banned-addresses": "Ban Addresses",
  drivers: "Drivers",
  customers: "Customers",
  payments: "Payments",
  coupons: "Coupons",
  settings: "Settings",
  users: "Admin Users",
  messages: "Messages",
  pricing: "Pricing",
  "hourly-rate": "Hourly Rate",
  surcharges: "Surcharges",
  content: "Website Content",
  notifications: "Notifications",
  reports: "Reports",
  logs: "Activity Logs",
};

export function Breadcrumbs() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    crumbs.push({ href: acc, label: LABELS[p] ?? p.replace(/-/g, " ") });
  }
  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" />}
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium capitalize">{c.label}</span>
          ) : (
            <Link to={c.href as any} className="hover:text-foreground capitalize">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
