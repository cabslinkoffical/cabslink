import type { LinkProps } from "@tanstack/react-router";

export const SITE = {
  name: "Cabslink",
  tagline: "UK's Trusted & Reliable Airport Transfer Service",
  email: "info@cabslink.com",
  phoneUK: "+44 333 888 2991",
  address: "263a Leith Walk, Edinburgh, Scotland, EH6 8NY",
  /** The same address split for structured data. */
  addressParts: { street: "263a Leith Walk", locality: "Edinburgh", region: "Scotland", postalCode: "EH6 8NY", country: "GB" },
  url: "https://cabslink.com",
  social: {
    instagram: "https://www.instagram.com/cabs_link/",
    facebook: "https://www.facebook.com/profile.php?id=61593394127202",
    tiktok: "https://www.tiktok.com/@cabslink",
    youtube: "https://www.youtube.com/@Cabslink",
  },
};

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/fleet", label: "Fleet" },
  { to: "/tours", label: "Tours" },
  { to: "/areas", label: "Areas" },
  { to: "/corporate-booking", label: "Corporate" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
] as const;

export const DESTINATIONS = [
  { to: "/airports", label: "Airports" },
  { to: "/routes", label: "Routes" },
  { to: "/attractions", label: "Attractions" },
  { to: "/distilleries", label: "Distilleries" },
  { to: "/cruise-ports", label: "Cruise Ports" },
  { to: "/hospitals", label: "Hospitals" },
  { to: "/universities", label: "Universities" },
  { to: "/stations", label: "Train Stations" },
  { to: "/guides", label: "Travel Guides" },
] as const;

/** One link inside a grouped header menu. */
export type MenuPath = NonNullable<LinkProps["to"]>;
export type MenuLink = { to: MenuPath; label: string };
export type MenuColumn = { heading: string; links: MenuLink[] };
export type MenuEntry =
  | { kind: "link"; to: MenuPath; label: string }
  | {
      kind: "group";
      label: string;
      /** Overview page shown as the "view all" link at the bottom of the panel. */
      overview?: MenuLink;
      columns: MenuColumn[];
    };

/**
 * Header menu, grouped so related pages sit together instead of one long row.
 * Every `to` must be an existing public page (no redirects).
 */
export const MENU: MenuEntry[] = [
  { kind: "link", to: "/", label: "Home" },
  {
    kind: "group",
    label: "Services",
    overview: { to: "/services", label: "All services" },
    columns: [
      {
        heading: "Transfers",
        links: [
          { to: "/airport-transfers", label: "Airport Transfers" },
          { to: "/edinburgh-airport-taxi-prices", label: "Airport Taxi Prices" },
          { to: "/private-hire", label: "Private Hire" },
          { to: "/executive-transfers", label: "Executive Transfers" },
          { to: "/vip-transfers", label: "VIP Transfers" },
          { to: "/long-distance-transfers", label: "Long Distance" },
          { to: "/cruise-transfers", label: "Cruise Transfers" },
        ],
      },
      {
        heading: "Groups & occasions",
        links: [
          { to: "/group-transfers", label: "Group Transfers" },
          { to: "/minibus-hire", label: "Minibus Hire" },
          { to: "/event-transport", label: "Events & Weddings" },
          { to: "/golf-transfers", label: "Golf Transfers" },
          { to: "/team-sports-travel", label: "Sports Travel" },
          { to: "/university-transfers", label: "University Transfers" },
          { to: "/hospital-transfers", label: "Hospital Transfers" },
          { to: "/family-airport-transfers", label: "Family Airport Transfers" },
          { to: "/hotel-transfers", label: "Hotel Transfers" },
          { to: "/late-night-airport-transfers", label: "Late-Night Airport Transfers" },
        ],
      },
      {
        heading: "Business",
        links: [
          { to: "/corporate-booking", label: "Corporate Accounts" },
          { to: "/corporate-travel", label: "Corporate Travel" },
          { to: "/travel-solutions", label: "Travel Solutions" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Destinations",
    overview: { to: "/areas", label: "All areas we cover" },
    columns: [
      {
        heading: "Travel hubs",
        links: [
          { to: "/airports", label: "Airports" },
          { to: "/stations", label: "Train Stations" },
          { to: "/cruise-ports", label: "Cruise Ports" },
          { to: "/routes", label: "Popular Routes" },
        ],
      },
      {
        heading: "Places to visit",
        links: [
          { to: "/areas", label: "Areas We Cover" },
          { to: "/attractions", label: "Attractions" },
          { to: "/distilleries", label: "Distilleries" },
          { to: "/universities", label: "Universities" },
          { to: "/hospitals", label: "Hospitals" },
          { to: "/guides", label: "Travel Guides" },
        ],
      },
    ],
  },
  { kind: "link", to: "/fleet", label: "Fleet" },
  { kind: "link", to: "/tours", label: "Tours" },
  {
    kind: "group",
    label: "Company",
    columns: [
      {
        heading: "About Cabslink",
        links: [
          { to: "/about", label: "About Us" },
          { to: "/reviews", label: "Reviews" },
          { to: "/blog", label: "Blog" },
          { to: "/drive-with-us", label: "Drive With Us" },
        ],
      },
      {
        heading: "Help",
        links: [
          { to: "/faq", label: "FAQs" },
          { to: "/manage-booking", label: "Manage Booking" },
          { to: "/booking-policy", label: "Booking & Cancellation" },
          { to: "/refund-policy", label: "Refund Policy" },
        ],
      },
    ],
  },
  { kind: "link", to: "/contact", label: "Contact" },
];

/** True when `pathname` is `to` or a page beneath it. */
export function isPathActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

export function menuEntryActive(pathname: string, entry: MenuEntry): boolean {
  if (entry.kind === "link") return isPathActive(pathname, entry.to);
  return (
    (entry.overview ? isPathActive(pathname, entry.overview.to) : false) ||
    entry.columns.some((c) => c.links.some((l) => isPathActive(pathname, l.to)))
  );
}

