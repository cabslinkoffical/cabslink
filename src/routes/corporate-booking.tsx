import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  ArrowRight,
  FileText,
  Headset,
  ShieldCheck,
  Users,
  Clock,
  PlaneTakeoff,
  Receipt,
  BarChart3,
  Check,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { FaqSection, LongFormSections, faqJsonLd } from "@/components/site/ContentSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitCorporateInquiry } from "@/lib/corporate.functions";
import { useCaptcha } from "@/components/site/Captcha";
import { PhoneInput } from "@/components/site/PhoneInput";
import { FormNotice, FormField, focusFirstInvalid, zodFieldErrors, StickyFormSubmit } from "@/components/site/FormValidation";

const CB_FAQS = [
  { q: "Is there any cost to open an account?", a: "No. Opening an account is free and there is no minimum monthly spend. You are billed only for journeys taken." },
  { q: "How long does approval take?", a: "Most accounts are approved within one working day of your enquiry. Larger tenders or accounts needing bespoke terms can take a few days." },
  { q: "How are we invoiced?", a: "One consolidated monthly invoice, with cost-centre, project or purchase-order references shown per journey so finance can reconcile without receipts." },
  { q: "Can several people book on the account?", a: "Yes. You can nominate as many bookers as you need, and each booking can carry the traveller's own details and a reference of your choosing." },
  { q: "What are your payment terms?", a: "Standard terms are 14 days from invoice by bank transfer. Longer terms can be agreed for higher-volume accounts." },
  { q: "Do you cover the whole UK?", a: "Yes. We operate nationwide, including every major UK airport, with airport pickups flight-tracked and met in arrivals." },
  { q: "Can we cancel or change a booking?", a: "Yes. Changes and cancellations are handled by your account line; free cancellation applies up to 24 hours before pickup on standard account journeys." },
];

const CB_SECTIONS = [
  {
    title: "What your account includes",
    paragraphs: [
      "Every account comes with a named account manager, a priority booking line, agreed rates by vehicle class and route, and monthly invoicing with your own reference structure carried on each line.",
      "Bookers arrange travel for colleagues, candidates and visiting clients without handling payment, and recurring journeys can run on a standing reference rather than being re-entered each week.",
    ],
  },
  {
    title: "Who it suits",
    paragraphs: [
      "Professional services, finance, technology, healthcare, film and events teams use accounts most: anywhere travel is frequent, needs to be booked by someone other than the traveller, and has to be reconciled against a cost centre.",
      "Accounts also suit hotels, PAs and EAs booking on behalf of guests, and organisations moving delegates between venues and hotels during conferences and roadshows.",
    ],
  },
  {
    title: "Reporting and compliance",
    paragraphs: [
      "Monthly statements break spend down by traveller, cost centre and route, so budget holders can see exactly where travel money goes and where a fixed route rate would save money.",
      "Drivers are licensed, vetted and insured for private hire work, vehicles are fully insured and maintained, and we hold public liability cover. Certificates are provided with your proposal for procurement files.",
    ],
  },
  {
    title: "Getting started",
    paragraphs: [
      "Send the enquiry form with your sites, airports, rough monthly volume and how invoices must be referenced. We reply with a written proposal covering rates by class and route plus your service levels.",
      "Once you sign off, your booking line and account references go live, and your first journeys can usually be booked the same day.",
    ],
  },
];


function CorporateBookingPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useServerFn(submitCorporateInquiry);
  const captcha = useCaptcha("corporate");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error, {
        company: "Enter your company name.",
        name: "Enter your full name.",
        email: "Enter a valid work email address.",
        phone: "Enter a contact phone number.",
        needs: "Describe your travel needs (at least 10 characters).",
      }));
      focusFirstInvalid(form);
      return;
    }
    setErrors({});
    if (!captcha.ready) { toast.error("Please complete the security check below."); return; }
    setLoading(true);
    try {
      await submit({ data: { ...parsed.data, website: (fd.get("website") ?? "").toString(), captchaToken: captcha.token } });
      toast.success("Enquiry sent — our team will reply within 24 hours.");
      form.reset();
      setPhone("");
      captcha.reset();
    } catch (err) {
      captcha.reset();
      toast.error(err instanceof Error ? err.message : "Could not submit. Please try again.");
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
                  <span className="font-display text-3xl text-[var(--gold-ink)] w-10">{s.n}</span>
                  <div><h4 className="font-semibold text-lg">{s.t}</h4><p className="text-sm text-muted-foreground mt-1">{s.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <form noValidate onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 md:p-8 pb-28 lg:pb-8 shadow-sm h-fit">
            <div className="flex items-center gap-3"><Building2 className="size-6 text-[var(--gold-ink)]" /><h3 className="font-display text-2xl font-semibold">Corporate enquiry</h3></div>
            <div className="mt-6 grid gap-4">
              <FormNotice visible={Object.keys(errors).length > 0} />
              <FormField label="Company" htmlFor="corp-company" error={errors.company}>
                <Input id="corp-company" name="company" required maxLength={120} aria-invalid={!!errors.company} />
              </FormField>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Your name" htmlFor="corp-name" error={errors.name}>
                  <Input id="corp-name" name="name" required maxLength={100} aria-invalid={!!errors.name} />
                </FormField>
                <FormField label="Phone" htmlFor="corp-phone" error={errors.phone}>
                  <PhoneInput id="corp-phone" name="phone" value={phone} onChange={setPhone} required />
                </FormField>
              </div>
              <FormField label="Email" htmlFor="corp-email" error={errors.email}>
                <Input id="corp-email" name="email" type="email" required maxLength={255} aria-invalid={!!errors.email} />
              </FormField>
              <FormField label="Your travel needs" htmlFor="corp-needs" error={errors.needs}>
                <Textarea id="corp-needs" name="needs" required maxLength={1500} rows={5} placeholder="Team size, monthly volume, airports, billing preferences…" aria-invalid={!!errors.needs} />
              </FormField>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="corp-website">Website</label>
                <input id="corp-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              {captcha.widget}
              <Button type="submit" variant="gold" disabled={loading || !captcha.ready} className="rounded-full hidden lg:inline-flex">
                {loading ? "Sending…" : <>Request proposal <ArrowRight className="size-4" /></>}
              </Button>
              <StickyFormSubmit label={<>Request proposal <ArrowRight className="size-4" /></>} loadingLabel="Sending…" loading={loading} disabled={!captcha.ready} invalid={Object.keys(errors).length > 0} />
            </div>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
