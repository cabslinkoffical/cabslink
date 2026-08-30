/**
 * CSV export for admin bookings. Runs entirely client-side on rows already
 * loaded in the bookings table, so exporting a filtered view and exporting
 * everything share one column contract.
 */
export const BOOKING_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "booking_ref", label: "Reference" },
  { key: "status", label: "Status" },
  { key: "payment_status", label: "Payment status" },
  { key: "customer_name", label: "Customer" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "pickup_date", label: "Pickup date" },
  { key: "pickup_time", label: "Pickup time" },
  { key: "pickup_address", label: "Pickup address" },
  { key: "dropoff_address", label: "Dropoff address" },
  { key: "passengers", label: "Passengers" },
  { key: "luggage", label: "Luggage" },
  { key: "vehicle_type", label: "Vehicle" },
  { key: "driver_name", label: "Driver" },
  { key: "distance_miles", label: "Distance (miles)" },
  { key: "price", label: "Price" },
  { key: "flight_number", label: "Flight" },
  { key: "return_journey", label: "Return journey" },
  { key: "meet_greet", label: "Meet & greet" },
  { key: "child_seat", label: "Child seat" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created" },
  { key: "deleted_at", label: "Deleted" },
];

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bookingsToCsv(rows: any[]): string {
  const header = BOOKING_EXPORT_COLUMNS.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) =>
    BOOKING_EXPORT_COLUMNS.map((c) =>
      cell(c.key === "driver_name" ? r?.driver?.full_name : r?.[c.key]),
    ).join(","),
  );
  return [header, ...body].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM keeps Excel happy with UK addresses and £ signs.
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function bookingExportFilename(scope: string): string {
  const slug = scope.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bookings";
  return `cabslink-bookings-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}
