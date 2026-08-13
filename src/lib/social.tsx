import type { LucideIcon } from "lucide-react";
import { Facebook, Instagram, Youtube } from "lucide-react";

/** Simple TikTok glyph — lucide has no TikTok icon. */
export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.1v12.4a2.59 2.59 0 1 1-1.85-2.48V9.7a5.68 5.68 0 1 0 4.95 5.63V8.9a7.3 7.3 0 0 0 4.06 1.23V7.05a4.3 4.3 0 0 1-2.999-1.23Z" />
    </svg>
  );
}

export type SocialProfile = {
  key: "instagram" | "facebook" | "tiktok" | "youtube";
  label: string;
  handle: string;
  url: string;
  blurb: string;
  Icon: LucideIcon | typeof TikTokIcon;
};

/** Verified CabsLink profiles — used in nav, footer, social section and JSON-LD sameAs. */
export const SOCIALS: SocialProfile[] = [
  {
    key: "instagram",
    label: "Instagram",
    handle: "@cabs_link",
    url: "https://www.instagram.com/cabs_link/",
    blurb: "Fleet shots, airport runs and behind-the-scenes from the road.",
    Icon: Instagram,
  },
  {
    key: "facebook",
    label: "Facebook",
    handle: "CabsLink",
    url: "https://web.facebook.com/profile.php?id=61592930561866",
    blurb: "Service updates, travel notices and customer questions answered.",
    Icon: Facebook,
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: "@cabslink",
    url: "https://www.tiktok.com/@cabslink",
    blurb: "Short rides through Scotland — tours, routes and driver tips.",
    Icon: TikTokIcon,
  },
  {
    key: "youtube",
    label: "YouTube",
    handle: "@Cabslink",
    url: "https://www.youtube.com/@Cabslink",
    blurb: "Longer tour films, vehicle walkarounds and real customer reviews.",
    Icon: Youtube,
  },
];

export const SOCIAL_URLS = SOCIALS.map((s) => s.url);
