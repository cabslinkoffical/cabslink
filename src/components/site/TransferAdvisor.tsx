import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Car, LoaderCircle, Plane, Sparkles, Users, Luggage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { recommendAirportTransfer } from "@/lib/transfer-advisor.functions";
import type { AdvisorResult } from "@/lib/transfer-advisor";
import { FACT_TEXT } from "@/lib/site-facts";

export function TransferAdvisor() {
  const recommend = useServerFn(recommendAirportTransfer);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (running.current) return;
    running.current = true;
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await recommend({ data: { description } });
      setResult(response.result); setError(response.error ?? "");
    } catch {
      setError("We couldn't connect just now. Your trip details are still here. Please try again later or use the booking form.");
    } finally { running.current = false; setBusy(false); }
  }
  return (
    <Dialog>
      <div className="mt-3 flex justify-center">
        <DialogTrigger asChild>
          <Button variant="bookingDark" size="sm"><Sparkles className="size-4" />Help me choose a transfer</Button>
        </DialogTrigger>
      </div>
      <DialogContent className="z-[80] max-w-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl"><Plane className="size-5 text-gold-ink" />Your airport transfer</DialogTitle>
          <DialogDescription>AI recommendations from the Cabslink vehicle catalogue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="transfer-needs" className="block text-sm font-semibold">What do you need for your trip?</label>
          <Textarea id="transfer-needs" value={description} onChange={(event) => { setDescription(event.target.value); setResult(null); setError(""); }}
            placeholder="Edinburgh Airport to St Andrews, 4 passengers, 3 large suitcases and 2 cabin bags. We'd like a return transfer and a child seat."
            rows={4} minLength={10} maxLength={2000} required disabled={busy} className="resize-none" />
          <p className="text-xs text-muted-foreground">Your description is sent to an AI service. Please leave out names, email addresses, payment details and booking references.</p>
          <Button type="submit" disabled={busy || description.trim().length < 10} className="w-full">
            {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}
            {busy ? "Finding a suitable transfer…" : "Recommend my transfer"}
          </Button>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div aria-live="polite" aria-busy={busy}>
          {result && <div className="space-y-4 border-t pt-4">
            {result.outsideScope ? <p className="text-sm">For tours, hourly hire or other travel, please speak to our team about the right service.</p> : <>
              <h3 className="font-display text-lg font-semibold">{result.service}</h3>
              {(result.needs.pickup || result.needs.dropoff) && <p className="flex flex-wrap items-center gap-2 text-sm"><span>{result.needs.pickup || "Pickup to confirm"}</span><ArrowRight className="size-4 shrink-0" /><span>{result.needs.dropoff || "Destination to confirm"}</span></p>}
              {result.vehicle && <div className="border-l-2 border-gold pl-3">
                <p className="flex items-center gap-2 font-semibold"><Car className="size-4 text-gold-ink" />{result.vehicle.name}</p>
                <p className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Users className="size-4" />Up to {result.vehicle.capacity.passengers} passengers</span><span className="flex items-center gap-1"><Luggage className="size-4" />{result.vehicle.capacity.luggage} large bags</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Suggested class, subject to your confirmed details and availability.</p>
              </div>}
              {result.needsTeam && <p className="text-sm">No single listed vehicle fits these needs. Our team can help arrange a suitable option; do not book a smaller vehicle.</p>}
              {result.questions.length > 0 && <div><p className="mb-2 text-sm font-semibold">Details to confirm</p><ul className="list-disc space-y-1 pl-5 text-sm">{result.questions.map((question) => <li key={question}>{question}</li>)}</ul></div>}
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.needs.returnTrip && <li>Return transfer requested. Add both pickup dates and times when booking.</li>}
                {result.needs.childSeats && <li>Child seats requested. Choose the seat types and quantities when booking; seats are charged separately.</li>}
                {result.needs.meetGreet && <li>{FACT_TEXT.meetGreet}</li>}
                <li>Your fixed price is calculated in the booking form, not by AI. Confirm your addresses, UK pickup time, passengers and optional extras there. Flight number is optional.</li>
              </ul>
            </>}
            <Button asChild className="w-full"><Link to={result.needsTeam || result.outsideScope ? "/contact" : "/book"} search={result.needsTeam || result.outsideScope ? {} : { q: result.bookingQuery }}>{result.needsTeam || result.outsideScope ? "Speak to our team" : "Continue to my quote"}<ArrowRight className="size-4" /></Link></Button>
          </div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}