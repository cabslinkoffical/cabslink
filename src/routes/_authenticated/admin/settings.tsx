import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui";

const opts = queryOptions({ queryKey: ["admin", "settings"], queryFn: () => getSettings() });
export const Route = createFileRoute("/_authenticated/admin/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
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
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader title="Settings" description="Business-wide configuration.">
        <Button onClick={() => mut.mutate({
          company_name: form.company_name, logo_url: form.logo_url, favicon_url: form.favicon_url,
          primary_color: form.primary_color, contact_email: form.contact_email, contact_phone: form.contact_phone,
          whatsapp_number: form.whatsapp_number, business_address: form.business_address,
          currency: form.currency, currency_symbol: form.currency_symbol || "£",
          timezone: form.timezone,
          tax_enabled: !!form.tax_enabled,
          tax_percentage: Number(form.tax_percentage || 0),
          tax_label: form.tax_label || "VAT",
          cancellation_policy: form.cancellation_policy, maintenance_mode: !!form.maintenance_mode,
          smtp_host: form.smtp_host, smtp_port: form.smtp_port ? Number(form.smtp_port) : null,
          smtp_user: form.smtp_user, google_maps_api_key: form.google_maps_api_key,
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
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="extras">Pricing extras</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="pois">POI matching</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <Row label="Company name"><Input value={form.company_name ?? ""} onChange={e => set("company_name", e.target.value)} /></Row>
            <Row label="Contact email"><Input type="email" value={form.contact_email ?? ""} onChange={e => set("contact_email", e.target.value)} /></Row>
            <Row label="Phone number"><Input value={form.contact_phone ?? ""} onChange={e => set("contact_phone", e.target.value)} /></Row>
            <Row label="WhatsApp"><Input value={form.whatsapp_number ?? ""} onChange={e => set("whatsapp_number", e.target.value)} /></Row>
            <Row label="Business address"><Textarea rows={2} value={form.business_address ?? ""} onChange={e => set("business_address", e.target.value)} /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card>
            <Row label="Logo URL"><Input value={form.logo_url ?? ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://…" /></Row>
            <Row label="Favicon URL"><Input value={form.favicon_url ?? ""} onChange={e => set("favicon_url", e.target.value)} /></Row>
            <Row label="Primary color"><div className="flex gap-2"><Input type="color" value={form.primary_color ?? "#1e3a8a"} onChange={e => set("primary_color", e.target.value)} className="w-20 h-10 p-1" /><Input value={form.primary_color ?? ""} onChange={e => set("primary_color", e.target.value)} /></div></Row>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4 mt-4">
          <Card>
            <Row label="Currency code">
              <Input placeholder="GBP" value={form.currency ?? ""} onChange={e => set("currency", e.target.value)} />
            </Row>
            <Row label="Currency symbol">
              <Input placeholder="£" maxLength={6} value={form.currency_symbol ?? ""} onChange={e => set("currency_symbol", e.target.value)} />
            </Row>
            <Row label="Timezone"><Input value={form.timezone ?? ""} onChange={e => set("timezone", e.target.value)} /></Row>
            <Row label="Tax enabled">
              <div className="flex items-center gap-2">
                <Switch checked={!!form.tax_enabled} onCheckedChange={v => set("tax_enabled", v)} />
                <span className="text-sm text-muted-foreground">When ON, tax is added to every quote and booking.</span>
              </div>
            </Row>
            <Row label="Tax label">
              <Input placeholder="VAT" maxLength={40} value={form.tax_label ?? ""} onChange={e => set("tax_label", e.target.value)} />
            </Row>
            <Row label="Tax rate %"><Input type="number" step="0.01" value={form.tax_percentage ?? 0} onChange={e => set("tax_percentage", e.target.value)} /></Row>
            <Row label="Cancellation policy"><Textarea rows={3} value={form.cancellation_policy ?? ""} onChange={e => set("cancellation_policy", e.target.value)} /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card>
            <Row label="SMTP host"><Input value={form.smtp_host ?? ""} onChange={e => set("smtp_host", e.target.value)} /></Row>
            <Row label="SMTP port"><Input type="number" value={form.smtp_port ?? ""} onChange={e => set("smtp_port", e.target.value)} /></Row>
            <Row label="SMTP user"><Input value={form.smtp_user ?? ""} onChange={e => set("smtp_user", e.target.value)} /></Row>
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
