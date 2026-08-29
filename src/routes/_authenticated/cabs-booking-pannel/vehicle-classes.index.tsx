import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";
import { fleetImageFor } from "@/assets/fleet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listVehicleClassesAdmin, deleteVehicleClass, setVehicleClassActive } from "@/lib/vehicle-classes.functions";
import { listVehiclesAdmin } from "@/lib/admin.functions";
import { adminListPricingProfiles } from "@/lib/pricing.functions";

const opts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/vehicle-classes/")({
  head: () => ({
    meta: [
      { title: "Vehicle Classes — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: vehicle classes, pricing and availability in one place." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  component: VehicleClassesPage,
});

function VehicleClassesPage() {
  const { data } = useSuspenseQuery(opts);
  const [view, setView] = useViewMode("vehicle-classes", "list");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteVehicleClass);
  const setActiveFn = useServerFn(setVehicleClassActive);
  const vehiclesQ = useQuery({ queryKey: ["admin", "vehicles"], queryFn: () => listVehiclesAdmin() });
  const profilesQ = useQuery({ queryKey: ["pricing-profiles"], queryFn: () => adminListPricingProfiles() });
  const vehicles: any[] = vehiclesQ.data ?? [];
  const profiles: any[] = (profilesQ.data as any)?.profiles ?? [];

  const activeMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => setActiveFn({ data: v }),
    onSuccess: async (_r, v) => {
      await qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] });
      toast.success(v.active ? "Class activated" : "Class deactivated");
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] });
      toast.success("Class deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const classes: any[] = data.classes;
  const modelCount = (classId: string) => (data.models as any[]).filter((m) => m.vehicle_class_id === classId).length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Vehicle Classes"
        description="One place per class: details, photo, models, pricing, hourly hire and availability."
      >
        <ViewToggle mode={view} onChange={setView} />
        <Button asChild>
          <Link to="/cabs-booking-pannel/vehicle-classes/$id" params={{ id: "new" }}>
            <Plus className="size-4 mr-1.5" />New class
          </Link>
        </Button>
      </PageHeader>

      {classes.length === 0 ? (
        <EmptyState title="No vehicle classes yet" hint="Create your first vehicle class to get started." />
      ) : (
        <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
          {classes.map((c) => {
            const linked = vehicles.find((v) => v.id === c.pricing_vehicle_id);
            const profile = linked ? profiles.find((p) => p.vehicle_id === linked.id) : null;
            const img = fleetImageFor(c.slug, c.hero_image || linked?.image_url);
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate({ to: "/cabs-booking-pannel/vehicle-classes/$id", params: { id: c.id } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/cabs-booking-pannel/vehicle-classes/$id", params: { id: c.id } });
                  }
                }}
                className={`admin-card p-4 cursor-pointer hover:border-primary/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  view === "grid" ? "flex flex-col gap-3" : "flex items-center gap-4"
                }`}
              >
                <div className={view === "grid" ? "w-full h-32 rounded-lg bg-[var(--surface)] flex items-center justify-center overflow-hidden shrink-0" : "w-24 h-16 rounded-lg bg-[var(--surface)] flex items-center justify-center overflow-hidden shrink-0"}>
                  {img ? <img src={img} alt={`${c.name} vehicle class`} className="w-full h-full object-contain p-1" />
                       : <span className="text-[10px] text-muted-foreground">No photo</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold truncate">{c.name}</h3>
                    <StatusBadge status={c.active ? "active" : "inactive"} />
                    {c.quote_on_request && <StatusBadge status="quote on request" />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{c.passengers} passengers · {c.large_luggage + c.cabin_bags} bags</span>
                    <span>{modelCount(c.id)} models</span>
                    <span>
                      {profile
                        ? `From £${Number(profile.base_price).toFixed(2)} · ${(profile.tiers ?? []).length} mileage tiers`
                        : c.quote_on_request
                          ? "Priced on request"
                          : "Add pricing"}
                    </span>
                  </div>
                </div>
                <div className={view === "grid" ? "flex flex-wrap items-center gap-1" : "flex items-center gap-1 shrink-0"} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 px-2">
                    <Switch
                      id={`active-${c.id}`}
                      checked={c.active}
                      disabled={activeMut.isPending}
                      onCheckedChange={(checked) => activeMut.mutate({ id: c.id, active: checked })}
                      aria-label={`Toggle ${c.name} active state`}
                    />
                    <label htmlFor={`active-${c.id}`} className="text-xs font-medium cursor-pointer select-none">
                      {c.active ? "Active" : "Inactive"}
                    </label>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/cabs-booking-pannel/vehicle-classes/$id" params={{ id: c.id }}>
                      <Pencil className="size-4 mr-1.5" />Edit
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button aria-label={`Delete ${c.name}`} size="icon" variant="ghost" className="text-destructive"><Trash2 className="size-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription>All models under this class will also be removed. Existing bookings keep their vehicle name.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => delMut.mutate(c.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
