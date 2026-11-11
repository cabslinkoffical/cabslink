/** Shared validation for the customer editor and authoritative booking checks. */
export function returnScheduleProblem(d: {
  return_journey?: boolean; pickupDate: string; pickupTime: string;
  returnDate?: string | null; returnTime?: string | null;
}): string | null {
  if (!d.return_journey) return null;
  if (!d.returnDate || !d.returnTime) return "Please choose a date and time for your return journey.";
  if (`${d.returnDate}T${d.returnTime}` <= `${d.pickupDate}T${d.pickupTime}`) {
    return "Your return journey must be after your outbound pickup.";
  }
  return null;
}

/** Quote-card base stays single-leg; extras and cover are applied separately. */
export function journeyFare(singleLegFare: number, quantity: number, returnJourney: boolean): number {
  return Number((singleLegFare * quantity * (returnJourney ? 2 : 1)).toFixed(2));
}