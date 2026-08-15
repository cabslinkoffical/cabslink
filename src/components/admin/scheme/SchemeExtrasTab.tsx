import { Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import { listExtrasForClass, setClassExtra } from "@/lib/extras.functions";
import { SchemeSection } from "./GeoEditorLayout";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const BASIS_LABEL: Record<string, string> = {
  per_unit: "per unit",
  per_booking: "per booking",
  per_hour: "per hour",
};

const extrasOpts = (classId: string) =>
  queryOptions({
    queryKey: ["admin", "scheme-extras", classId],
    queryFn: () => listExtrasForClass({ data: { classId } }),
  });

export function SchemeExtrasTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(extrasOpts(classId));
  const mutateFn = useServerFn(setClassExtra);

  const save = useMutation({
    mutationFn: (v: { extraId: string; linked: boolean; override_price_pence?: number | null }) =>
      mutateFn({ data: { classId, ...v } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "scheme-extras", classId] }),
        qc.invalidateQueries({ queryKey: ["admin", "extras"] }),
        qc.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
      toast.success("Extras updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  return (
    <SchemeSection
      title="Extras for this class"
      hint="Definitions live once in Extras. Here you choose which apply to this class and, if needed, a class-specific price."
      action={
        <Link
          to="/cabs-booking-pannel/extras"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Manage extras <ExternalLink className="size-3.5" />
        </Link>
      }
    >
      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />Loading extras…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No extras defined yet. Create them in the Extras section first.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {data.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
              <Switch
                checked={e.linked}
                disabled={e.applies_to_all_classes || save.isPending}
                onCheckedChange={(v) => save.mutate({ extraId: e.id, linked: v, override_price_pence: null })}
                aria-label={`Enable ${e.name} for this class`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {e.name}
                  {!e.active && <span className="ml-2 text-[11px] font-normal text-muted-foreground">(inactive)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  £{(e.default_price_pence / 100).toFixed(2)} {BASIS_LABEL[e.price_basis]}
                  {e.applies_to_all_classes && " · applies to all classes"}
                </p>
              </div>
              <div className="w-40">
                <Input
                  type="number" step="0.01" min="0"
                  placeholder="Class price (£)"
                  defaultValue={e.override_price_pence != null ? (e.override_price_pence / 100).toFixed(2) : ""}
                  disabled={save.isPending}
                  onBlur={(ev) => {
                    const raw = ev.target.value.trim();
                    const next = raw === "" ? null : Math.round(Number(raw) * 100);
                    if (next === (e.override_price_pence ?? null)) return;
                    if (next != null && (!Number.isFinite(next) || next < 0)) return;
                    save.mutate({ extraId: e.id, linked: true, override_price_pence: next });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Leave the class price blank to use the extra's default price. Extras marked “applies to all classes” are always
        available — change that in the Extras section.
      </p>
    </SchemeSection>
  );
}
