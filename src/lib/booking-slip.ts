/**
 * Builds a downloadable A4 booking slip (PDF) for a confirmed booking.
 * Rendered with jsPDF so the customer gets a real file they can save, email
 * or forward — no printer dialog involved. jsPDF is imported dynamically so
 * it never lands in the initial bundle.
 */
import { SITE } from "@/lib/site";

const NAVY: [number, number, number] = [14, 24, 44];
const GOLD: [number, number, number] = [222, 174, 37];
const MUTED: [number, number, number] = [110, 118, 132];

export type BookingSlipData = {
  bookingRef: string;
  status: string;
  statusLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  vehicleType: string;
  passengers: number;
  luggage: number;
  handLuggage?: number;
  distanceMiles?: number | null;
  flightNumber?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  price?: number | null;
  paymentStatus?: string | null;
  extras: string[];
  nextStep: string;
};

export async function downloadBookingSlip(b: BookingSlipData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 42;
  const innerW = W - M * 2;

  // ---- Header band -------------------------------------------------------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 108, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${SITE.name.toUpperCase()}  ·  E-TICKET`, M, 44);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(
    b.status === "confirmed" ? "Booking confirmed" : "Booking request received",
    M,
    70,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Status: ${b.statusLabel}`, M, 88);

  // Reference block, right aligned in the band
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("BOOKING REFERENCE", W - M, 52, { align: "right" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(b.bookingRef, W - M, 74, { align: "right" });

  let y = 148;

  const heading = (label: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M, y);
    y += 8;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(M, y, M + innerW, y);
    y += 18;
  };

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, M, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(value || "—", innerW - 150);
    doc.text(lines, M + 150, y);
    y += Math.max(20, lines.length * 14 + 6);
  };

  heading("Journey");
  row("Pickup", b.pickupAddress);
  row("Destination", b.dropoffAddress);
  row("Date", b.pickupDate);
  row("Time", b.pickupTime);
  if (b.distanceMiles != null) row("Distance", `${b.distanceMiles.toFixed(1)} miles`);
  if (b.flightNumber) row("Flight", b.flightNumber);

  y += 10;
  heading("Vehicle & passengers");
  row("Vehicle", b.vehicleType);
  row("Passengers", String(b.passengers));
  row("Luggage", `${b.luggage} case${b.luggage === 1 ? "" : "s"}`);
  row("Hand luggage", String(b.handLuggage ?? 0));
  if (b.extras.length > 0) row("Extras", b.extras.join(" · "));

  y += 10;
  heading("Passenger");
  row("Name", b.customerName);
  row("Phone", b.customerPhone);
  row("Email", b.customerEmail);

  y += 10;
  heading("Fare");
  row("Estimated fare", b.price != null ? `GBP ${b.price.toFixed(2)}` : "—");
  row("Payment", `${b.paymentStatus ?? "unpaid"} · pay on arrangement`);

  // ---- Next step note ----------------------------------------------------
  y += 6;
  doc.setFillColor(250, 246, 232);
  const noteLines = doc.splitTextToSize(b.nextStep, innerW - 24);
  const noteH = noteLines.length * 13 + 28;
  doc.rect(M, y, innerW, noteH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("WHAT HAPPENS NEXT", M + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(noteLines, M + 12, y + 34);

  // ---- Footer ------------------------------------------------------------
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 54, W, 54, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${SITE.name} · ${SITE.phoneUK} · ${SITE.email}`, M, H - 30);
  doc.setTextColor(...GOLD);
  doc.setFontSize(8);
  doc.text(
    `Keep this slip safe — quote ${b.bookingRef} in any correspondence.`,
    M,
    H - 15,
  );

  doc.save(`${SITE.name.replace(/\s+/g, "-")}-booking-${b.bookingRef}.pdf`);
}
