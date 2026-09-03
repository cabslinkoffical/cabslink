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
import { Textarea } from "@/components/ui/textarea";
import { submitCorporateInquiry } from "@/lib/corporate.functions";
import { useCaptcha } from "@/components/site/Captcha";
import { PhoneInput } from "@/components/site/PhoneInput";
import { FormNotice, FormField, focusFirstInvalid, zodFieldErrors, StickyFormSubmit } from "@/components/site/FormValidation";

export const Route = createFileRoute("/corporate-booking")({
  head: () => ({
    meta: [
      { title: "Corporate Booking — Open a Cabslink Business Account" },
      { name: "description", content: "Open a corporate account with Cabslink for account-managed UK driver and airport transfer services." },
      { property: "og:title", content: "Corporate Booking — Cabslink" },
      { property: "og:description", content: "Open a corporate account with Cabslink for account-managed UK driver and airport transfer services." },
      { property: "og:url", content: "https://cabslink.com/corporate-booking" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/corporate-booking" }],
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
    </SiteLayout>
  );
}
