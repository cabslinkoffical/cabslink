import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Users, Briefcase, Plane, MapPin, CheckCircle2, Loader2 } from "lucide-react";
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
import { submitContactMessage } from "@/lib/contact.functions";
import { PhoneInput } from "@/components/site/PhoneInput";
import { toast } from "sonner";

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

  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
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

  const submit = useMutation({
    mutationFn: async () => {
      const msg = [
        `TOUR ENQUIRY — ${tour.name} (${tour.slug})`,
        `Route: ${tour.from} → ${tour.to}`,
        `Duration: ${tour.duration}  |  Distance: ${tour.distance}  |  ${tour.fromPrice}`,
        ``,
        `Date/time: ${date} ${time}`,
        `Passengers: ${passengers}  |  Luggage: ${luggage}`,
        flight ? `Flight: ${flight}` : null,
        hotel ? `Hotel / drop-off: ${hotel}` : null,
        ``,
        `Selected stops:`,
        ...tour.stops.map((s) =>
          `  ${selectedStops.includes(s.name) ? "✓" : "·"} ${s.name} (${s.time})`,
        ),
        notes ? `\nNotes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return submitContactMessage({
        data: {
          name,
          email,
          phone: phone || null,
          subject: `Tour booking: ${tour.name}`,
          message: msg,
          website: "",
        },
      });
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Tour enquiry sent — we'll confirm within a few hours.");
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not send. Please try again."),
  });

  const canSubmit = useMemo(
    () => name.length >= 2 && /.+@.+\..+/.test(email) && date && time,
    [name, email, date, time],
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
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thanks {name.split(" ")[0]}. Our tour desk will confirm availability and a fixed price
              for <strong>{tour.name}</strong> on {date} at {time} within a few hours.
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
                if (canSubmit) submit.mutate();
              }}
              className="space-y-5"
            >
              {/* When & who */}
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<Calendar className="size-4" />} label="Tour date">
                  <input
                    required
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold"
                  />
                </Field>
                <Field icon={<Clock className="size-4" />} label="Start time">
                  <input
                    required
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold"
                  />
                </Field>
                <Field icon={<Users className="size-4" />} label="Passengers">
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold"
                  />
                </Field>
                <Field icon={<Briefcase className="size-4" />} label="Luggage">
                  <input
                    type="number"
                    min={0}
                    max={16}
                    value={luggage}
                    onChange={(e) => setLuggage(Number(e.target.value))}
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold"
                  />
                </Field>
              </div>

              {/* Pickup extras — tour-specific */}
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<Plane className="size-4" />} label="Flight (optional)">
                  <input
                    value={flight}
                    onChange={(e) => setFlight(e.target.value)}
                    placeholder="e.g. BA1448"
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold placeholder:font-normal placeholder:text-foreground/40"
                  />
                </Field>
                <Field icon={<MapPin className="size-4" />} label="Hotel / drop-off (optional)">
                  <input
                    value={hotel}
                    onChange={(e) => setHotel(e.target.value)}
                    placeholder="Hotel name in Edinburgh"
                    className="w-full bg-transparent border-0 outline-none text-sm font-semibold placeholder:font-normal placeholder:text-foreground/40"
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
                <div className="space-y-1.5">
                  <Label htmlFor="tb-name">Full name</Label>
                  <Input id="tb-name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tb-email">Email</Label>
                  <Input
                    id="tb-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Final price confirmed by email. No card required now.
                </p>
                <Button
                  type="submit"
                  variant="gold"
                  className="rounded-full min-w-[160px]"
                  disabled={!canSubmit || submit.isPending}
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
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 h-[60px] rounded-2xl border border-border bg-background">
      <div className="w-8 h-8 rounded-full bg-[var(--surface)] shrink-0 flex items-center justify-center text-[var(--gold-ink)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 truncate">
          {label}
        </div>
        <div className="[&_input::-webkit-calendar-picker-indicator]:opacity-0 [&_input::-webkit-calendar-picker-indicator]:absolute [&_input::-webkit-calendar-picker-indicator]:inset-0 [&_input::-webkit-calendar-picker-indicator]:w-full [&_input::-webkit-calendar-picker-indicator]:h-full [&_input::-webkit-calendar-picker-indicator]:cursor-pointer relative">
          {children}
        </div>
      </div>
    </div>
  );
}
