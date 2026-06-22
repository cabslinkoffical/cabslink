import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

const services = [
  { to: "/airport-transfers", label: "Airport Transfers" },
  { to: "/vip-transfers", label: "VIP Transfers" },
  { to: "/corporate-travel", label: "Corporate Travel" },
  { to: "/tours", label: "Tours & Trips" },
  { to: "/fleet", label: "Our Fleet" },
  { to: "/drive-with-us", label: "Drive With Us" },
];

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services" },
  { to: "/corporate-booking", label: "Corporate Booking" },
  { to: "/contact", label: "Contact" },
  { to: "/book", label: "Book Now" },
];

export function Footer() {
  return (
    <footer className="bg-[var(--navy)] text-[var(--navy-foreground)] mt-20">
      <div className="container-x py-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo variant="gold" />
          <p className="mt-4 text-sm text-white/70 max-w-xs">
            Premium UK airport transfers and chauffeur services — punctual,
            professional and effortlessly comfortable, around the clock.
          </p>
          <div className="mt-6 flex gap-3">
            {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" aria-label="social" className="grid size-9 place-items-center rounded-full border border-white/15 hover:bg-[var(--gold)] hover:text-[var(--navy)] hover:border-[var(--gold)] transition">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">Quick Links</h4>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            {links.map(l => (
              <li key={l.to}><Link to={l.to} className="hover:text-[var(--gold)]">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">Services</h4>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            {services.map(s => (
              <li key={s.to}><Link to={s.to} className="hover:text-[var(--gold)]">{s.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">Contact</h4>
          <ul className="mt-5 space-y-4 text-sm text-white/80">
            <li className="flex gap-3"><MapPin className="size-4 shrink-0 mt-0.5 text-[var(--gold)]" /><span>{SITE.address}</span></li>
            <li className="flex gap-3"><Phone className="size-4 shrink-0 mt-0.5 text-[var(--gold)]" /><div><a href={`tel:${SITE.phoneUK.replace(/\s/g,"")}`} className="block hover:text-[var(--gold)]">{SITE.phoneUK}</a><a href={`tel:${SITE.phoneUS.replace(/[^\d+]/g,"")}`} className="block hover:text-[var(--gold)]">{SITE.phoneUS}</a></div></li>
            <li className="flex gap-3"><Mail className="size-4 shrink-0 mt-0.5 text-[var(--gold)]" /><a href={`mailto:${SITE.email}`} className="hover:text-[var(--gold)]">{SITE.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Cabslink. All rights reserved.</p>
          <p>Edinburgh · London · UK Wide</p>
        </div>
      </div>
    </footer>
  );
}
