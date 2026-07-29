export const SITE = {
  name: "Cabslink",
  tagline: "UK's Trusted & Reliable Airport Transfer Service",
  email: "info@cabslink.com",
  phoneUK: "+44 333 888 2991",
  phoneUS: "+1 (315) 961-8102",
  address: "263a Leith Walk, Edinburgh, Scotland, EH6 8NY",
  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    twitter: "https://twitter.com/",
    linkedin: "https://linkedin.com/",
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

export const VEHICLE_TYPES = [
  "Mercedes-Benz E-Class",
  "Mercedes-Benz S-Class",
  "Mercedes-Benz V-Class",
  "Range Rover",
  "Rolls-Royce Bentley",
  "Mini Bus (16-seater)",
  "Coaster Bus (24-seater)",
  "Coach Bus (55-seater)",
] as const;
