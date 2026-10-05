import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitDriverApplication } from "@/lib/driver-application.functions";
import { useCaptcha } from "@/components/site/Captcha";
import { PhoneInput } from "@/components/site/PhoneInput";
import { FormNotice, FormField, focusFirstInvalid, zodFieldErrors, StickyFormSubmit } from "@/components/site/FormValidation";

const thisYear = new Date().getFullYear();
const req = (max = 100) => z.string().trim().min(1).max(max);

/** Client-side mirror of the server rules for the detailed driver application. */
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  area: req(100),
  rightToWork: z.enum(["yes", "no"]),
  licenceYears: z.coerce.number().int().min(0).max(70),
  phLicence: z.enum(["yes", "applying", "no"]),
  council: z.string().trim().max(100).optional().default(""),
  phLicenceNumber: z.string().trim().max(40).optional().default(""),
  phLicenceExpiry: z.string().trim().max(20).optional().default(""),
  hasVehicle: z.enum(["own", "rent", "none"]),
  vehicleMakeModel: z.string().trim().max(100).optional().default(""),
  vehicleYear: z.string().trim().max(4).optional().default(""),
  vehicleReg: z.string().trim().max(12).optional().default(""),
  vehicleSeats: z.string().trim().max(2).optional().default(""),
  insurance: z.enum(["yes", "no"]).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60),
  availability: z.enum(["full-time", "part-time", "weekends", "flexible"]),
  message: z.string().trim().max(1000).optional().default(""),
}).superRefine((d, ctx) => {
  if (d.phLicence !== "no") {
    if (!d.council) ctx.addIssue({ code: "custom", path: ["council"], message: "Enter your licensing council." });
    if (d.phLicence === "yes") {
      if (!d.phLicenceNumber) ctx.addIssue({ code: "custom", path: ["phLicenceNumber"], message: "Enter your badge / licence number." });
      if (!d.phLicenceExpiry) ctx.addIssue({ code: "custom", path: ["phLicenceExpiry"], message: "Enter the licence expiry date." });
    }
  }
  if (d.hasVehicle !== "none") {
    if (!d.vehicleMakeModel) ctx.addIssue({ code: "custom", path: ["vehicleMakeModel"], message: "Enter the vehicle make and model." });
    const y = Number(d.vehicleYear);
    if (!/^\d{4}$/.test(d.vehicleYear) || y < 1990 || y > thisYear + 1) ctx.addIssue({ code: "custom", path: ["vehicleYear"], message: "Enter a valid 4-digit year." });
    if (!/^[A-Za-z0-9 ]{2,10}$/.test(d.vehicleReg)) ctx.addIssue({ code: "custom", path: ["vehicleReg"], message: "Enter the registration (letters and numbers only)." });
    const s = Number(d.vehicleSeats);
    if (!Number.isInteger(s) || s < 1 || s > 16) ctx.addIssue({ code: "custom", path: ["vehicleSeats"], message: "Enter passenger seats (1–16)." });
    if (!d.insurance) ctx.addIssue({ code: "custom", path: ["insurance"], message: "Tell us about hire & reward insurance." });
  }
});

const MESSAGES: Record<string, string> = {
  name: "Enter your full name.",
  email: "Enter a valid email address.",
  phone: "Enter a contact phone number.",
  area: "Enter the town or area you'd cover.",
  rightToWork: "Choose an option.",
  licenceYears: "Enter years held (0–70).",
  phLicence: "Choose an option.",
  hasVehicle: "Choose an option.",
  experienceYears: "Enter years of experience (0–60).",
  availability: "Choose your availability.",
};

const selectCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Select({ id, name, options, value, onChange, invalid }: {
  id: string; name: string; options: Array<[string, string]>; value?: string;
  onChange?: (v: string) => void; invalid?: boolean;
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      defaultValue={value === undefined ? "" : undefined}
      aria-invalid={invalid}
      className={`${selectCls} ${invalid ? "border-destructive ring-1 ring-destructive/50" : ""}`}
    >
      <option value="" disabled>Select…</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function DriverApplicationForm({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [phone, setPhone] = useState("");
  const [phLicence, setPhLicence] = useState("");
  const [hasVehicle, setHasVehicle] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useServerFn(submitDriverApplication);
  const captcha = useCaptcha("driver-application");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const raw = Object.fromEntries(fd) as Record<string, string>;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error, MESSAGES));
      focusFirstInvalid(form);
      return;
    }
    setErrors({});
    if (!captcha.ready) { toast.error("Please complete the security check below."); return; }
    const { name, email, phone: ph, message, ...details } = parsed.data;
    setLoading(true);
    try {
      await submit({
        data: {
          name, email, phone: ph, message,
          details: { ...details, vehicleReg: details.vehicleReg.toUpperCase() },
          website: (fd.get("website") ?? "").toString(),
          captchaToken: captcha.token,
        },
      });
      setDone(true);
      toast.success("Application received — we'll be in touch.");
      form.reset();
      setPhone(""); setPhLicence(""); setHasVehicle("");
      captcha.reset();
    } catch (err) {
      captcha.reset();
      toast.error(err instanceof Error ? err.message : "Could not submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const yesNo: Array<[string, string]> = [["yes", "Yes"], ["no", "No"]];

  return (
    <form noValidate onSubmit={onSubmit} className={`rounded-3xl border border-border bg-card p-6 md:p-8 pb-28 lg:pb-8 shadow-raised h-fit ${className}`}>
      <h3 className="font-display text-2xl font-semibold">Driver application</h3>
      <p className="text-sm text-muted-foreground mt-1">Fill in your details, licence and vehicle so we can review your application.</p>
      <div className="mt-6 grid gap-4">
        <FormNotice visible={Object.keys(errors).length > 0} />

        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your details</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Full name" htmlFor="drv-name" error={errors.name}>
            <Input id="drv-name" name="name" maxLength={100} autoComplete="name" aria-invalid={!!errors.name} />
          </FormField>
          <FormField label="Email" htmlFor="drv-email" error={errors.email}>
            <Input id="drv-email" name="email" type="email" maxLength={255} autoComplete="email" aria-invalid={!!errors.email} />
          </FormField>
          <FormField label="Phone" htmlFor="drv-phone" error={errors.phone}>
            <PhoneInput id="drv-phone" name="phone" value={phone} onChange={setPhone} required />
          </FormField>
          <FormField label="Town / area you'd cover" htmlFor="drv-area" error={errors.area}>
            <Input id="drv-area" name="area" maxLength={100} placeholder="e.g. Edinburgh" aria-invalid={!!errors.area} />
          </FormField>
          <FormField label="Right to work in the UK?" htmlFor="drv-rtw" error={errors.rightToWork}>
            <Select id="drv-rtw" name="rightToWork" options={yesNo} invalid={!!errors.rightToWork} />
          </FormField>
          <FormField label="Years holding a full UK driving licence" htmlFor="drv-ly" error={errors.licenceYears}>
            <Input id="drv-ly" name="licenceYears" type="number" min={0} max={70} inputMode="numeric" aria-invalid={!!errors.licenceYears} />
          </FormField>
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Private hire licence</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Private hire / PCO licence?" htmlFor="drv-ph" error={errors.phLicence}>
            <Select id="drv-ph" name="phLicence" value={phLicence} onChange={setPhLicence} invalid={!!errors.phLicence}
              options={[["yes", "Yes, I hold one"], ["applying", "Applying now"], ["no", "Not yet"]]} />
          </FormField>
          {phLicence && phLicence !== "no" && (
            <FormField label="Licensing council" htmlFor="drv-council" error={errors.council}>
              <Input id="drv-council" name="council" maxLength={100} placeholder="e.g. City of Edinburgh" aria-invalid={!!errors.council} />
            </FormField>
          )}
          {phLicence === "yes" && (
            <>
              <FormField label="Badge / licence number" htmlFor="drv-phn" error={errors.phLicenceNumber}>
                <Input id="drv-phn" name="phLicenceNumber" maxLength={40} aria-invalid={!!errors.phLicenceNumber} />
              </FormField>
              <FormField label="Licence expiry date" htmlFor="drv-phe" error={errors.phLicenceExpiry}>
                <Input id="drv-phe" name="phLicenceExpiry" type="date" aria-invalid={!!errors.phLicenceExpiry} />
              </FormField>
            </>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Vehicle</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Do you have a vehicle?" htmlFor="drv-veh" error={errors.hasVehicle}>
            <Select id="drv-veh" name="hasVehicle" value={hasVehicle} onChange={setHasVehicle} invalid={!!errors.hasVehicle}
              options={[["own", "Yes, I own it"], ["rent", "Yes, rented / financed"], ["none", "No vehicle"]]} />
          </FormField>
          {hasVehicle && hasVehicle !== "none" && (
            <>
              <FormField label="Make and model" htmlFor="drv-mm" error={errors.vehicleMakeModel}>
                <Input id="drv-mm" name="vehicleMakeModel" maxLength={100} placeholder="e.g. Mercedes E-Class" aria-invalid={!!errors.vehicleMakeModel} />
              </FormField>
              <FormField label="Year" htmlFor="drv-vy" error={errors.vehicleYear}>
                <Input id="drv-vy" name="vehicleYear" inputMode="numeric" maxLength={4} placeholder={String(thisYear - 2)} aria-invalid={!!errors.vehicleYear} />
              </FormField>
              <FormField label="Registration" htmlFor="drv-reg" error={errors.vehicleReg}>
                <Input id="drv-reg" name="vehicleReg" maxLength={10} className="uppercase" aria-invalid={!!errors.vehicleReg} />
              </FormField>
              <FormField label="Passenger seats" htmlFor="drv-seats" error={errors.vehicleSeats}>
                <Input id="drv-seats" name="vehicleSeats" type="number" min={1} max={16} inputMode="numeric" aria-invalid={!!errors.vehicleSeats} />
              </FormField>
              <FormField label="Hire & reward insurance?" htmlFor="drv-ins" error={errors.insurance}>
                <Select id="drv-ins" name="insurance" options={yesNo} invalid={!!errors.insurance} />
              </FormField>
            </>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Experience</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Years of professional driving" htmlFor="drv-exp" error={errors.experienceYears}>
            <Input id="drv-exp" name="experienceYears" type="number" min={0} max={60} inputMode="numeric" aria-invalid={!!errors.experienceYears} />
          </FormField>
          <FormField label="Availability" htmlFor="drv-av" error={errors.availability}>
            <Select id="drv-av" name="availability" invalid={!!errors.availability}
              options={[["full-time", "Full-time"], ["part-time", "Part-time"], ["weekends", "Weekends"], ["flexible", "Flexible"]]} />
          </FormField>
        </div>
        <FormField label="Anything else (optional)" htmlFor="drv-message" error={errors.message}>
          <Textarea id="drv-message" name="message" maxLength={1000} rows={4} aria-invalid={!!errors.message} />
        </FormField>

        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="drv-website">Website</label>
          <input id="drv-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        {captcha.widget}
        <Button type="submit" variant="gold" disabled={loading || !captcha.ready} className="rounded-full hidden lg:inline-flex">
          {loading ? "Submitting…" : <>Submit application <ArrowRight className="size-4" /></>}
        </Button>
        <StickyFormSubmit label={<>Submit application <ArrowRight className="size-4" /></>} loadingLabel="Submitting…" loading={loading} disabled={!captcha.ready} invalid={Object.keys(errors).length > 0} />
        {done && <p className="text-sm text-[var(--gold-ink)] text-center">Thanks — your application has been received.</p>}
      </div>
    </form>
  );
}
