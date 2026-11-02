import { createFileRoute } from "@tanstack/react-router";
import { SITE } from "@/lib/site";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "settings"], queryFn: () => getSettings() });
export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: settings." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const save = useServerFn(updateSettings);
  const [form, setForm] = useState<any>(data ?? {});
  useEffect(() => { setForm(data ?? {}); }, [data]);

  const mut = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "settings"] }); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Business-wide configuration.">
        <Button onClick={() => mut.mutate({
          // Only settings the website and booking engine actually read are saved from here.
          company_name: form.company_name,
          currency_symbol: form.currency_symbol || "£",
          tax_enabled: !!form.tax_enabled,
          tax_percentage: Number(form.tax_percentage || 0),
          tax_label: form.tax_label || "VAT",
          maintenance_mode: !!form.maintenance_mode,
          bing_site_verification: (form.bing_site_verification ?? "").trim() || null,
          poi_corridor_enabled: !!form.poi_corridor_enabled,
          poi_corridor_radius_miles: Number(form.poi_corridor_radius_miles ?? 15),
          poi_corridor_max_pois: Number(form.poi_corridor_max_pois ?? 8),
          child_seat_fee_pence: Number(form.child_seat_fee_pence ?? 0),
          meet_greet_fee_pence: Number(form.meet_greet_fee_pence ?? 0),
          return_journey_fee_pence: Number(form.return_journey_fee_pence ?? 0),
          policy_non_refundable_percent: Number(form.policy_non_refundable_percent ?? 5),
          policy_non_refundable_min_pence: Number(form.policy_non_refundable_min_pence ?? 200),
          policy_flexible_percent: Number(form.policy_flexible_percent ?? 12),
          policy_flexible_min_pence: Number(form.policy_flexible_min_pence ?? 400),
        })} disabled={mut.isPending}>Save changes</Button>
      </PageHeader>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="extras">Pricing extras</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="pois">POI matching</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <Row label="Company name"><Input value={form.company_name ?? ""} onChange={e => set("company_name", e.target.value)} /></Row>
            <Row label="Shown on the website">
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Phone:</span> {SITE.phoneUK}</p>
                <p><span className="text-muted-foreground">Email:</span> {SITE.email}</p>
                <p><span className="text-muted-foreground">Address:</span> {SITE.address}</p>
                <p className="text-xs text-muted-foreground pt-1">These are part of the website's pages, footer and Google listing data, so they're changed with the site rather than here.</p>
              </div>
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4 mt-4">
          <Card>
            <Row label="Currency"><p className="text-sm">Pounds sterling (GBP) — all fares, payments and reports use pounds.</p></Row>
            <Row label="Currency symbol">
              <Input placeholder="£" maxLength={6} value={form.currency_symbol ?? ""} onChange={e => set("currency_symbol", e.target.value)} />
            </Row>
            <Row label="Time zone"><p className="text-sm">UK time (Europe/London) — dates, "today" and reports follow GMT/BST.</p></Row>
          </Card>
        </TabsContent>

        <TabsContent value="extras" className="space-y-4 mt-4">
          <Card>
            <p className="text-sm text-muted-foreground -mt-1">
              Every add-on (child seats, meet &amp; greet, waiting time and the rest), its price and limit
              for each vehicle class, VAT and cancellation cover are managed in one place under
              <span className="font-semibold text-foreground"> Fleet &amp; Pricing → Extras</span>.
            </p>
            <a href="/cabs-booking-pannel/extras" className="text-sm font-semibold text-primary underline">
              Open Extras →
            </a>
          </Card>

        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card>
            <Row label="Emails"><p className="text-xs text-muted-foreground">Booking, payment and staff emails are sent through the connected email service; its key is stored securely on the server, so there is nothing to type here.</p></Row>
            {/* Google Maps API key is configured via an environment variable, not in the admin UI. */}
            <Row label="Google Maps API key"><p className="text-xs text-muted-foreground">Configured via a server environment variable — not editable here.</p></Row>
          </Card>
        </TabsContent>

        <TabsContent value="pois" className="space-y-4 mt-4">
          <Card>
            <p className="text-sm text-muted-foreground -mt-1">
              When no curated tour template matches a customer&apos;s pickup and dropoff, Cabslink can still
              suggest famous points that lie near the direct route. Turn this on and pick a corridor
              radius — any active point of interest whose coordinates fall within that many miles of the
              straight line between pickup and dropoff will be offered as an optional stop.
            </p>
            <Row label="Enable corridor matching">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!form.poi_corridor_enabled}
                  onCheckedChange={(v) => set("poi_corridor_enabled", v)}
                />
                <span className="text-sm text-muted-foreground">
                  When ON, POIs within the corridor are offered even without a curated template.
                </span>
              </div>
            </Row>
            <Row label="Corridor radius (miles)">
              <Input
                type="number"
                min={0}
                max={200}
                step="0.5"
                value={form.poi_corridor_radius_miles ?? 15}
                onChange={(e) => set("poi_corridor_radius_miles", e.target.value)}
              />
            </Row>
            <Row label="Max suggestions per route">
              <Input
                type="number"
                min={0}
                max={50}
                step="1"
                value={form.poi_corridor_max_pois ?? 8}
                onChange={(e) => set("poi_corridor_max_pois", e.target.value)}
              />
            </Row>
            <p className="text-xs text-muted-foreground">
              Tip: POIs must have latitude/longitude set on their admin record for corridor matching to
              pick them up. Curated tour templates always take precedence over corridor suggestions.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card>
            <Row label="Maintenance mode"><div className="flex items-center gap-2"><Switch checked={!!form.maintenance_mode} onCheckedChange={v => set("maintenance_mode", v)} /><span className="text-sm text-muted-foreground">When ON, public website shows maintenance page.</span></div></Row>
            <Row label="Bing verification code"><div className="space-y-1"><Input value={form.bing_site_verification ?? ""} placeholder="e.g. 1A2B3C4D5E6F…" onChange={e => set("bing_site_verification", e.target.value)} /><p className="text-xs text-muted-foreground">From Bing Webmaster Tools → "HTML Meta Tag". Paste only the content value. Added to every page.</p></div></Row>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-border rounded-xl bg-card p-6 space-y-4">{children}</div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[200px_1fr] gap-2 sm:gap-6 items-start">
      <Label className="pt-2">{label}</Label>
      <div>{children}</div>
    </div>
  );
}
