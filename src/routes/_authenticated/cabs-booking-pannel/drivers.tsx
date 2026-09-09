import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDriverApplications, listDispatchDrivers, updateMessage, deleteMessage } from "@/lib/admin.functions";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Mail, Phone, Check, Car, CalendarClock, IdCard } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { ViewToggle, useViewMode } from "@/components/admin/ViewToggle";

type Application = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

type DispatchDriver = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  available: boolean;
  license_number: string | null;
  photo_url: string | null;
  created_at: string;
  vehicleName: string | null;
  activeJobs: number;
  completedJobs: number;
  nextJobDate: string | null;
};

const applicationOpts = queryOptions({
  queryKey: ["admin", "driver-applications"],
  queryFn: () => listDriverApplications() as Promise<Application[]>,
});

const driverOpts = queryOptions({
  queryKey: ["admin", "dispatch-drivers"],
  queryFn: () => listDispatchDrivers() as Promise<DispatchDriver[]>,
});

const tabSchema = z.object({
  tab: z.enum(["assigned", "requested"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/drivers")({
  validateSearch: tabSchema,
  head: () => ({
    meta: [
      { title: "Drivers — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: drivers working with dispatch and drivers who applied through the website." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(driverOpts),
      context.queryClient.ensureQueryData(applicationOpts),
    ]),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const active = tab ?? "assigned";

  const { data: drivers } = useSuspenseQuery(driverOpts);
  const { data: applications } = useSuspenseQuery(applicationOpts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Drivers added in the dispatch panel appear here with their key details. Website applications stay in their own list until you add them to dispatch."
      />

      <Tabs
        value={active}
        onValueChange={(v) => navigate({ search: { tab: v as "assigned" | "requested" } })}
      >
        <TabsList>
          <TabsTrigger value="assigned">Dispatch drivers ({drivers.length})</TabsTrigger>
          <TabsTrigger value="requested">Applications ({applications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-6">
          <DriverList drivers={drivers} />
        </TabsContent>

        <TabsContent value="requested" className="mt-6">
          <ApplicationList applications={applications} drivers={drivers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function norm(v: string | null | undefined) {
  return (v ?? "").trim().toLowerCase();
}
function digits(v: string | null | undefined) {
  return (v ?? "").replace(/\D/g, "").slice(-9);
}

function DriverList({ drivers }: { drivers: DispatchDriver[] }) {
  const [view, setView] = useViewMode("dispatch-drivers", "grid");
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const rows = term
    ? drivers.filter((d) =>
        [d.full_name, d.email, d.phone, d.vehicleName].some((v) => (v ?? "").toLowerCase().includes(term)))
    : drivers;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search drivers by name, email, phone or vehicle"
          className="max-w-sm"
        />
        <ViewToggle mode={view} onChange={setView} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No drivers yet" description="Drivers you add in the dispatch panel will show up here automatically." />
      ) : (
        <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "grid gap-3"}>
          {rows.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{d.full_name}</div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="size-3" /> {d.email ?? "—"}
                  </div>
                  <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Phone className="size-3" /> {d.phone ?? "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={d.status} />
                  <span className="text-[11px] text-muted-foreground">
                    {d.available ? "Available" : "Not available"}
                  </span>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Car className="size-3" /> {d.vehicleName ?? "No vehicle set"}
                </div>
                <div className="flex items-center gap-1">
                  <IdCard className="size-3" /> {d.license_number ?? "No licence on file"}
                </div>
                <div className="flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  {d.nextJobDate ? new Date(d.nextJobDate).toLocaleDateString("en-GB") : "No upcoming job"}
                </div>
                <div>
                  {d.activeJobs} live · {d.completedJobs} done
                </div>
              </dl>

              <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Added {new Date(d.created_at).toLocaleDateString("en-GB")} · managed in the dispatch panel
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationList({ applications, drivers }: { applications: Application[]; drivers: DispatchDriver[] }) {
  const qc = useQueryClient();
  const update = useServerFn(updateMessage);
  const del = useServerFn(deleteMessage);
  const [view, setView] = useViewMode("drivers", "grid");
  const [q, setQ] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "driver-applications"] });

  const mark = useMutation({
    mutationFn: (id: string) => update({ data: { id, status: "resolved" } }),
    onSuccess: () => { invalidate(); toast.success("Marked as reviewed"); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const rows = term
    ? applications.filter((a) =>
        [a.name, a.email, a.phone].some((v) => (v ?? "").toLowerCase().includes(term)))
    : applications;

  const matchedDriver = (a: Application) =>
    drivers.find((d) =>
      (norm(a.email) && norm(a.email) === norm(d.email)) ||
      (digits(a.phone).length >= 7 && digits(a.phone) === digits(d.phone)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or phone"
          className="max-w-sm"
        />
        <ViewToggle mode={view} onChange={setView} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No driver applications yet" />
      ) : (
        <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "grid gap-3"}>
          {rows.map((a) => {
            const driver = matchedDriver(a);
            return (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{a.name ?? "—"}</div>
                    <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3" /> {a.email ?? "—"}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Phone className="size-3" /> {a.phone ?? "—"}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                {a.message ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>
                ) : null}

                <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  {driver
                    ? <>Already driving with us as <span className="font-medium">{driver.full_name}</span> ({driver.status})</>
                    : "Not yet added in the dispatch panel"}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("en-GB")}
                  </span>
                  <div className="flex gap-1">
                    {a.status !== "resolved" ? (
                      <Button size="sm" variant="ghost" disabled={mark.isPending} onClick={() => mark.mutate(a.id)}>
                        <Check className="mr-1 size-3.5" /> Reviewed
                      </Button>
                    ) : null}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="mr-1 size-3.5" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete this application?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(a.id)} className="bg-destructive">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
