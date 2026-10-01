import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "./Logo";
import { NAV, SITE } from "@/lib/site";



export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const destinationActive = DESTINATIONS.some((item) => pathname === item.to || pathname.startsWith(item.to + "/"));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);


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

          {/* Center nav — absolutely centred so spacing is identical on both sides */}
          <nav
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-5 xl:gap-7 2xl:gap-9"
            aria-label="Primary"
          >
            {NAV.map(item => {

              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <div key={item.to} className="contents">
                <Link
                  to={item.to}
                  className={`group relative px-1 py-1 whitespace-nowrap text-[12.5px] xl:text-[13px] font-semibold tracking-[0.04em] transition-colors duration-200 ${
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
                {item.to === "/services" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`group relative h-auto rounded-none px-1 py-1 text-[12.5px] xl:text-[13px] font-semibold tracking-[0.04em] shadow-none hover:bg-transparent ${
                          destinationActive ? "text-[var(--gold)]" : "text-[var(--navy-foreground)]/80 hover:text-[var(--navy-foreground)]"
                        }`}
                      >
                        Destinations <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" sideOffset={14} className="w-56 border-[var(--navy)]/10 bg-background p-2 shadow-xl">
                      {DESTINATIONS.map((destination) => (
                        <DropdownMenuItem key={destination.to} asChild className="cursor-pointer rounded-md px-3 py-2 focus:bg-secondary">
                          <Link to={destination.to}>{destination.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                </div>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">

            <a

              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="group hidden 2xl:inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-bold tracking-wide text-[var(--gold)] hover:text-white transition-colors"
            >
              <Phone className="size-3.5" />
              <span className="tabular-nums">{SITE.phoneUK}</span>
            </a>

            <Link
              to="/book"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--gold)] px-4 md:px-5 py-2.5 text-[11.5px] md:text-[12px] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap text-[var(--navy)] shadow-[0_10px_28px_-10px_rgba(223,175,38,0.9)] hover:shadow-[0_14px_36px_-8px_rgba(223,175,38,0.95)] hover:-translate-y-px transition-all duration-200"
            >
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-white/30 blur-sm transition-transform duration-700 group-hover:translate-x-[500%]" />
              <span className="relative">Book Now</span>
            </Link>

            {/* Compact call icon when the full phone number is hidden */}
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              aria-label="Call Cabslink"
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
                    <div key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold ${
                        active ? "bg-white/10 text-[var(--gold)]" : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--gold)]" : "bg-white/25"}`} />
                      {item.label}
                    </Link>
                    {item.to === "/services" && (
                      <details className="group px-3">
                        <summary className={`flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 text-[14px] font-semibold ${destinationActive ? "bg-white/10 text-[var(--gold)]" : "text-white/80 hover:bg-white/5"}`}>
                          Destinations
                          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="grid grid-cols-2 gap-1 pb-2 pt-1">
                          {DESTINATIONS.map((destination) => (
                            <Link key={destination.to} to={destination.to} className="rounded-lg px-3 py-2 text-[13px] text-white/75 hover:bg-white/5 hover:text-[var(--gold)]">
                              {destination.label}
                            </Link>
                          ))}
                        </div>
                      </details>
                    )}
                    </div>
                  );
                })}
              </nav>




              <Link

                to="/book"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] py-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[var(--navy)] shadow-[0_10px_28px_-10px_rgba(223,175,38,0.9)]"
              >
                Book Now
              </Link>


            </div>
          </div>
        )}
      </div>
    </div>
  );
}
