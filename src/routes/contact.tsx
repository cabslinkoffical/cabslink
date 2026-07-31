import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE } from "@/lib/site";
import { submitContactMessage } from "@/lib/contact.functions";
import { PhoneInput } from "@/components/site/PhoneInput";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Cabslink — 24/7 UK Driver & Transfer Booking" },
      { name: "description", content: "Get in touch with Cabslink — 24/7 support, instant quotes and dedicated booking. Email, phone and Edinburgh office." },
      { property: "og:title", content: "Contact Cabslink" },
      { property: "og:url", content: "https://cabslink.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/contact" }],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(1500),
});

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const inflight = useRef(false);
  const submit = useServerFn(submitContactMessage);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inflight.current) return;
    const fd = new FormData(e.currentTarget);
    // Honeypot: any bot filling this hidden field is silently rejected.
    if ((fd.get("website") ?? "").toString().trim() !== "") {
      toast.success("Message sent — we'll respond shortly.");
      (e.currentTarget as HTMLFormElement).reset();
      return;
    }
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error("Please fill out the required fields."); return; }
    inflight.current = true;
    setLoading(true);
    try {
      await submit({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          subject: parsed.data.subject || null,
          message: parsed.data.message,
          website: "",
        },
      });
      toast.success("Message sent — we'll respond shortly.");
      (e.currentTarget as HTMLFormElement).reset();
      setPhone("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send. Please try again.");
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Talk to Cabslink — anytime, day or night."
        subtitle="Our team is on standby 24/7. Call us, email us, or send a message and we'll respond fast."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Contact" }]}
      />
      <section className="section-y">
        <div className="container-x grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-5">
            {[
              { i: Phone, t: "Call us 24/7", lines: [SITE.phoneUK, SITE.phoneUS] },
              { i: Mail, t: "Email", lines: [SITE.email] },
              { i: MapPin, t: "Visit our office", lines: [SITE.address] },
              { i: Clock, t: "Hours", lines: ["Open 365 days a year, 24 hours a day"] },
            ].map(c => (
              <div key={c.t} className="rounded-2xl border border-border bg-card p-6 flex gap-4 shadow-raised">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold-ink)]"><c.i className="size-5" /></div>
                <div>
                  <h3 className="font-semibold">{c.t}</h3>
                  {c.lines.map(l => <p key={l} className="text-sm text-muted-foreground mt-0.5">{l}</p>)}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={onSubmit} className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-raised" noValidate>
            <h3 className="font-display text-2xl font-semibold">Send us a message</h3>
            {/* Honeypot: must remain empty; hidden from users, tempting to bots. */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="mt-6 grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Name</Label><Input name="name" required maxLength={100} className="mt-1.5" /></div>
                <div><Label>Email</Label><Input name="email" type="email" required maxLength={255} className="mt-1.5" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Phone (optional)</Label><div className="mt-1.5"><PhoneInput name="phone" value={phone} onChange={setPhone} /></div></div>
                <div><Label>Subject (optional)</Label><Input name="subject" maxLength={150} className="mt-1.5" /></div>
              </div>
              <div><Label>Message</Label><Textarea name="message" required maxLength={1500} rows={6} className="mt-1.5" /></div>
              <Button type="submit" variant="gold" disabled={loading} className="rounded-full">
                {loading ? "Sending…" : <>Send message <ArrowRight className="size-4" /></>}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
