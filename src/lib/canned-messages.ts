// Client-safe catalogue of pre-written customer emails used by the admin
// console (Messages + Bookings). Bodies use {{placeholder}} tokens that are
// filled from the message/booking record before sending.

export type CannedScope = "message" | "booking";

export type CannedTemplate = {
  id: string;
  label: string;
  scope: CannedScope[];
  subject: string;
  body: string;
  /** Requires a reason/detail note from the admin before sending. */
  needsReason?: boolean;
};

export const CANNED_TEMPLATES: CannedTemplate[] = [
  {
    id: "enquiry_ack",
    label: "Thanks — we received your enquiry",
    scope: ["message"],
    subject: "Thanks for contacting Cabslink",
    body:
      "Hi {{name}},\n\n" +
      "Thank you for getting in touch with Cabslink. We have received your enquiry and a member of our team is looking into it now.\n\n" +
      "We normally reply within a few hours. If your journey is within the next 24 hours, please call us so we can help straight away.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "quote_sent",
    label: "Your quote / availability",
    scope: ["message"],
    subject: "Your Cabslink quote",
    body:
      "Hi {{name}},\n\n" +
      "Thank you for your enquiry. Here are the details for the journey you asked about:\n\n" +
      "{{reason}}\n\n" +
      "If you are happy to go ahead, reply to this email or book online and we will reserve the vehicle for you.\n\n" +
      "Kind regards,\nThe Cabslink Team",
    needsReason: true,
  },
  {
    id: "more_info",
    label: "We need a few more details",
    scope: ["message"],
    subject: "A few more details for your Cabslink journey",
    body:
      "Hi {{name}},\n\n" +
      "Thank you for contacting Cabslink. To give you an accurate price we need a little more information:\n\n" +
      "{{reason}}\n\n" +
      "Reply to this email with the details and we will come straight back to you.\n\n" +
      "Kind regards,\nThe Cabslink Team",
    needsReason: true,
  },
  {
    id: "resolved",
    label: "Enquiry resolved / closing note",
    scope: ["message"],
    subject: "Your Cabslink enquiry",
    body:
      "Hi {{name}},\n\n" +
      "We believe your enquiry is now fully resolved. Thank you for choosing Cabslink.\n\n" +
      "If anything else comes up, just reply to this email and we will pick it up right away.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },

  // ---------------- Booking-scoped ----------------
  {
    id: "booking_confirmed",
    label: "Booking confirmed",
    scope: ["booking"],
    subject: "Your booking {{ref}} is confirmed",
    body:
      "Hi {{name}},\n\n" +
      "Good news — your booking {{ref}} is confirmed.\n\n" +
      "Pickup: {{pickup}}\nDestination: {{dropoff}}\nDate & time: {{date}} at {{time}}\nVehicle: {{vehicle}}\n\n" +
      "Your driver's details will be sent to you shortly before pickup. Please keep this reference handy: {{ref}}.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "tour_confirmed",
    label: "Tour booked & confirmed",
    scope: ["booking", "message"],
    subject: "Your tour with Cabslink is booked",
    body:
      "Hi {{name}},\n\n" +
      "Your tour is booked and confirmed. Reference: {{ref}}.\n\n" +
      "Pickup: {{pickup}}\nDate & time: {{date}} at {{time}}\nVehicle: {{vehicle}}\n\n" +
      "Your driver will meet you at the pickup point and will look after you for the whole day. Please bring comfortable shoes and a jacket — Scottish weather likes to surprise.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "driver_assigned",
    label: "Driver assigned",
    scope: ["booking"],
    subject: "Driver assigned for booking {{ref}}",
    body:
      "Hi {{name}},\n\n" +
      "Your driver has been assigned for booking {{ref}} on {{date}} at {{time}}.\n\n" +
      "Pickup: {{pickup}}\nDestination: {{dropoff}}\n\n" +
      "We will send the driver's name and contact number shortly before your pickup time.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "on_the_way",
    label: "Driver is on the way",
    scope: ["booking"],
    subject: "Your driver is on the way — {{ref}}",
    body:
      "Hi {{name}},\n\n" +
      "Your driver is on the way for booking {{ref}}. Please make your way to the pickup point:\n\n" +
      "{{pickup}}\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "booking_cancelled",
    label: "Booking / tour cancelled (with reason)",
    scope: ["booking", "message"],
    subject: "Your booking {{ref}} has been cancelled",
    body:
      "Hi {{name}},\n\n" +
      "Your booking {{ref}} for {{date}} at {{time}} has been cancelled.\n\n" +
      "Reason: {{reason}}\n\n" +
      "If this was not expected, or if you would like to rebook for another date, simply reply to this email and we will arrange it for you.\n\n" +
      "Kind regards,\nThe Cabslink Team",
    needsReason: true,
  },
  {
    id: "customer_cancelled",
    label: "Cancelled at customer's request",
    scope: ["booking", "message"],
    subject: "Cancellation confirmed — {{ref}}",
    body:
      "Hi {{name}},\n\n" +
      "As requested, we have cancelled your booking {{ref}} for {{date}}. Nothing further is required from you.\n\n" +
      "We are sorry you will not be travelling with us this time, and we would be delighted to help whenever your plans change.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "payment_reminder",
    label: "Payment reminder",
    scope: ["booking"],
    subject: "Payment outstanding for booking {{ref}}",
    body:
      "Hi {{name}},\n\n" +
      "Your booking {{ref}} for {{date}} at {{time}} is reserved, but we have not yet received payment.\n\n" +
      "{{reason}}\n\n" +
      "Please reply to this email if you have any questions about payment.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "booking_completed",
    label: "Thank you after the journey",
    scope: ["booking"],
    subject: "Thank you for travelling with Cabslink",
    body:
      "Hi {{name}},\n\n" +
      "Thank you for travelling with Cabslink — we hope your journey was comfortable.\n\n" +
      "If you have a moment, we would really appreciate a short review. And whenever you need us again, we are one click away.\n\n" +
      "Kind regards,\nThe Cabslink Team",
  },
  {
    id: "custom",
    label: "Custom message (write your own)",
    scope: ["message", "booking"],
    subject: "A message from Cabslink",
    body: "Hi {{name}},\n\n{{reason}}\n\nKind regards,\nThe Cabslink Team",
    needsReason: true,
  },
];

export function templatesForScope(scope: CannedScope): CannedTemplate[] {
  return CANNED_TEMPLATES.filter((t) => t.scope.includes(scope));
}

export function getCannedTemplate(id: string): CannedTemplate | undefined {
  return CANNED_TEMPLATES.find((t) => t.id === id);
}

export type CannedVars = {
  name?: string | null;
  ref?: string | null;
  pickup?: string | null;
  dropoff?: string | null;
  date?: string | null;
  time?: string | null;
  vehicle?: string | null;
  reason?: string | null;
};

/** Replace {{token}} placeholders. Unknown/empty tokens collapse away. */
export function renderCanned(text: string, vars: CannedVars): string {
  return text
    .replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
      const v = (vars as Record<string, unknown>)[key];
      return v == null || v === "" ? "" : String(v);
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
