import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  X,
  Phone,
  ShieldCheck,
  Home,
  Plane,
  Car,
  Map,
  Briefcase,
  Users,
  Info,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

const MENU: Array<{ to: string; label: string; icon: any }> = [
  { to: "/", label: "Home", icon: Home },
  { to: "/airport-transfers", label: "Airport Transfers", icon: Plane },
  { to: "/fleet", label: "Our Fleet", icon: Car },
  { to: "/tours", label: "Tours", icon: Map },
  { to: "/corporate-booking", label: "Corporate", icon: Briefcase },
  { to: "/services", label: "All Services", icon: Users },
  { to: "/about", label: "About Us", icon: Info },
  { to: "/contact", label: "Contact", icon: MessageSquare },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  useEffect(() => {
    const check = async (userId?: string) => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      setIsAdmin(!!data);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s?.user.id));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              aria-label="Call"
              className="grid place-items-center size-10 rounded-full bg-[var(--gold)]/10 text-[var(--gold)]"
            >
              <Phone className="size-5" />
            </a>
            <button
              aria-label="Menu"
              onClick={() => setOpen(true)}
              className="grid place-items-center size-10 rounded-full border border-border text-foreground"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer */}
      <div
        className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-[86%] max-w-sm bg-background shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-border">
            <Logo />
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="grid place-items-center size-10 rounded-full border border-border"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {MENU.map(item => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition ${active ? "bg-[var(--gold)]/10 text-[var(--gold)]" : "text-foreground/85 hover:bg-muted"}`}
                >
                  <span className={`grid place-items-center size-9 rounded-lg ${active ? "bg-[var(--gold)]/15" : "bg-muted"}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold">{item.label}</span>
                  <ChevronRight className="size-4 opacity-50" />
                </Link>
              );
            })}

            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-3 px-3 py-3 rounded-xl mt-2 text-[var(--gold)] bg-[var(--gold)]/5">
                <span className="grid place-items-center size-9 rounded-lg bg-[var(--gold)]/15">
                  <ShieldCheck className="size-4" />
                </span>
                <span className="flex-1 text-[15px] font-semibold">Admin</span>
                <ChevronRight className="size-4 opacity-50" />
              </Link>
            )}
          </nav>

          <div className="px-4 py-4 border-t border-border space-y-3">
            <a
              href="/#booking"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[var(--gold)] text-black font-bold"
            >
              Book a Ride
            </a>
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border text-foreground/80 font-semibold"
            >
              <Phone className="size-4" /> {SITE.phoneUK}
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}

export function AppFooterMini() {
  return (
    <footer
      className="mt-8 border-t border-border bg-background text-center text-xs text-muted-foreground py-6"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
    >
      © {new Date().getFullYear()} {SITE.name} · {SITE.address}
    </footer>
  );
}

export function MobileHomeShortcuts() {
  const shortcuts = [
    { to: "/airport-transfers", label: "Airport", icon: Plane, tint: "from-sky-500/20 to-sky-500/5" },
    { to: "/fleet", label: "Fleet", icon: Car, tint: "from-amber-500/20 to-amber-500/5" },
    { to: "/tours", label: "Tours", icon: Map, tint: "from-emerald-500/20 to-emerald-500/5" },
    { to: "/corporate-booking", label: "Corporate", icon: Briefcase, tint: "from-violet-500/20 to-violet-500/5" },
  ];
  return (
    <section className="px-4 pt-4 lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        {shortcuts.map(s => {
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 bg-gradient-to-b ${s.tint} border border-border/60`}
            >
              <span className="grid place-items-center size-11 rounded-full bg-background shadow-sm">
                <Icon className="size-5 text-[var(--gold)]" />
              </span>
              <span className="text-[11px] font-semibold text-foreground/80">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
