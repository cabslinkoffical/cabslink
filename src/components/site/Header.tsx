import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, ShieldCheck, ArrowUpRight } from "lucide-react";
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

  const dark = !scrolled; // dark = over hero (white text)

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl border-b border-[var(--navy)]/8 shadow-[0_1px_0_rgba(14,24,44,0.04),0_8px_28px_-16px_rgba(14,24,44,0.18)]"
          : "bg-transparent"
      }`}
    >
      <div className="container-x flex h-16 md:h-[74px] items-center justify-between gap-8">
        {/* Logo */}
        <div className="shrink-0 flex items-center">
          <Logo />
        </div>

        {/* Center nav — clean minimal with animated underline */}
        <nav className="hidden lg:flex items-center gap-9" aria-label="Primary">
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
                  dark
                    ? active ? "text-white" : "text-white/75 hover:text-white"
                    : active ? "text-[var(--navy)]" : "text-[var(--navy)]/65 hover:text-[var(--navy)]"
                }`}
              >
                <span>{item.label}</span>
                {/* Animated gold underline */}
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 left-0 h-[2px] bg-[var(--gold)] rounded-full transition-all duration-300 ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <a
            href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
            className={`hidden xl:inline-flex items-center gap-2 text-[13px] font-semibold transition-colors ${
              dark ? "text-white/85 hover:text-white" : "text-[var(--navy)]/80 hover:text-[var(--navy)]"
            }`}
          >
            <Phone className="size-3.5 text-[var(--gold)]" />
            <span className="tabular-nums">{SITE.phoneUK}</span>
          </a>

          {/* Divider */}
          <span className={`hidden xl:block h-5 w-px ${dark ? "bg-white/20" : "bg-[var(--navy)]/15"}`} />

          {isAdmin && (
            <Link
              to="/admin"
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${
                dark ? "text-white/80 hover:text-[var(--gold)]" : "text-[var(--navy)]/75 hover:text-[var(--gold-ink)]"
              }`}
            >
              <ShieldCheck className="size-3.5" /> Admin
            </Link>
          )}

          <Link
            to="/book"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--navy)] shadow-[0_8px_24px_-10px_rgba(223,175,38,0.9)] hover:shadow-[0_12px_32px_-8px_rgba(223,175,38,0.95)] hover:-translate-y-px transition-all duration-200"
          >
            Book a Ride
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className={`lg:hidden grid place-items-center size-10 rounded-full transition-colors ${
            dark
              ? "text-white bg-white/10 hover:bg-white/15 backdrop-blur"
              : "text-[var(--navy)] bg-[var(--navy)]/[0.06] hover:bg-[var(--navy)]/[0.09]"
          }`}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Bottom hairline visible only on hero for structure */}
      {dark && (
        <div className="hidden lg:block absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      )}

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden absolute inset-x-0 top-full bg-white shadow-[0_20px_40px_-20px_rgba(14,24,44,0.25)] border-t border-[var(--navy)]/8">
          <div className="container-x py-4 flex flex-col">
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
                    className={`flex items-center justify-between py-3.5 border-b border-[var(--navy)]/6 text-[14px] font-semibold ${
                      active ? "text-[var(--navy)]" : "text-[var(--navy)]/75"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--gold)]" : "bg-[var(--navy)]/15"}`} />
                      {item.label}
                    </span>
                    <ArrowUpRight className={`size-4 ${active ? "text-[var(--gold-ink)]" : "text-[var(--navy)]/30"}`} />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--navy)]/12 px-4 py-3 text-xs font-bold text-[var(--navy)]"
              >
                <Phone className="size-4 text-[var(--gold)]" /> Call
              </a>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]"
              >
                Book <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--gold)]/40 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]"
              >
                <ShieldCheck className="size-3.5" /> Admin Panel
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
