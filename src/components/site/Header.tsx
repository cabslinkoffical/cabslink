import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, ShieldCheck, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { NAV, SITE } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const check = async (userId: string | undefined) => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      setIsAdmin(!!data);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => check(session?.user.id));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className={`sticky lg:static top-0 z-50 transition-all duration-300 navy-scene ${scrolled ? "pt-2 md:pt-3 pb-2 md:pb-3" : "pt-4 md:pt-6 pb-4 md:pb-6"}`}>
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
        <header
          className={`relative flex h-[68px] md:h-[76px] items-center justify-between gap-4 rounded-full pl-4 pr-3 md:pl-7 md:pr-3 transition-all duration-300 border border-white/10 overflow-hidden bg-[var(--navy)]/95 ${
            scrolled
              ? "shadow-[0_16px_50px_-18px_rgba(0,0,0,0.7)]"
              : "shadow-[0_24px_60px_-22px_rgba(0,0,0,0.55)]"
          }`}
        >

          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Logo variant="gold" />
          </div>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 absolute left-1/2 -translate-x-1/2" aria-label="Primary">
            {NAV.map(item => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative py-1 text-[13px] font-semibold tracking-[0.02em] transition-colors duration-200 ${
                    active ? "text-[var(--gold)]" : "text-white/80 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] bg-[var(--gold)] rounded-full transition-all duration-300 ${
                      active ? "w-5" : "w-0 group-hover:w-5"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link
                to="/cabs-booking-pannel"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 hover:text-[var(--gold)] transition-colors"
              >
                <ShieldCheck className="size-3.5" /> Admin
              </Link>
            )}

            <Link
              to="/track-booking"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold tracking-wide text-white/80 hover:text-[var(--gold)] transition-colors"
            >
              <MapPin className="size-3.5" /> Track
            </Link>

            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="group hidden 2xl:inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-bold tracking-wide text-[var(--gold)] hover:text-white transition-colors"
            >
              <Phone className="size-3.5" />
              <span className="tabular-nums">{SITE.phoneUK}</span>
            </a>

            <Link
              to="/book"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--gold)] px-5 md:px-6 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--navy)] shadow-[0_10px_28px_-10px_rgba(223,175,38,0.9)] hover:shadow-[0_14px_36px_-8px_rgba(223,175,38,0.95)] hover:-translate-y-px transition-all duration-200"
            >
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-white/30 blur-sm transition-transform duration-700 group-hover:translate-x-[500%]" />
              <span className="relative">Book Now</span>
            </Link>

            {/* Compact call icon when the full phone number is hidden */}
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              aria-label="Call CabsLink"
              className="2xl:hidden grid size-10 place-items-center rounded-full bg-white/10 text-[var(--gold)] hover:bg-white/15"
            >
              <Phone className="size-4" />
            </a>

            {/* Mobile trigger */}
            <button
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15 lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </header>


        {/* Mobile sheet */}
        {open && (
          <div className="lg:hidden mt-2 rounded-3xl navy-scene border border-white/10 shadow-[0_20px_50px_-20px_rgba(14,24,44,0.6)] overflow-hidden">
            <div className="p-3 flex flex-col">
              <nav className="flex flex-col">
                {NAV.map(item => {
                  const active =
                    item.to === "/"
                      ? pathname === "/"
                      : pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold ${
                        active ? "bg-white/10 text-[var(--gold)]" : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--gold)]" : "bg-white/25"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <Link
                to="/book"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] py-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[var(--navy)] shadow-[0_10px_28px_-10px_rgba(223,175,38,0.9)]"
              >
                Book Now
              </Link>


              {isAdmin && (
                <Link
                  to="/cabs-booking-pannel"
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--gold)]/40 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]"
                >
                  <ShieldCheck className="size-3.5" /> Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
