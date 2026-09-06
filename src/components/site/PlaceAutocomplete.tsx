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
  /** Seed the visible text (e.g. a route page's advertised origin) without
   * claiming a selection — the user still picks a Google suggestion. */
  initialText?: string;
  /** Forwarded by Field wrappers for validation styling. */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;
const REQUEST_TIMEOUT_MS = 4_000;

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
  initialText,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const call = useServerFn(placesAutocomplete);

  const [text, setText] = useState(value?.label ?? initialText ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  // Short viewports (and the cookie notice pinned to the bottom) can hide a
  // downward list entirely, so flip it above the field when space is tight.
  const [dropUp, setDropUp] = useState(false);
  const [maxH, setMaxH] = useState(288);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const reqSeq = useRef(0);
  const latestSeq = useRef(0);
  const inflightAbort = useRef<AbortController | null>(null);
  const lastQuery = useRef<string>("");
  const suggestionsForQuery = useRef<string>("");

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Text typed into the server-rendered input before hydration lives only in
  // the DOM; React's first client render would otherwise wipe it. Adopt
  // whatever the field already holds on mount.
  useEffect(() => {
    const dom = inputRef.current?.value;
    if (dom) setText((t) => (t ? t : dom));
  }, []);

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
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const res = await Promise.race([
          call({ data: { input: raw, sessionToken, mode } }),
          new Promise<{ suggestions: PlaceSuggestion[] }>((resolve) => {
            timeoutId = setTimeout(() => resolve({ suggestions: [] }), REQUEST_TIMEOUT_MS);
          }),
        ]);
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
        if (timeoutId) clearTimeout(timeoutId);
        if (seq === latestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, sessionToken, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open || suggestions.length === 0) return;
    const measure = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      const pad = 16;
      const below = window.innerHeight - r.bottom - gap - pad;
      const above = r.top - gap - pad;
      const wanted = Math.min(288, suggestions.length * 58 + 34);
      const up = below < wanted && above > below;
      setDropUp(up);
      setMaxH(Math.max(140, Math.min(288, up ? above : below)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, suggestions.length]);

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
    <div className={cn("relative w-full text-[var(--navy)]", className)} ref={wrapRef}>
      <MapPin
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gold-ink)] pointer-events-none",
          iconClassName,
        )}
      />
      <Input
        ref={inputRef}
        id={inputId}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        // Some layouts render the visual label as plain text (not a <label>),
        // so mirror the placeholder as the accessible name.
        aria-label={placeholder}
        placeholder={placeholder}
        className={cn(
          "pl-11 pr-9 h-[52px] text-sm text-[var(--navy)] placeholder:text-[var(--navy)]/55 caret-[var(--gold)]",
          inputClassName,
        )}
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
          style={{ maxHeight: maxH }}
          className={cn(
            "absolute z-[90] w-full min-w-[275px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-[var(--shadow-elegant)]",
            dropUp ? "bottom-full mb-2" : "top-full mt-2",
          )}
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
                "cursor-pointer px-4 py-3 text-sm transition-colors",
                i === activeIdx ? "bg-[var(--gold)] text-[var(--navy)]" : "bg-[var(--popover)] text-[var(--navy)] hover:bg-[var(--surface-gold)]",
                !canSelect ? "opacity-60 cursor-not-allowed" : "",
              )}
            >
              <div className="font-bold leading-tight">{s.primary}</div>
              {s.secondary && (
                <div className={cn("mt-1 text-xs leading-tight", i === activeIdx ? "text-[var(--navy)]/80" : "text-[var(--navy)]/65")}>
                  {s.secondary}
                </div>
              )}
            </li>
          ))}
          {!hideAttribution && (
            <li className="border-t border-[var(--border)] px-4 py-2 text-right text-[10px] font-semibold text-[var(--navy)]/55">
              Powered by Google
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
