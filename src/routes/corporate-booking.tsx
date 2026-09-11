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

export const Route = createFileRoute("/corporate-booking")({
  head: () => ({
    meta: [
      { title: "Corporate Booking — Open a Cabslink Business Account" },
      { name: "description", content: "Open a corporate account with Cabslink: agreed rates, priority dispatch, monthly invoicing and a named account manager for UK business travel." },
      { property: "og:title", content: "Corporate Booking — Cabslink" },
      { property: "og:description", content: "Open a corporate account with Cabslink: agreed rates, priority dispatch, monthly invoicing and a named account manager for UK business travel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://cabslink.com/corporate-booking" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/corporate-booking" }],
    scripts: [faqJsonLd(CB_FAQS)],
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

      {/* What the account gives you */}
      <section className="section-y bg-[var(--surface)]">
        <div className="container-x">
          <SectionHeader eyebrow="Included as standard" title="Everything an account gives your team" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Building2, t: "Named account manager", d: "One person who knows your sites, your bookers and your travel patterns." },
              { i: Receipt, t: "Monthly invoicing", d: "No cards at the roadside. One invoice, your references on every line." },
              { i: Headset, t: "Priority booking line", d: "A direct line and email inbox answered 24/7 by our dispatch team." },
              { i: PlaneTakeoff, t: "Flight-tracked airports", d: "Arrivals are met with a name board; delays are absorbed, not charged." },
              { i: BarChart3, t: "Spend reporting", d: "Monthly breakdown by traveller, cost centre and route." },
              { i: ShieldCheck, t: "Vetted, insured drivers", d: "Licensed private-hire drivers, maintained vehicles, cover documents on file." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-border bg-card p-7">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><f.i className="size-5" /></div>
                <h3 className="mt-5 font-display text-xl font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who books with us + service levels */}
      <section className="section-y">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Who we look after" title="Travel we handle every week" />
            <ul className="mt-8 grid gap-3">
              {[
                "Executive and board travel between offices, client sites and airports",
                "Visiting clients, candidates and inspectors met at arrivals",
                "Conference, AGM and roadshow delegate movements",
                "Hotel and venue shuttles on a single reference",
                "Crew, production and event staff transfers",
                "Late-night and shift-end journeys for staff duty of care",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                  <span className="text-sm text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow="Service levels" title="What we commit to in writing" />
            <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
              {[
                { i: Clock, k: "Enquiry response", v: "Within 1 working day" },
                { i: Headset, k: "Booking confirmation", v: "Within 30 minutes, 24/7" },
                { i: PlaneTakeoff, k: "Airport waiting time", v: "60 minutes free after landing" },
                { i: Users, k: "Driver details shared", v: "The evening before travel" },
                { i: FileText, k: "Free cancellation", v: "Up to 24 hours before pickup" },
                { i: Receipt, k: "Invoice terms", v: "14 days from monthly statement" },
              ].map((r) => (
                <div key={r.k} className="flex items-center gap-4 px-5 py-4">
                  <r.i className="size-4 shrink-0 text-[var(--gold-ink)]" />
                  <dt className="text-sm font-semibold">{r.k}</dt>
                  <dd className="ml-auto text-right text-sm text-muted-foreground">{r.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Service levels are confirmed in your proposal and can be tailored to your volume and locations.
            </p>
          </div>
        </div>
      </section>

      <LongFormSections sections={CB_SECTIONS} heading="Corporate accounts in detail" />
      <FaqSection faqs={CB_FAQS} />

      {/* Closing CTA */}
      <section className="section-y">
        <div className="container-x">
          <div className="flex flex-col items-start gap-8 rounded-3xl bg-[var(--navy)] p-10 text-white md:flex-row md:items-center md:justify-between md:p-14">
            <div>
              <h2 className="font-display text-3xl md:text-4xl">Prefer to talk it through first?</h2>
              <p className="mt-2 max-w-xl text-white/75">
                Call our team on +44 333 888 2991 or read how corporate travel works with us before you send an enquiry.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg" className="rounded-full">
                <a href="tel:+443338882991">Call the team</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent text-white">
                <Link to="/corporate-travel">Corporate travel <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
