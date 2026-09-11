import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, Users, Briefcase, Plane, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { submitTourEnquiry } from "@/lib/tour-enquiry.functions";
import { useCaptcha } from "@/components/site/Captcha";
import { PhoneInput } from "@/components/site/PhoneInput";
import { toast } from "sonner";
import { FormNotice, focusFirstInvalid } from "@/components/site/FormValidation";

type Stop = { name: string; time: string; blurb: string };
export type TourForBooking = {
  slug: string;
  name: string;
  from: string;
  to: string;
  duration: string;
  distance: string;
  fromPrice: string;
  stops: Stop[];
};

type Props = {
  tour: TourForBooking;
  trigger: React.ReactNode;
  autoOpen?: boolean;
};

export function TourBookingDialog({ tour, trigger, autoOpen = false }: Props) {
  const [open, setOpen] = useState(autoOpen);

  const [time, setTime] = useState("09:00");
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flight, setFlight] = useState("");
  const [hotel, setHotel] = useState("");
  const [selectedStops, setSelectedStops] = useState<string[]>(
    tour.stops.map((s) => s.name),
  );
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [attempted, setAttempted] = useState(false);

  const captcha = useCaptcha("tour-enquiry");
  const submit = useMutation({
    mutationFn: async () =>
      submitTourEnquiry({
        data: {
          tourSlug: tour.slug,
          tourName: tour.name,
          routeFrom: tour.from,
          routeTo: tour.to,
          summary: `Duration: ${tour.duration} | Distance: ${tour.distance} | ${tour.fromPrice}`,
          time,
          passengers,
          luggage,
          name,
          email,
          phone: phone || null,
          flight: flight || null,
          hotel: hotel || null,
          stops: tour.stops.filter((s) => selectedStops.includes(s.name)).map((s) => s.name),
          notes: notes || null,
          website: "",
          captchaToken: captcha.token,
        },
      }),
    onSuccess: (res) => {
      setBookingRef(res.bookingRef ?? "");
      setDone(true);
      toast.success("Tour enquiry received — we'll confirm your price shortly.");
    },
    onError: (e: Error) => {
      captcha.reset();
      toast.error(e.message ?? "Could not send. Please try again.");
    },
  });

  const errors = {
    time: !time ? "Choose a start time." : "",
    name: name.trim().length < 2 ? "Enter your full name." : "",
    email: !/.+@.+\..+/.test(email.trim()) ? "Enter a valid email address." : "",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const canSubmit = useMemo(
    () => Boolean(errorCount === 0 && captcha.ready),
    [errorCount, captcha.ready],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setDone(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="size-14 text-[var(--gold-ink)] mx-auto" />
            <h3 className="font-display text-2xl font-bold">Tour enquiry received</h3>
            {bookingRef ? (
              <div className="mx-auto max-w-xs rounded-2xl border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Your reference
                </p>
                <p className="font-mono text-lg font-bold tracking-wider">{bookingRef}</p>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thanks {name.split(" ")[0]}. Our tour desk will confirm availability and a fixed price
              for <strong>{tour.name}</strong> within a few hours. No payment is needed yet.
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You can track, pay for or cancel this tour any time on the{" "}
              <a href="/manage-booking" className="font-semibold underline">
                manage booking
              </a>{" "}
              page using your reference and last name.
            </p>
            <Button variant="gold" className="rounded-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)]">
                Book this tour
              </p>
              <DialogTitle className="font-display text-2xl">{tour.name}</DialogTitle>
              <DialogDescription>
                {tour.from} → {tour.to} · {tour.duration} · {tour.distance} · {tour.fromPrice}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAttempted(true);
                if (errorCount > 0) {
                  focusFirstInvalid(e.currentTarget);
                  return;
                }
                if (canSubmit) submit.mutate();
              }}
              noValidate
              className="space-y-5"
            >
              <FormNotice visible={attempted && errorCount > 0} />

              {/* When & who */}
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<Calendar className="size-4" />} label="Tour date" invalid={attempted && !!errors.date}>
                  <input
                    aria-label="Tour date"
                    required
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold"
                  />
                </Field>
                <Field icon={<Clock className="size-4" />} label="Start time" invalid={attempted && !!errors.time}>
                  <input
                    aria-label="Tour start time"
                    required
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold"
                  />
                </Field>
                <Field icon={<Users className="size-4" />} label="Passengers">
                  <input
                    aria-label="Number of passengers"
                    type="number"
                    min={1}
                    max={16}
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold"
                  />
                </Field>
                <Field icon={<Briefcase className="size-4" />} label="Luggage">
                  <input
                    aria-label="Number of luggage items"
                    type="number"
                    min={0}
                    max={16}
                    value={luggage}
                    onChange={(e) => setLuggage(Number(e.target.value))}
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold"
                  />
                </Field>
              </div>

              {/* Pickup extras — tour-specific */}
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<Plane className="size-4" />} label="Flight (optional)">
                  <input
                    aria-label="Flight number (optional)"
                    value={flight}
                    onChange={(e) => setFlight(e.target.value)}
                    placeholder="e.g. BA1448"
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold placeholder:font-normal placeholder:text-foreground/40"
                  />
                </Field>
                <Field icon={<MapPin className="size-4" />} label="Hotel / drop-off (optional)">
                  <input
                    aria-label="Hotel or drop-off address (optional)"
                    value={hotel}
                    onChange={(e) => setHotel(e.target.value)}
                    placeholder="Hotel name in Edinburgh"
                    className="w-full bg-transparent border-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] text-sm font-semibold placeholder:font-normal placeholder:text-foreground/40"
                  />
                </Field>
              </div>

              {/* Stops picker */}
              <div className="rounded-2xl border border-border p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold-ink)] mb-3">
                  Stops to include
                </p>
                <div className="space-y-2">
                  {tour.stops.map((s) => {
                    const checked = selectedStops.includes(s.name);
                    return (
                      <label
                        key={s.name}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--surface)] cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setSelectedStops((prev) =>
                              v ? [...prev, s.name] : prev.filter((n) => n !== s.name),
                            )
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-semibold">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground shrink-0">{s.time}</p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">{s.blurb}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Contact */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5" data-invalid={(attempted && !!errors.name) || undefined}>
                  <Label htmlFor="tb-name" className={attempted && errors.name ? "text-destructive" : undefined}>Full name</Label>
                  <Input
                    id="tb-name"
                    required
                    aria-invalid={attempted && !!errors.name}
                    className={attempted && errors.name ? "border-destructive ring-1 ring-destructive/50" : undefined}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {attempted && errors.name && <p className="text-xs font-semibold text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5" data-invalid={(attempted && !!errors.email) || undefined}>
                  <Label htmlFor="tb-email" className={attempted && errors.email ? "text-destructive" : undefined}>Email</Label>
                  <Input
                    id="tb-email"
                    type="email"
                    required
                    aria-invalid={attempted && !!errors.email}
                    className={attempted && errors.email ? "border-destructive ring-1 ring-destructive/50" : undefined}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {attempted && errors.email && <p className="text-xs font-semibold text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tb-phone">Phone (optional)</Label>
                  <PhoneInput id="tb-phone" value={phone} onChange={setPhone} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tb-notes">Special requests (optional)</Label>
                  <Textarea
                    id="tb-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dietary preferences, mobility needs, photo stops…"
                  />
                </div>
              </div>

              {captcha.widget}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Final price confirmed by email. No card required now.
                </p>
                <Button
                  type="submit"
                  variant="gold"
                  className="rounded-full min-w-[160px]"
                  disabled={submit.isPending || !captcha.ready}
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Request tour"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon,
  label,
  children,
  invalid,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  invalid?: boolean;
}) {
  return (
    <div
      data-invalid={invalid || undefined}
      className={`flex items-center gap-2.5 px-3 h-[60px] rounded-2xl border bg-background ${
        invalid ? "border-destructive ring-1 ring-destructive/50" : "border-border"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center text-[var(--gold-ink)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[10px] font-bold uppercase tracking-[0.18em] truncate ${
            invalid ? "text-destructive" : "text-foreground/45"
          }`}
        >
          {label}
        </div>
        <div className="[&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:w-full [&_input::-webkit-calendar-picker-indicator]:h-full [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative">
          {children}
        </div>
      </div>
    </div>
  );
}
