import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlaceAutocomplete } from "@/components/site/PlaceAutocomplete";

export const SERVICE_TYPE_OPTIONS = [
  { value: "direct_transfer", label: "Direct transfer" },
  { value: "airport_transfer", label: "Airport transfer" },
  { value: "hourly", label: "Hourly hire" },
  { value: "tour", label: "Tour" },
  { value: "corporate", label: "Corporate" },
];

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Chips({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onToggle(o.value)}
          className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
            selected.includes(o.value)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DayPicker({ selected, onToggle }: { selected: number[]; onToggle: (d: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {DAYS.map((d, i) => (
        <button
          key={d}
          type="button"
          onClick={() => onToggle(i)}
          className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
            selected.includes(i)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted"
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

/** Place + radius + scope block shared by every geo-aware rule form. */
export function GeoFields({
  id,
  form,
  setForm,
  radiusRequired = false,
}: {
  id: string;
  form: any;
  setForm: (f: any) => void;
  radiusRequired?: boolean;
}) {
  return (
    <>
      <div className="col-span-2">
        <Label htmlFor={id}>Anchor location {radiusRequired ? "*" : "(optional — leave empty for a global rule)"}</Label>
        <PlaceAutocomplete
          id={id}
          value={form.place_id ? { placeId: form.place_id, label: form.place_label ?? "" } : null}
          onChange={(p) => setForm({ ...form, place_id: p?.placeId ?? null, place_label: p?.label ?? null, lat: null, lng: null })}
          placeholder="Search a town, airport or postcode"
        />
      </div>
      <div>
        <Label htmlFor={`${id}-radius`}>Radius (miles)</Label>
        <Input
          id={`${id}-radius`}
          type="number"
          step="0.5"
          min="0"
          value={form.radius_miles ?? ""}
          onChange={(e) => setForm({ ...form, radius_miles: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-scope`}>Matches on</Label>
        <select
          id={`${id}-scope`}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={form.scope}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
        >
          <option value="either">Pickup or destination</option>
          <option value="pickup">Pickup only</option>
          <option value="destination">Destination only</option>
        </select>
      </div>
    </>
  );
}
