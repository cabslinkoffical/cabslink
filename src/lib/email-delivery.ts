/** Resend's latest event; opens/clicks also prove a message was delivered. */
export function deliveryEvent(value: unknown): "delivered" | "bounced" | "complained" | null {
  if (value === "bounced" || value === "complained") return value;
  if (value === "delivered" || value === "opened" || value === "clicked") return "delivered";
  return null;
}