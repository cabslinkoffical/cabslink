import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { placesAutocomplete, type PlaceSuggestion } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

export type SelectedPlace = { placeId: string; label: string };

type Props = {
  label: string;
  placeholder?: string;
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  mode?: "all" | "areas" | "addresses";
};

/**
 * UK-biased Places (New) autocomplete input. Emits only when a suggestion is picked;
 * clears the selected placeId when the user types over it.
 */
export function LocationAutocomplete({ label, placeholder, value, onChange, mode = "all" }: Props) {
  const inputId = useId();
  const call = useServerFn(placesAutocomplete);
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const reqSeq = useRef(0);

  // keep text synced when parent resets/swaps value
  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // debounced fetch
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2 || (value && q === value.label)) {
      setSuggestions([]);
      return;
    }
    const seq = ++reqSeq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await call({ data: { input: q, sessionToken, mode } });
        if (seq !== reqSeq.current) return;
        setSuggestions(res.suggestions);
        setOpen(true);
        setActiveIdx(-1);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [text, sessionToken, mode, call, value]);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(s: PlaceSuggestion) {
    const label = s.full || `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
    setText(label);
    setOpen(false);
    setSuggestions([]);
    onChange({ placeId: s.placeId, label });
  }

  return (
    <div className="w-full" ref={wrapRef}>
      <Label htmlFor={inputId} className="text-sm font-medium">{label}</Label>
      <div className="relative mt-1.5">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={inputId}
          autoComplete="off"
          placeholder={placeholder}
          className="pl-9 pr-9"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (value) onChange(null); // clear selection when editing
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !suggestions.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.placeId}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === activeIdx ? "bg-accent" : ""}`}
              >
                <div className="font-medium">{s.primary}</div>
                {s.secondary && <div className="text-xs text-muted-foreground">{s.secondary}</div>}
              </li>
            ))}
            <li className="border-t px-3 py-1.5 text-[10px] text-muted-foreground text-right">
              Powered by Google
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
