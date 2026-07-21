import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { SITE } from "@/lib/site";

export function TopBar() {
  return (
    <div className="hidden border-b border-white/10 navy-scene md:block">
      <div className="container-x flex h-10 items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 opacity-80 hover:opacity-100 hover:text-[var(--gold)] transition">
            <Mail className="size-3.5" /> {SITE.email}
          </a>
          <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="flex items-center gap-2 opacity-80 hover:opacity-100 hover:text-[var(--gold)] transition">
            <Phone className="size-3.5" /> {SITE.phoneUK}
          </a>
          <span className="hidden lg:flex items-center gap-2 opacity-70">
            <MapPin className="size-3.5" /> {SITE.address}
          </span>
        </div>
        <div className="flex items-center gap-3 opacity-80">
          <a href={SITE.social.facebook} aria-label="Facebook" className="hover:text-[var(--gold)]"><Facebook className="size-3.5" /></a>
          <a href={SITE.social.instagram} aria-label="Instagram" className="hover:text-[var(--gold)]"><Instagram className="size-3.5" /></a>
          <a href={SITE.social.twitter} aria-label="Twitter" className="hover:text-[var(--gold)]"><Twitter className="size-3.5" /></a>
          <a href={SITE.social.linkedin} aria-label="LinkedIn" className="hover:text-[var(--gold)]"><Linkedin className="size-3.5" /></a>
        </div>
      </div>
    </div>
  );
}
