// Breadcrumb structured data for top-level pages whose own head() has none.
// Labels mirror each page's subject; pages with their own breadcrumb are not listed.
export const AUTO_BREADCRUMB_LABELS: Record<string, string> = {
  "/accessibility": "Accessibility",
  "/airport-transfers": "Airport Transfers",
  "/airports": "Airports",
  "/booking-policy": "Booking Policy",
  "/contact": "Contact",
  "/corporate": "Corporate",
  "/corporate-booking": "Corporate Booking",
  "/corporate-travel": "Corporate Travel",
  "/drive-with-us": "Drive With Us",
  "/football-transfers": "Football Transfers",
  "/golf-transfers": "Golf Transfers",
  "/refund-policy": "Refund Policy",
  "/routes": "Routes",
  "/stadium-transfers": "Stadium Transfers",
  "/team-sports-travel": "Team Sports Travel",
  "/vip-sports-hospitality": "VIP Sports Hospitality",
  "/vip-transfers": "VIP Transfers",
};

export function autoBreadcrumb(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const name = AUTO_BREADCRUMB_LABELS[path];
  if (!name) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cabslink.com/" },
      { "@type": "ListItem", position: 2, name, item: `https://cabslink.com${path}` },
    ],
  };
}
