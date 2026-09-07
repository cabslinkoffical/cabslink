import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";
import { SOCIALS } from "@/lib/social";

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
        </div>
        <div className="flex items-center gap-5 opacity-80">
          <Link
            to="/manage-booking"
            className="flex items-center gap-1.5 hover:text-[var(--gold)] transition"
          >
            <MapPin className="size-3.5" /> Track booking
          </Link>
          <div className="h-4 w-px bg-white/20" />
          {SOCIALS.map(({ key, label, url, Icon }) => (
            <a
              key={key}
              href={url}
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--gold)]"
            >
              <Icon className="size-3.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

