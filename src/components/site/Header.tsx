import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";
import { NAV, SITE } from "@/lib/site";
import { Button } from "@/components/ui/button";
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
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-background/80 backdrop-blur-sm"}`}>
      <div className="container-x flex h-16 items-center justify-between md:h-20">
        <Logo />
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-foreground/70 hover:text-[var(--gold)] rounded-md transition"
              activeProps={{ className: "text-[var(--gold)]" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-[var(--gold)]">
            <Phone className="size-4" /> {SITE.phoneUK}
          </a>
          {isAdmin ? (
            <Link to="/admin" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--gold)] hover:opacity-80">
              <ShieldCheck className="size-4" /> Admin
            </Link>
          ) : null}
          <Button asChild variant="slash">
            <Link to="/book">Book a Ride</Link>
          </Button>
        </div>
        <button
          aria-label="Menu"
          onClick={() => setOpen(v => !v)}
          className="lg:hidden grid place-items-center size-10 rounded-md border border-border text-foreground"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container-x py-4 flex flex-col gap-1">
            {NAV.map(item => (
              <Link key={item.to} to={item.to} className="py-2.5 text-base font-semibold uppercase tracking-wider text-foreground/80">
                {item.label}
              </Link>
            ))}
            <Button asChild variant="slash" className="mt-3 self-start">
              <Link to="/book">Book a Ride</Link>
            </Button>
            <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`} className="mt-2 text-center text-sm text-foreground/70">
              Call {SITE.phoneUK}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
