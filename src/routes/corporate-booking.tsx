import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitCorporateInquiry } from "@/lib/corporate.functions";
import { PhoneInput } from "@/components/site/PhoneInput";

export const Route = createFileRoute("/corporate-booking")({
  head: () => ({
    meta: [
      { title: "Corporate Booking — Open a Cabslink Business Account" },
      { name: "description", content: "Open a corporate account with Cabslink for account-managed UK driver and airport transfer services." },
      { property: "og:title", content: "Corporate Booking — Cabslink" },
      { property: "og:description", content: "Open a corporate account with Cabslink for account-managed UK driver and airport transfer services." },
      { property: "og:url", content: "https://cabslink.lovable.app/corporate-booking" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/corporate-booking" }],
  }),
  component: CorporateBookingPage,
});

const schema = z.object({
  company: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  needs: z.string().trim().min(10).max(1500),
});

function CorporateBookingPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const submit = useServerFn(submitCorporateInquiry);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    const parsed = schema.safeParse(data);
    if (!parsed.success) { toast.error("Please complete all fields."); return; }
    setLoading(true);
    try {
      await submit({ data: { ...parsed.data, website: (fd.get("website") ?? "").toString() } });
      toast.success("Enquiry sent — our team will reply within 24 hours.");
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
        eyebrow="Corporate Booking"
        title="Open a Cabslink business account."
        subtitle="Tell us about your team and travel patterns and we'll put together a tailored proposal — with priority dispatch, monthly invoicing and a dedicated account manager."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Corporate Booking" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-2 gap-12">
          <div>
            <SectionHeader eyebrow="How it works" title="From enquiry to first ride in 48 hours." />
            <ol className="mt-8 space-y-6">
              {[
                { n: "01", t: "Tell us your needs", d: "Submit the form — team size, travel patterns, billing preferences." },
                { n: "02", t: "Receive a proposal", d: "A tailored quote and SLA, usually within one working day." },
                { n: "03", t: "Activate your account", d: "Sign off and your dedicated booking line goes live." },
                { n: "04", t: "Book & travel", d: "Web, phone or email — billed monthly with full reporting." },
              ].map(s => (
                <li key={s.n} className="flex gap-5">
                  <span className="font-display text-3xl text-[var(--gold)] w-10">{s.n}</span>
                  <div><h4 className="font-semibold text-lg">{s.t}</h4><p className="text-sm text-muted-foreground mt-1">{s.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm h-fit">
            <div className="flex items-center gap-3"><Building2 className="size-6 text-[var(--gold)]" /><h3 className="font-display text-2xl font-semibold">Corporate enquiry</h3></div>
            <div className="mt-6 grid gap-4">
              <div><Label>Company</Label><Input name="company" required maxLength={120} className="mt-1.5" /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Your name</Label><Input name="name" required maxLength={100} className="mt-1.5" /></div>
                <div><Label>Phone</Label><div className="mt-1.5"><PhoneInput name="phone" value={phone} onChange={setPhone} required /></div></div>
              </div>
              <div><Label>Email</Label><Input name="email" type="email" required maxLength={255} className="mt-1.5" /></div>
              <div><Label>Your travel needs</Label><Textarea name="needs" required maxLength={1500} rows={5} className="mt-1.5" placeholder="Team size, monthly volume, airports, billing preferences…" /></div>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="corp-website">Website</label>
                <input id="corp-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <Button type="submit" variant="gold" disabled={loading} className="rounded-full">
                {loading ? "Sending…" : <>Request proposal <ArrowRight className="size-4" /></>}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
