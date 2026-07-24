import { Link, useRouterState } from "@tanstack/react-router";
import { Phone, MessageCircle, CalendarCheck } from "lucide-react";
import { SITE } from "@/lib/site";

/**
 * Sticky bottom action bar shown only on mobile.
 * Hidden on the booking flow (its own price bar), auth, and admin routes.
 */
export function MobileActionBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const HIDE_PREFIXES = ["/book", "/auth", "/admin"];
  const hidden = HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (hidden) return null;

  const tel = SITE.phoneUK.replace(/\s/g, "");
  const wa = tel.replace(/[^0-9]/g, "");

  return (
    <>
      {/* spacer so page content isn't hidden behind the bar */}
      <div aria-hidden className="md:hidden h-[68px]" />
      <nav
        aria-label="Quick actions"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0a1224]/95 backdrop-blur px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.4)]"
      >
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`tel:${tel}`}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-white/90 hover:text-[var(--gold)] transition"
          >
            <Phone className="size-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Call</span>
          </a>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-white/90 hover:text-[var(--gold)] transition"
          >
            <MessageCircle className="size-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">WhatsApp</span>
          </a>
          <Link
            to="/book"
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 bg-[var(--gold)] text-[var(--gold-foreground)] font-bold shadow-sm"
          >
            <CalendarCheck className="size-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Book Now</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
