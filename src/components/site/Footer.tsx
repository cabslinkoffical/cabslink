import { resetConsent } from "@/lib/consent";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { TRUSTPILOT } from "@/lib/trustpilot";
import { SOCIALS } from "@/lib/social";

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
  { to: "/travel-solutions", label: "Travel Solutions" },
  { to: "/areas", label: "Locations" },
  { to: "/routes", label: "Popular Routes" },
  { to: "/reviews", label: "Reviews" },



  { to: "/corporate-booking", label: "Corporate Booking" },
  { to: "/contact", label: "Contact" },
  { to: "/book", label: "Book Now" },
];

const legal = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/booking-policy", label: "Booking & Cancellation" },
  { to: "/refund-policy", label: "Refund Policy" },
  { to: "/accessibility", label: "Accessibility" },
  { to: "/image-credits", label: "Image Credits" },
];

export function Footer() {
  return (
    <footer className="navy-scene">

      <div className="container-x py-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">

        <div>
          <Logo variant="gold" />
          <p className="mt-4 text-sm text-white/70 max-w-xs">
            Premium UK airport transfers and airport travel services — punctual,
            professional and effortlessly comfortable, around the clock.
          </p>
          <ul className="mt-6 flex items-center gap-3">
            {SOCIALS.map(({ key, label, url, Icon }) => (
              <li key={key}>
                <a
                  href={url}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
                >
                  <Icon className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">Quick Links</h4>
          <ul className="mt-5 space-y-1 text-sm text-white/75 md:space-y-3">
            {links.map(l => (
              <li key={l.to}>{l.to.includes("#") ? (
                <a href={l.to} className="inline-flex min-h-11 items-center hover:text-[var(--gold)] md:min-h-0">{l.label}</a>
              ) : (
                <Link to={l.to} className="inline-flex min-h-11 items-center hover:text-[var(--gold)] md:min-h-0">{l.label}</Link>
              )}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">Services</h4>
          <ul className="mt-5 space-y-1 text-sm text-white/75 md:space-y-3">
            {services.map(s => (
              <li key={s.to}><Link to={s.to} className="inline-flex min-h-11 items-center hover:text-[var(--gold)] md:min-h-0">{s.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">Contact</h4>
          <ul className="mt-5 space-y-4 text-sm text-white/80">
            <li className="flex gap-3"><MapPin className="size-4 shrink-0 mt-0.5 text-[var(--gold)]" /><span>{SITE.address}</span></li>
            <li className="flex gap-3"><Phone className="size-4 shrink-0 mt-0.5 text-[var(--gold)]" /><div><a href={`tel:${SITE.phoneUK.replace(/\s/g,"")}`} className="flex min-h-10 items-center hover:text-[var(--gold)] md:min-h-0">{SITE.phoneUK}</a><a href={`tel:${SITE.phoneUS.replace(/[^\d+]/g,"")}`} className="flex min-h-10 items-center hover:text-[var(--gold)] md:min-h-0">{SITE.phoneUS}</a></div></li>
            <li className="flex gap-3"><Mail className="size-4 shrink-0 mt-0.5 text-[var(--gold)]" /><a href={`mailto:${SITE.email}`} className="inline-flex min-h-10 items-center hover:text-[var(--gold)] md:min-h-0">{SITE.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 flex flex-col gap-4 text-xs text-white/60">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {legal.map(l => (
              <li key={l.to}><Link to={l.to} className="inline-flex min-h-10 items-center hover:text-[var(--gold)] md:min-h-0">{l.label}</Link></li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => resetConsent()}
                className="inline-flex min-h-10 items-center hover:text-[var(--gold)] md:min-h-0"
              >
                Cookie settings
              </button>
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Cabslink. All rights reserved.</p>
            <a
              href={TRUSTPILOT.profileUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="hover:text-[var(--gold)]"
            >
              Reviews on Trustpilot
            </a>
            <p>Edinburgh · London · UK Wide</p>
          </div>

        </div>
      </div>
    </footer>
  );
}
