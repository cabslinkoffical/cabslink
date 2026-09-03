import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Shared validation presentation for every public form: one red notice at the
 * top of the form plus per-field red highlighting and a message. Mirrors the
 * booking widget so the whole site behaves the same way.
 */
export function FormNotice({
  visible,
  children = "Please fill the required data to continue",
  className = "",
}: {
  visible: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 rounded-lg bg-destructive px-3 py-2.5 text-xs font-bold text-white shadow-sm ${className}`}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Wraps a label + control. When `error` is set the label, the control border
 * and the message all turn red, and the control is flagged for assistive tech.
 */
export function FormField({
  label,
  htmlFor,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const invalid = !!error;
  return (
    <div className={className} data-invalid={invalid || undefined}>
      <Label htmlFor={htmlFor} className={invalid ? "text-destructive" : undefined}>
        {label}
      </Label>
      <div
        className={
          invalid
            ? "mt-1.5 [&_input]:border-destructive [&_input]:ring-1 [&_input]:ring-destructive/50 [&_textarea]:border-destructive [&_textarea]:ring-1 [&_textarea]:ring-destructive/50 [&_button[role=combobox]]:border-destructive [&_button[role=combobox]]:ring-1 [&_button[role=combobox]]:ring-destructive/50"
            : "mt-1.5"
        }
      >
        {children}
      </div>
      {invalid && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Focus + scroll the first field flagged invalid inside a form. */
export function focusFirstInvalid(form: HTMLElement | null) {
  if (!form) return;
  requestAnimationFrame(() => {
    const el = form.querySelector<HTMLElement>(
      '[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select',
    );
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/** Turn a Zod safeParse failure into a flat field → message map. */
export function zodFieldErrors(
  error: { issues: Array<{ path: Array<string | number>; message: string }> },
  messages: Record<string, string> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!key || out[key]) continue;
    out[key] = messages[key] ?? issue.message;
  }
  return out;
}
