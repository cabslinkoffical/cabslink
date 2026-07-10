import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { placesAutocomplete, type PlaceSuggestion } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectedPlace = { placeId: string; label: string };

type Props = {
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  mode?: "all" | "areas" | "addresses";
  /** Hide the trailing "Powered by Google" chip (used when the parent
   * already renders one aggregate attribution to satisfy Google TOS). */
  hideAttribution?: boolean;
  className?: string;
  iconClassName?: string;
  inputClassName?: string;
};

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * UK-only Places (New) autocomplete. Emits a SelectedPlace only when the
 * user picks a suggestion from the current list; editing invalidates the
 * previous selection immediately. Race-safe: monotonic seq + AbortController.
 */
export function PlaceAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  id,
  mode = "all",
  hideAttribution = false,
  className,
  iconClassName,
  inputClassName,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const call = useServerFn(placesAutocomplete);

  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const reqSeq = useRef(0);
  const latestSeq = useRef(0);
  const inflightAbort = useRef<AbortController | null>(null);
  const lastQuery = useRef<string>("");
  const suggestionsForQuery = useRef<string>("");

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const raw = text.trim();
    const norm = normalizeQuery(raw);

    if (raw.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      inflightAbort.current?.abort();
      lastQuery.current = "";
      suggestionsForQuery.current = "";
      return;
    }
    if (value && raw === value.label) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (norm === lastQuery.current && suggestions.length > 0) return;

    const seq = ++reqSeq.current;
    latestSeq.current = seq;
    setLoading(true);
    setSuggestions([]);
    suggestionsForQuery.current = "";

    const t = setTimeout(async () => {
      inflightAbort.current?.abort();
      const controller = new AbortController();
      inflightAbort.current = controller;
      try {
        const res = await call({ data: { input: raw, sessionToken, mode } });
        if (controller.signal.aborted) return;
        if (seq !== latestSeq.current) return;
        lastQuery.current = norm;
        suggestionsForQuery.current = norm;
        setSuggestions(res.suggestions);
        setOpen(res.suggestions.length > 0);
        setActiveIdx(-1);
      } catch {
        if (seq === latestSeq.current) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (seq === latestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, sessionToken, mode, call, value, suggestions.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = useCallback(
    (s: PlaceSuggestion) => {
      const currentQuery = normalizeQuery(text);
      if (suggestionsForQuery.current !== currentQuery) return;
      if (!suggestions.some((x) => x.placeId === s.placeId)) return;
      if (loading) return;
      const label = s.full || `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
      setText(label);
      setOpen(false);
      setSuggestions([]);
      lastQuery.current = normalizeQuery(label);
      suggestionsForQuery.current = "";
      onChange({ placeId: s.placeId, label });
    },
    [loading, onChange, suggestions, text],
  );

  const canSelect = !loading;

  return (
    <div className={cn("relative w-full", className)} ref={wrapRef}>
      <MapPin
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gold)] pointer-events-none",
          iconClassName,
        )}
      />
      <Input
        id={inputId}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
        placeholder={placeholder}
        className={cn("pl-11 pr-9 h-[52px] text-sm", inputClassName)}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          // Editing invalidates the previous Place ID immediately.
          if (value) onChange(null);
          setSuggestions([]);
          suggestionsForQuery.current = "";
          setActiveIdx(-1);
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && activeIdx >= 0 && canSelect) {
            e.preventDefault();
            pick(suggestions[activeIdx]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIdx(-1);
          }
        }}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-[60] mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              aria-disabled={!canSelect}
              onMouseDown={(e) => {
                e.preventDefault();
                if (canSelect) pick(s);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                i === activeIdx ? "bg-accent" : "",
                !canSelect ? "opacity-60 cursor-not-allowed" : "",
              )}
            >
              <div className="font-medium">{s.primary}</div>
              {s.secondary && <div className="text-xs text-muted-foreground">{s.secondary}</div>}
            </li>
          ))}
          {!hideAttribution && (
            <li className="border-t px-3 py-1.5 text-[10px] text-muted-foreground text-right">
              Powered by Google
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
