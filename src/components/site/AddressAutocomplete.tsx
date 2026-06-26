import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { placesAutocomplete, type PlaceSuggestion } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  iconClassName?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className,
  iconClassName,
}: Props) {
  const fetchSuggestions = useServerFn(placesAutocomplete);
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
    const t = setTimeout(async () => {
      try {
        const res = await fetchSuggestions({
          data: { input: term, sessionToken: sessionRef.current },
        });
        setSuggestions(res.suggestions);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [value, fetchSuggestions]);

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
        onFocus={() => suggestions.length && setOpen(true)}
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
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <ul className="max-h-72 overflow-auto py-1">
            {suggestions.map((s, i) => (
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
                  <MapPin className="w-4 h-4 mt-0.5 text-[var(--gold)] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground truncate">
                      {s.primary}
                    </span>
                    {s.secondary && (
                      <span className="block text-xs text-muted-foreground truncate">
                        {s.secondary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/40 border-t border-border bg-[var(--surface)]/40">
            UK addresses · powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
