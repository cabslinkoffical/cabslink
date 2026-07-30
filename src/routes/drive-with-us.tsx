import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Briefcase, Car, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitDriverApplication } from "@/lib/driver-application.functions";
import { PhoneInput } from "@/components/site/PhoneInput";

export const Route = createFileRoute("/drive-with-us")({
  head: () => ({
    meta: [
      { title: "Drive With Us — Become a Cabslink Driver or Fleet Partner" },
      { name: "description", content: "Join Cabslink as a professional driver or licensed fleet operator. Steady premium work across the UK with a respected brand." },
      { property: "og:title", content: "Drive With Us — Cabslink" },
      { property: "og:description", content: "Join Cabslink as a professional driver or licensed fleet operator. Steady premium work across the UK with a respected brand." },
      { property: "og:url", content: "https://cabslink.lovable.app/drive-with-us" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/drive-with-us" }],
  }),
  component: DrivePage,
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  message: z.string().trim().min(10).max(1000),
});

function DrivePage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [phone, setPhone] = useState("");
  const submit = useServerFn(submitDriverApplication);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    const parsed = schema.safeParse(data);
    if (!parsed.success) { toast.error("Please fill out all fields correctly."); return; }
    setLoading(true);
    try {
      await submit({ data: { ...parsed.data, website: (fd.get("website") ?? "").toString() } });
      setDone(true);
      toast.success("Application received — we'll be in touch.");
      form.reset();
      setPhone("");
    } catch {
      toast.error("Could not submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SiteLayout>
      <PageHero
        eyebrow="Drive With Us"
        title="Partner with Cabslink as a driver or fleet operator."
        subtitle="Steady premium work, a respected brand, and a team that supports its drivers — apply to join us today."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Drive With Us" }]}
        showCta={false}

      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12">
          <div>
            <SectionHeader eyebrow="Why drive with Cabslink" title="A platform built for professional drivers." />
            <ul className="mt-8 space-y-5">
              {[
                { i: Car, t: "Steady premium work", d: "Consistent jobs from a recognised UK brand." },
                { i: Users, t: "Quality passengers", d: "Vetted private, corporate and VIP clients." },
                { i: Briefcase, t: "Account & event work", d: "Long-term corporate accounts and event contracts." },
                { i: ShieldCheck, t: "Driver-first support", d: "Real humans on the dispatch line, day and night." },
              ].map(b => (
                <li key={b.t} className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]"><b.i className="size-5" /></div>
                  <div><h4 className="font-semibold">{b.t}</h4><p className="text-sm text-muted-foreground mt-1">{b.d}</p></div>
                </li>
              ))}
            </ul>
            <div className="mt-10 rounded-2xl border border-border bg-[var(--surface)] p-6">
              <h4 className="font-semibold">Requirements</h4>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {["Valid UK PCO/private hire licence", "Modern, clean vehicle (≤ 5 years)", "Professional appearance", "Smartphone with data", "Right to work in the UK", "Excellent local knowledge"].map(r => <li key={r}>• {r}</li>)}
              </ul>
            </div>
          </div>
          <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm h-fit">
            <h3 className="font-display text-2xl font-semibold">Apply now</h3>
            <p className="text-sm text-muted-foreground mt-1">Tell us a little about yourself — we'll be in touch within 24 hours.</p>
            <div className="mt-6 grid gap-4">
              <div><Label>Full name</Label><Input name="name" required maxLength={100} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required maxLength={255} className="mt-1.5" /></div>
              <div><Label>Phone</Label><div className="mt-1.5"><PhoneInput name="phone" value={phone} onChange={setPhone} required /></div></div>
              <div><Label>Tell us about yourself</Label><Textarea name="message" required maxLength={1000} rows={5} className="mt-1.5" placeholder="Years driving, licence, vehicle, area covered…" /></div>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="drv-website">Website</label>
                <input id="drv-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <Button type="submit" variant="gold" disabled={loading} className="rounded-full">
                {loading ? "Submitting…" : <>Submit application <ArrowRight className="size-4" /></>}
              </Button>
              {done && <p className="text-sm text-[var(--gold)] text-center">Thanks — your application has been received.</p>}
            </div>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
