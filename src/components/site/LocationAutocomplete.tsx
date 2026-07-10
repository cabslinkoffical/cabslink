import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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

const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * UK-only Places (New) autocomplete. Emits only when a suggestion is picked
 * from the currently displayed list. Race-safe: monotonic request ids +
 * AbortController ensure stale suggestions never render or get selected.
 */
export function LocationAutocomplete({ label, placeholder, value, onChange, mode = "all" }: Props) {
  const inputId = useId();
  const listboxId = useId();
  const call = useServerFn(placesAutocomplete);
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  // Race protection
  const reqSeq = useRef(0);
  const latestSeq = useRef(0);
  const inflightAbort = useRef<AbortController | null>(null);
  const lastQuery = useRef<string>("");
  // The query these suggestions belong to (used to validate pick()).
  const suggestionsForQuery = useRef<string>("");

  // Keep text synced when parent resets/swaps value
  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced fetch
  useEffect(() => {
    const raw = text.trim();
    const norm = normalizeQuery(raw);

    // Editing: immediately clear stale suggestions.
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
      // Already picked, don't re-fetch.
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (norm === lastQuery.current && suggestions.length > 0) {
      // Duplicate query, nothing to do.
      return;
    }

    const seq = ++reqSeq.current;
    latestSeq.current = seq;
    setLoading(true);
    // Clear stale suggestions immediately on input change.
    setSuggestions([]);
    suggestionsForQuery.current = "";

    const t = setTimeout(async () => {
      // Cancel any prior in-flight request.
      inflightAbort.current?.abort();
      const controller = new AbortController();
      inflightAbort.current = controller;

      try {
        // Note: useServerFn doesn't accept a signal; we still guard by seq.
        const res = await call({ data: { input: raw, sessionToken, mode } });
        if (controller.signal.aborted) return;
        if (seq !== latestSeq.current) return; // stale
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

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = useCallback(
    (s: PlaceSuggestion) => {
      // Only accept a pick that belongs to the CURRENT displayed list
      // (i.e. matches the latest completed query) and is still present.
      const currentQuery = normalizeQuery(text);
      if (suggestionsForQuery.current !== currentQuery) return;
      if (!suggestions.some((x) => x.placeId === s.placeId)) return;
      if (loading) return; // a newer request is pending

      const label = s.full || `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
      setText(label);
      setOpen(false);
      setSuggestions([]);
      lastQuery.current = normalizeQuery(label);
      suggestionsForQuery.current = "";
      onChange({ placeId: s.placeId, label });
    },
    [loading, onChange, suggestions, text]
  );

  const canSelect = !loading;

  return (
    <div className="w-full" ref={wrapRef}>
      <Label htmlFor={inputId} className="text-sm font-medium">{label}</Label>
      <div className="relative mt-1.5">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={inputId}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
          placeholder={placeholder}
          className="pl-9 pr-9"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            // Editing invalidates the previous Place ID immediately.
            if (value) onChange(null);
            // Clear suggestions immediately so stale entries can't be picked.
            setSuggestions([]);
            suggestionsForQuery.current = "";
            setActiveIdx(-1);
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !suggestions.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter" && activeIdx >= 0 && canSelect) { e.preventDefault(); pick(suggestions[activeIdx]); }
            else if (e.key === "Escape") { setOpen(false); setActiveIdx(-1); }
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
                className={`cursor-pointer px-3 py-2 text-sm ${i === activeIdx ? "bg-accent" : ""} ${!canSelect ? "opacity-60 cursor-not-allowed" : ""}`}
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
