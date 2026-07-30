import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Common dial codes. GB first — this is a UK product. */
export const COUNTRY_CODES: { code: string; dial: string; label: string; flag: string }[] = [
  { code: "GB", dial: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "IE", dial: "+353", label: "Ireland", flag: "🇮🇪" },
  { code: "US", dial: "+1", label: "United States", flag: "🇺🇸" },
  { code: "CA", dial: "+1", label: "Canada", flag: "🇨🇦" },
  { code: "FR", dial: "+33", label: "France", flag: "🇫🇷" },
  { code: "DE", dial: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "ES", dial: "+34", label: "Spain", flag: "🇪🇸" },
  { code: "IT", dial: "+39", label: "Italy", flag: "🇮🇹" },
  { code: "NL", dial: "+31", label: "Netherlands", flag: "🇳🇱" },
  { code: "BE", dial: "+32", label: "Belgium", flag: "🇧🇪" },
  { code: "CH", dial: "+41", label: "Switzerland", flag: "🇨🇭" },
  { code: "AT", dial: "+43", label: "Austria", flag: "🇦🇹" },
  { code: "PT", dial: "+351", label: "Portugal", flag: "🇵🇹" },
  { code: "SE", dial: "+46", label: "Sweden", flag: "🇸🇪" },
  { code: "NO", dial: "+47", label: "Norway", flag: "🇳🇴" },
  { code: "DK", dial: "+45", label: "Denmark", flag: "🇩🇰" },
  { code: "FI", dial: "+358", label: "Finland", flag: "🇫🇮" },
  { code: "PL", dial: "+48", label: "Poland", flag: "🇵🇱" },
  { code: "AE", dial: "+971", label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", dial: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "IN", dial: "+91", label: "India", flag: "🇮🇳" },
  { code: "PK", dial: "+92", label: "Pakistan", flag: "🇵🇰" },
  { code: "AU", dial: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "NZ", dial: "+64", label: "New Zealand", flag: "🇳🇿" },
  { code: "ZA", dial: "+27", label: "South Africa", flag: "🇿🇦" },
  { code: "SG", dial: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "HK", dial: "+852", label: "Hong Kong", flag: "🇭🇰" },
  { code: "JP", dial: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "CN", dial: "+86", label: "China", flag: "🇨🇳" },
  { code: "BR", dial: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "MX", dial: "+52", label: "Mexico", flag: "🇲🇽" },
  { code: "TR", dial: "+90", label: "Turkey", flag: "🇹🇷" },
  { code: "EG", dial: "+20", label: "Egypt", flag: "🇪🇬" },
  { code: "GR", dial: "+30", label: "Greece", flag: "🇬🇷" },
];

const DIALS = Array.from(new Set(COUNTRY_CODES.map((c) => c.dial))).sort(
  (a, b) => b.length - a.length,
);

/** Split a stored string like "+44 7700 900123" into dial + local parts. */
function splitStored(value: string | undefined | null): { dial: string; local: string } {
  const v = (value ?? "").trim();
  if (!v) return { dial: "+44", local: "" };
  const hit = DIALS.find((d) => v.startsWith(d));
  if (hit) return { dial: hit, local: v.slice(hit.length).trim() };
  // Legacy free-text number — leave as-is under default UK code
  return { dial: "+44", local: v };
}

export type PhoneInputProps = {
  value: string;
  onChange: (combined: string) => void;
  /** Optional hidden form field name so <form> FormData submissions still work. */
  name?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function PhoneInput({
  value,
  onChange,
  name,
  required,
  id,
  placeholder = "7700 900123",
  className,
  disabled,
}: PhoneInputProps) {
  const parsed = useMemo(() => splitStored(value), [value]);
  const [dial, setDial] = useState(parsed.dial);
  const [local, setLocal] = useState(parsed.local);

  // Keep internal state in sync when parent value changes externally.
  useEffect(() => {
    setDial(parsed.dial);
    setLocal(parsed.local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(nextDial: string, nextLocal: string) {
    const trimmed = nextLocal.trim();
    onChange(trimmed ? `${nextDial} ${trimmed}` : "");
  }

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Select
        value={COUNTRY_CODES.find((c) => c.dial === dial)?.code ?? "GB"}
        onValueChange={(code) => {
          const d = COUNTRY_CODES.find((c) => c.code === code)?.dial ?? "+44";
          setDial(d);
          emit(d, local);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[110px] shrink-0" aria-label="Country dial code">
          <SelectValue placeholder={dial}>{dial}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="mr-2">{c.flag}</span>
              {c.dial}
              <span className="ml-2 text-muted-foreground text-xs">{c.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={local}
        disabled={disabled}
        required={required}
        maxLength={20}
        onChange={(e) => {
          // Strip anything that's not digits/space/dash/parens
          const cleaned = e.target.value.replace(/[^\d\s\-()]/g, "");
          setLocal(cleaned);
          emit(dial, cleaned);
        }}
        className="flex-1"
      />
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </div>
  );
}
