import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, ShieldCheck } from "lucide-react";
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
    <div className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "pt-2" : "pt-4"}`}>
      <div className="container-x">
        <header
          className={`relative flex h-16 items-center justify-between gap-4 rounded-full pl-3 pr-2 md:pl-5 md:pr-3 transition-all duration-300 navy-scene border border-white/10 ${
            scrolled
              ? "shadow-[0_12px_40px_-16px_rgba(14,24,44,0.55)]"
              : "shadow-[0_18px_50px_-20px_rgba(14,24,44,0.45)]"
          }`}
        >
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Logo variant="dark" />
          </div>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2" aria-label="Primary">
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
                to="/admin"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 hover:text-[var(--gold)] transition-colors"
              >
                <ShieldCheck className="size-3.5" /> Admin
              </Link>
            )}

            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-4 md:px-5 py-2.5 text-[12px] font-bold text-[var(--navy)] shadow-[0_8px_24px_-10px_rgba(223,175,38,0.9)] hover:shadow-[0_12px_32px_-8px_rgba(223,175,38,0.95)] hover:-translate-y-px transition-all duration-200"
            >
              <Phone className="size-3.5" />
              <span className="hidden sm:inline tabular-nums">{SITE.phoneUK}</span>
              <span className="sm:hidden">Call</span>
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

              {isAdmin && (
                <Link
                  to="/admin"
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
