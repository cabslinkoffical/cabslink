export const SITE = {
  name: "Cabslink",
  tagline: "UK's Trusted & Reliable Airport Transfer Service",
  email: "info@cabslink.com",
  phoneUK: "+44 333 888 2991",
  address: "263a Leith Walk, Edinburgh, Scotland, EH6 8NY",
  social: {
    instagram: "https://www.instagram.com/cabs_link/",
    facebook: "https://web.facebook.com/profile.php?id=61592930561866",
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

