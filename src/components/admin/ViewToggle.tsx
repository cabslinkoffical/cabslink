import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

/**
 * Persisted grid/list preference per admin screen.
 * Reads localStorage after hydration so SSR markup stays stable.
 */
export function useViewMode(key: string, initial: ViewMode = "grid") {
  const storageKey = `cabslink.admin.view.${key}`;
  const [mode, setMode] = useState<ViewMode>(initial);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "grid" || saved === "list") setMode(saved);
    } catch {
      /* storage unavailable — keep default */
    }
  }, [storageKey]);

  const update = (next: ViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  };

  return [mode, update] as const;
}

export function ViewToggle({
  mode,
  onChange,
  className = "",
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  className?: string;
}) {
  const opts: { value: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
    { value: "grid", label: "Grid view", Icon: LayoutGrid },
    { value: "list", label: "List view", Icon: List },
  ];
  return (
    <div
      role="group"
      aria-label="Change layout"
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 ${className}`}
    >
      {opts.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => onChange(value)}
            className={`inline-flex items-center justify-center rounded-full p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
