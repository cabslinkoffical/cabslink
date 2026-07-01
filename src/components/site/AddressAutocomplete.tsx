import { useEffect, useRef, useState } from "react";
import type { PlaceSuggestion } from "@/routes/api/places-autocomplete";
import { Input } from "@/components/ui/input";
import { MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "all" | "areas" | "addresses";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  iconClassName?: string;
  mode?: Mode;
};


export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className,
  iconClassName,
  mode = "all",
}: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const sessionRef = useRef<string>(crypto.randomUUID());
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/places-autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: term, sessionToken: sessionRef.current, mode }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const json = (await res.json()) as { suggestions: PlaceSuggestion[] };
        setSuggestions(json.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [value, mode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (s: PlaceSuggestion) => {
    onChange(s.full || `${s.primary}${s.secondary ? ", " + s.secondary : ""}`);
    setOpen(false);
    sessionRef.current = crypto.randomUUID();
  };

  const showChips = open && value.trim().length < 2;

  return (
    <div ref={wrapRef} className="relative">
      <MapPin
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--gold)] pointer-events-none",
          iconClassName,
        )}
      />
      <Input
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "border-0 shadow-none bg-transparent pl-12 h-[52px] text-sm focus-visible:ring-0",
          className,
        )}
      />


      {open && !showChips && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <ul className="max-h-72 overflow-auto py-1">
            {suggestions.map((s, i) => {
              const Icon = s.kind === "area" ? Building2 : MapPin;
              return (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(s);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors",
                      i === active ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]/70",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                        s.kind === "area"
                          ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                          : "bg-[var(--surface)] text-foreground/60",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="block text-sm font-semibold text-foreground truncate">
                          {s.primary}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-[0.15em] font-bold px-1.5 py-0.5 rounded",
                            s.kind === "area"
                              ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                              : "bg-foreground/5 text-foreground/50",
                          )}
                        >
                          {s.kind === "area" ? "Area" : "Address"}
                        </span>
                      </span>
                      {s.secondary && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {s.secondary}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/40 border-t border-border bg-[var(--surface)]/40">
            UK addresses & areas · powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
