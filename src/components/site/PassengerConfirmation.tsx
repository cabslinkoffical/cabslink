import { useState } from "react";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PassengerConfirmation({ onConfirm, max = 60 }: { onConfirm: (count: number) => void; max?: number }) {
  const [value, setValue] = useState("");
  const count = Number(value);
  const valid = Number.isInteger(count) && count >= 1 && count <= max;
  return (
    <form className="mx-auto w-full max-w-lg space-y-6 py-8" onSubmit={(event) => { event.preventDefault(); if (valid) onConfirm(count); }}>
      <Users className="size-8 text-[var(--gold-ink)]" aria-hidden="true" />
      <h2 className="font-display text-2xl font-bold text-foreground">How many passengers are travelling?</h2>
      <div className="space-y-2">
        <Label htmlFor="confirm-passengers">Number of passengers, including children</Label>
        <Input id="confirm-passengers" type="number" min={1} max={max} step={1} value={value} onChange={(event) => setValue(event.target.value)} required />
      </div>
      <Button type="submit" variant="gold" disabled={!valid}>Confirm passengers <ArrowRight className="ml-2 size-4" /></Button>
    </form>
  );
}