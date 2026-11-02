import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "./Logo";
import { MENU, SITE, isPathActive, menuEntryActive } from "@/lib/site";



export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });

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
          className={`relative flex h-[68px] md:h-[76px] items-center justify-between gap-4 rounded-full pl-4 pr-3 md:pl-7 md:pr-3 transition-all duration-300 border border-navy-foreground/10 overflow-hidden bg-[var(--navy)]/95 ${
            scrolled
              ? "shadow-[0_16px_50px_-18px_rgba(0,0,0,0.7)]"
              : "shadow-[0_24px_60px_-22px_rgba(0,0,0,0.55)]"
          }`}
        >

          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Logo variant="gold" />
          </div>

          {/* Center nav — grouped menus, absolutely centred */}
          <nav
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-4 xl:gap-6 2xl:gap-7"
            aria-label="Primary"
          >
            {MENU.map((entry) => {
              const active = menuEntryActive(pathname, entry);
              const tone = active ? "text-[var(--gold)]" : "text-navy-foreground/80 hover:text-navy-foreground";
              const underline = (
                <span
                  aria-hidden
                  className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] bg-[var(--gold)] rounded-full transition-all duration-300 ${
                    active ? "w-5" : "w-0 group-hover:w-5"
                  }`}
                />
              );
              if (entry.kind === "link") {
                return (
                  <Link
                    key={entry.label}
                    to={entry.to}
                    className={`group relative px-1 py-1 whitespace-nowrap text-[12px] xl:text-[13px] font-semibold tracking-[0.04em] transition-colors duration-200 ${tone}`}
                  >
                    <span>{entry.label}</span>
                    {underline}
                  </Link>
                );
              }
              const wide = entry.columns.length > 2;
              return (
                <DropdownMenu key={entry.label} modal={false}>
                  <DropdownMenuTrigger
                    className={`group relative inline-flex items-center gap-1 px-1 py-1 whitespace-nowrap text-[12px] xl:text-[13px] font-semibold tracking-[0.04em] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-sm ${tone}`}
                  >
                    {entry.label}
                    <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                    {underline}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={22}
                    className={`${wide ? "w-[640px]" : entry.columns.length === 2 ? "w-[440px]" : "w-60"} rounded-2xl border-[var(--navy)]/10 bg-background p-0 shadow-[0_24px_60px_-20px_rgba(14,24,44,0.45)]`}
                  >
                    <div className={`grid gap-1 p-3 ${wide ? "grid-cols-3" : entry.columns.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {entry.columns.map((column) => (
                        <DropdownMenuGroup key={column.heading} className="min-w-0">
                          <DropdownMenuLabel className="px-3 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
                            {column.heading}
                          </DropdownMenuLabel>
                          {column.links.map((link) => {
                            const on = isPathActive(pathname, link.to);
                            return (
                              <DropdownMenuItem key={link.to} asChild className="cursor-pointer rounded-lg px-3 py-2 text-[13.5px] focus:bg-secondary">
                                <Link
                                  to={link.to}
                                  aria-current={on ? "page" : undefined}
                                  className={on ? "font-semibold text-[var(--gold-ink)]" : "text-foreground"}
                                >
                                  {link.label}
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuGroup>
                      ))}
                    </div>
                    {entry.overview && (
                      <>
                        <DropdownMenuSeparator className="m-0" />
                        <DropdownMenuItem asChild className="m-2 cursor-pointer rounded-lg px-3 py-2.5 text-[13px] font-semibold focus:bg-secondary">
                          <Link to={entry.overview.to} className="flex items-center justify-between text-[var(--navy)]">
                            {entry.overview.label}
                            <ArrowRight className="size-4 text-[var(--gold-ink)]" />
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">

            <a

              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              className="group hidden 2xl:inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-bold tracking-wide text-[var(--gold)] hover:text-navy-foreground transition-colors"
            >
              <Phone className="size-3.5" />
              <span className="tabular-nums">{SITE.phoneUK}</span>
            </a>

            <Link
              to="/book"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--gold)] px-4 md:px-5 py-2.5 text-[11.5px] md:text-[12px] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap text-[var(--navy)] shadow-[0_10px_28px_-10px_rgba(223,175,38,0.9)] hover:shadow-[0_14px_36px_-8px_rgba(223,175,38,0.95)] hover:-translate-y-px transition-all duration-200"
            >
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-navy-foreground/30 blur-sm transition-transform duration-700 group-hover:translate-x-[500%]" />
              <span className="relative">Book Now</span>
            </Link>

            {/* Compact call icon when the full phone number is hidden */}
            <a
              href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}
              aria-label="Call Cabslink"
              className="2xl:hidden grid size-10 place-items-center rounded-full bg-navy-foreground/10 text-[var(--gold)] hover:bg-navy-foreground/15"
            >
              <Phone className="size-4" />
            </a>

            {/* Mobile trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
              className="grid size-10 place-items-center rounded-full bg-navy-foreground/10 text-[var(--navy-foreground)] hover:bg-navy-foreground/15 hover:text-[var(--navy-foreground)] lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </header>


        {/* Mobile sheet */}
        {open && (
          <div className="lg:hidden mt-2 rounded-3xl navy-scene border border-navy-foreground/10 shadow-[0_20px_50px_-20px_rgba(14,24,44,0.6)] overflow-hidden">
            <div className="p-3 flex flex-col">
              <nav className="flex flex-col" aria-label="Mobile">
                {MENU.map((entry) => {
                  const active = menuEntryActive(pathname, entry);
                  if (entry.kind === "link") {
                    return (
                      <Link
                        key={entry.label}
                        to={entry.to}
                        className={`flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold ${
                          active ? "bg-navy-foreground/10 text-[var(--gold)]" : "text-navy-foreground/80 hover:bg-navy-foreground/5"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--gold)]" : "bg-navy-foreground/25"}`} />
                        {entry.label}
                      </Link>
                    );
                  }
                  return (
                    <details key={entry.label} className="group" open={active}>
                      <summary
                        className={`flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden ${
                          active ? "bg-navy-foreground/10 text-[var(--gold)]" : "text-navy-foreground/80 hover:bg-navy-foreground/5"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--gold)]" : "bg-navy-foreground/25"}`} />
                        <span className="flex-1">{entry.label}</span>
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-3 px-3 pb-3 pt-1">
                        {entry.columns.map((column) => (
                          <div key={column.heading}>
                            <p className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]/90">{column.heading}</p>
                            <div className="grid grid-cols-2 gap-1">
                              {column.links.map((link) => {
                                const on = isPathActive(pathname, link.to);
                                return (
                                  <Link
                                    key={link.to}
                                    to={link.to}
                                    aria-current={on ? "page" : undefined}
                                    className={`rounded-lg px-3 py-2 text-[13px] hover:bg-navy-foreground/5 ${on ? "text-[var(--gold)] font-semibold" : "text-navy-foreground/80"}`}
                                  >
                                    {link.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {entry.overview && (
                          <Link to={entry.overview.to} className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[var(--gold)]">
                            {entry.overview.label} <ArrowRight className="size-4" />
                          </Link>
                        )}
                      </div>
                    </details>
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
