import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { placesAutocomplete, resolvePlaceText, type PlaceSuggestion } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectedPlace = { placeId: string; label: string };

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

/**
 * Split a Google suggestion into a consistent hierarchy:
 * line 1 = house number + street (or place name), line 2 = locality/region,
 * plus the postcode shown separately so every precise address reads the same.
 */
export function splitAddress(s: { primary: string; secondary: string; full?: string }): {
  line1: string;
  line2: string;
  postcode: string;
} {
  const source = `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
  const pc = source.match(UK_POSTCODE);
  const postcode = pc ? `${pc[1].toUpperCase()} ${pc[2].toUpperCase()}` : "";
  const strip = (v: string) =>
    (postcode ? v.replace(UK_POSTCODE, "") : v)
      .replace(/\s*,\s*/g, ", ")
      .replace(/(^[,\s]+)|([,\s]+$)/g, "")
      .replace(/,\s*,/g, ",")
      .trim();
  const line1 = strip(s.primary) || s.primary;
  const rest = strip(s.secondary)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toUpperCase() !== "UK" && p.toUpperCase() !== "UNITED KINGDOM");
  return { line1, line2: rest.join(", "), postcode };
}

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

const DEBOUNCE_MS = 140;
const MIN_CHARS = 2;
const REQUEST_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 450;

/**
 * crypto.randomUUID() is missing in older Safari and on any non-HTTPS origin,
 * where it threw during render and killed the whole field in those browsers.
 */
function newSessionToken() {
  try {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    if (c && typeof c.getRandomValues === "function") {
      const b = c.getRandomValues(new Uint8Array(16));
      return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through to Math.random */
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

// Browser-side result cache: typing, backspacing and re-typing the same query
// (very common) then renders instantly instead of paying another round-trip.
const CLIENT_CACHE_TTL_MS = 120_000;
const clientCache = new Map<string, { at: number; suggestions: PlaceSuggestion[] }>();

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
  const resolveText = useServerFn(resolvePlaceText);

  const [text, setText] = useState(value?.label ?? initialText ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  // Set when the lookup service itself failed (not merely "no matches"), so the
  // field can fall back to a plain text search instead of blocking the booking.
  const [lookupFailed, setLookupFailed] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [unverified, setUnverified] = useState(false);
  // Short viewports (and the cookie notice pinned to the bottom) can hide a
  // downward list entirely, so flip it above the field when space is tight.
  const [maxH, setMaxH] = useState(288);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  // Inside a modal dialog/drawer the body is made non-interactive and outside
  // pointer events close the dialog, so the list must live inside that layer.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document !== "undefined") setPortalTarget(document.body);
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionToken = useMemo(() => newSessionToken(), []);

  const reqSeq = useRef(0);
  const latestSeq = useRef(0);
  const inflightAbort = useRef<AbortController | null>(null);
  const lastQuery = useRef<string>("");
  const suggestionsForQuery = useRef<string>("");

  const requestSuggestions = useCallback(async (raw: string) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await call({ data: { input: raw, sessionToken, mode } });
        // A completed response (including an upstream outage response) should
        // immediately enable the typed-address fallback. Retry only when the
        // browser failed to complete the request at all.
        return result;
      } catch (error) {
        lastError = error;
        if (attempt === 1) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
    throw lastError ?? new Error("Address lookup failed");
  }, [call, mode, sessionToken]);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Text typed into the server-rendered input before hydration lives only in
  // the DOM, and keystrokes landing mid-hydration never reach React at all —
  // that left the field spinning forever with no lookup ever sent. Adopt the
  // DOM value on mount and keep re-checking briefly while hydration settles.
  useEffect(() => {
    const sync = () => {
      const dom = inputRef.current?.value;
      if (dom) setText((t) => (dom !== t && dom.length >= t.length ? dom : t));
    };
    sync();
    const timers = [0, 60, 160, 320, 600, 1200].map((ms) => setTimeout(sync, ms));
    return () => timers.forEach(clearTimeout);
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

    const hit = clientCache.get(`${mode}|${norm}`);
    if (hit && Date.now() - hit.at < CLIENT_CACHE_TTL_MS) {
      lastQuery.current = norm;
      suggestionsForQuery.current = norm;
      setSuggestions(hit.suggestions);
      setOpen(hit.suggestions.length > 0);
      setLoading(false);
      setActiveIdx(-1);
      return;
    }

    const seq = ++reqSeq.current;
    latestSeq.current = seq;
    setLoading(true);
    // Keep the previous list on screen while the new one loads — clearing it
    // made the dropdown flicker away on every keystroke and feel slow.
    suggestionsForQuery.current = "";

    const t = setTimeout(async () => {
      inflightAbort.current?.abort();
      const controller = new AbortController();
      inflightAbort.current = controller;
      // Slow links (and proxied preview URLs) can take several seconds; never
      // discard a request that is still on its way — just stop the spinner.
      let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
        if (seq === latestSeq.current) setLoading(false);
      }, REQUEST_TIMEOUT_MS);
      try {
        // A single transient connection failure should not make one browser
        // look broken while another succeeds. Retry once before using the
        // typed-address fallback.
        const res = await requestSuggestions(raw);
        if (controller.signal.aborted) return;
        if (seq !== latestSeq.current) return;
        lastQuery.current = norm;
        suggestionsForQuery.current = norm;
        if (!("ok" in res) || res.ok) {
          clientCache.set(`${mode}|${norm}`, { at: Date.now(), suggestions: res.suggestions });
          if (clientCache.size > 80) clientCache.clear();
        }
        setSuggestions(res.suggestions);
        setOpen(res.suggestions.length > 0);
        setLookupFailed(("ok" in res ? !res.ok : false) as boolean);
        if ("ok" in res && res.ok) setResolveFailed(false);
        setActiveIdx(-1);
      } catch {
        if (seq === latestSeq.current) {
          setSuggestions([]);
          setOpen(false);
          setLookupFailed(true);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (seq === latestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    // A pending debounce that is cancelled must also stop the spinner, or the
    // field stays "loading" forever without a request ever going out.
    return () => {
      clearTimeout(t);
      if (seq === latestSeq.current) setLoading(false);
    };
  }, [text, sessionToken, mode, requestSuggestions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onDoc(e: PointerEvent) {
      const target = e.target as Node;
      const listbox = document.getElementById(listboxId);
      if (!wrapRef.current?.contains(target) && !listbox?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [listboxId]);

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
      const width = Math.min(Math.max(275, r.width), window.innerWidth - pad * 2);
      const left = Math.min(Math.max(pad, r.left), window.innerWidth - pad - width);
      const height = Math.max(140, Math.min(288, up ? above : below));
      const visibleHeight = Math.min(wanted, height);
      setMaxH(height);
      setDropdownStyle({
        left,
        top: up ? Math.max(pad, r.top - gap - visibleHeight) : r.bottom + gap,
        width,
        maxHeight: height,
      });
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

  // Resilience: when the suggestion list is unavailable, resolve whatever the
  // customer typed with a plain text search so the field can still be
  // satisfied. A quote needs a real location, so we look one up rather than
  // accepting unusable free text silently.
  const resolveTyped = useCallback(async (force = false) => {
    const raw = text.trim();
    if (value || loading || raw.length < 3) return;
    if (!force && !lookupFailed && suggestions.length > 0) return;
    try {
      const res = await resolveText({ data: { input: raw } });
      if (!res.place) {
        setResolveFailed(true);
        return;
      }
      const label = force ? raw : res.place.full || res.place.primary;
      setText(label);
      setUnverified(true);
      setResolveFailed(false);
      setOpen(false);
      setSuggestions([]);
      lastQuery.current = normalizeQuery(label);
      onChange({ placeId: res.place.placeId, label });
    } catch {
      setResolveFailed(true);
    }
  }, [lookupFailed, loading, onChange, resolveText, suggestions.length, text, value]);

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
          "relative z-10 rounded-none pl-11 pr-10 h-[52px] text-sm font-semibold text-[var(--navy)] placeholder:font-normal placeholder:text-[var(--navy)]/55 caret-[var(--navy)] [caret-color:var(--navy)] focus-visible:[caret-color:var(--navy)] selection:rounded-none selection:bg-[var(--gold)] selection:text-[var(--navy)]",
          inputClassName,
        )}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          // Editing invalidates the previous Place ID immediately.
          if (value) onChange(null);
          // Previous suggestions stay visible until the next list arrives;
          // pick() still refuses anything that doesn't match the typed query.
          setUnverified(false);
          setResolveFailed(false);
          suggestionsForQuery.current = "";
          setActiveIdx(-1);
        }}
        onKeyUp={(e) => {
          // Guarantees state matches the field even if a change event was
          // swallowed while the page was still becoming interactive.
          const v = e.currentTarget.value;
          if (v !== text) setText(v);
        }}
        onBlur={() => { void resolveTyped(); }}
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
        <Loader2
          strokeWidth={3}
          className="pointer-events-none absolute right-2.5 top-1/2 z-20 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--navy)]"
        />
      )}
      {unverified && !open && (
        <p className="mt-1 text-[11px] font-medium leading-snug text-[var(--gold-ink)]">
          We couldn’t fully verify this address — we matched the closest place and will confirm it with you.
        </p>
      )}
      {lookupFailed && resolveFailed && !open && (
        <p role="alert" className="mt-1 text-[11px] font-medium leading-snug text-destructive">
          Address lookup temporarily unavailable — you can still type your address. We’ll ask you to confirm it before continuing.
        </p>
      )}
      {open && suggestions.length > 0 && portalTarget && createPortal(
        <ul
          id={listboxId}
          role="listbox"
          style={{ ...dropdownStyle, maxHeight: maxH, pointerEvents: "auto" }}
          className={cn(
            "fixed z-[9999] min-w-[275px] overflow-auto rounded-lg border border-[var(--gold)]/35 bg-[var(--popover)] text-[var(--popover-foreground)] shadow-[0_24px_70px_-22px_color-mix(in_oklab,var(--navy)_55%,transparent)]",
          )}
        >
          <li
            role="presentation"
            className="sticky top-0 z-10 border-b border-[var(--gold)]/30 bg-[var(--gold)] px-4 py-2.5 text-[11px] font-extrabold leading-snug text-[var(--navy)]"
          >
            Select one of these addresses.
          </li>
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              aria-disabled={!canSelect}
              onPointerDown={(e) => {
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
              {(() => {
                const parts = splitAddress(s);
                return (
                  <>
                    <div className="font-bold leading-tight">{parts.line1}</div>
                    {(parts.line2 || parts.postcode) && (
                      <div
                        className={cn(
                          "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-tight",
                          i === activeIdx ? "text-[var(--navy)]/80" : "text-[var(--navy)]/65",
                        )}
                      >
                        {parts.line2 && <span>{parts.line2}</span>}
                        {parts.postcode && (
                          <span className="rounded border border-[var(--navy)]/20 bg-[var(--navy)]/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--navy)]">
                            {parts.postcode}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </li>
          ))}
          {!hideAttribution && (
            <li className="border-t border-[var(--border)] px-4 py-2 text-right text-[10px] font-semibold text-[var(--navy)]/55">
              Powered by Google
            </li>
          )}
        </ul>,
        portalTarget,
      )}
    </div>
  );
}
