import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, ShieldCheck, ArrowRight } from "lucide-react";
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
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[var(--navy)]/10 shadow-[0_10px_30px_-20px_rgba(14,24,44,0.25)]"
          : "bg-[var(--navy)]/40 backdrop-blur-md border-b border-white/10"
      }`}
    >
      <div className="container-x flex h-16 md:h-20 items-center justify-between gap-6">
        {/* Logo */}
        <div className="shrink-0">
          <Logo />
        </div>

        {/* Center glossy pill nav */}
        <nav
          className={`hidden lg:flex relative items-center gap-1 rounded-full border px-2 py-1.5 overflow-hidden transition-all duration-500 ${
            scrolled
              ? "border-[var(--navy)]/10 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(14,24,44,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]"
              : "border-white/25 bg-white/12 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]"
          }`}
          aria-label="Primary"
        >
          {/* Glossy top-highlight sheen */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-full ${
              scrolled
                ? "bg-gradient-to-b from-white/90 to-transparent opacity-70"
                : "bg-gradient-to-b from-white/40 to-transparent opacity-90"
            }`}
          />
          {NAV.map(item => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative px-4 py-1.5 rounded-full text-[11px] font-bold font-display uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "text-[var(--gold-foreground)]"
                    : scrolled
                    ? "text-[var(--navy)]/80 hover:text-[var(--navy)]"
                    : "text-white/95 hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[var(--gold)] shadow-[0_8px_24px_-6px_var(--gold),inset_0_1px_0_rgba(255,255,255,0.6)]"
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2 md:gap-3 shrink-0">
          <a
            href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
            className={`hidden xl:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-colors ${
              scrolled
                ? "text-[var(--navy)]/80 hover:text-[var(--navy)]"
                : "text-white/85 hover:text-white"
            }`}
          >
            <span className="grid size-8 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
              <Phone className="size-3.5" />
            </span>
            <span className="text-[13px] font-semibold tabular-nums leading-none">{SITE.phoneUK}</span>
          </a>

          {isAdmin && (
            <Link
              to="/admin"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
                scrolled
                  ? "text-[var(--gold-ink)] hover:bg-[var(--gold)]/10"
                  : "text-[var(--gold)] hover:bg-white/10"
              }`}
            >
              <ShieldCheck className="size-3.5" /> Admin
            </Link>
          )}

          <Link
            to="/book"
            className="group relative inline-flex items-center gap-2 rounded-full bg-[var(--gold)] pl-5 pr-2 py-2 text-[11px] font-bold font-display uppercase tracking-[0.18em] text-[var(--gold-foreground)] shadow-[0_10px_30px_-12px_var(--gold)] hover:brightness-105 transition-all"
          >
            Book a Ride
            <span className="grid size-7 place-items-center rounded-full bg-[var(--navy)] text-[var(--gold)] transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className={`lg:hidden grid place-items-center size-10 rounded-full border transition-colors ${
            scrolled
              ? "border-[var(--navy)]/15 text-[var(--navy)] bg-white"
              : "border-white/20 text-white bg-white/5 backdrop-blur"
          }`}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden absolute inset-x-0 top-full border-t border-[var(--navy)]/10 bg-white/95 backdrop-blur-xl shadow-[0_20px_40px_-20px_rgba(14,24,44,0.25)]">
          <div className="container-x py-5 flex flex-col">
            <nav className="flex flex-col divide-y divide-[var(--navy)]/8">
              {NAV.map(item => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center justify-between py-3.5 text-[13px] font-bold font-display uppercase tracking-[0.16em] ${
                      active ? "text-[var(--gold-ink)]" : "text-[var(--navy)]/80"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className={`size-4 transition-transform ${active ? "text-[var(--gold)]" : "text-[var(--navy)]/30"}`} />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <a
                href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--navy)]/15 px-4 py-3 text-xs font-bold text-[var(--navy)]"
              >
                <Phone className="size-4 text-[var(--gold)]" /> Call
              </a>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-4 py-3 text-xs font-bold font-display uppercase tracking-[0.18em] text-[var(--gold-foreground)]"
              >
                Book <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--gold)]/40 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]"
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
