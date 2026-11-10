import { buildBookingDetails, type BookingDetailSource } from "@/lib/booking-details";
import { formatTime12 } from "@/lib/time-format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium text-sm break-words">{value}</div>
    </div>
  );
}

/** Everything the customer entered for this trip, shown the same way in every admin view. */
export function BookingTripDetails({ booking, showJourney = false }: { booking: BookingDetailSource; showJourney?: boolean }) {
  const d = buildBookingDetails(booking);
  const vehicleCount = Number(booking.vehicle_count ?? 1);
  return (
    <div className="space-y-3">
      {showJourney && (booking.pickup_address || booking.dropoff_address) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {booking.pickup_address && <Row label="Pickup" value={booking.pickup_address} />}
          {booking.dropoff_address && <Row label="Drop-off" value={booking.dropoff_address} />}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Row
          label="Return journey"
          value={d.returnLeg ? `Yes${d.returnLeg.date ? ` · ${d.returnLeg.date}` : ""}${d.returnLeg.time ? ` at ${d.returnLeg.time}` : ""}` : "No"}
        />
        {showJourney && booking.pickup_time && <Row label="Pickup" value={`${booking.pickup_date ?? ""} ${formatTime12(booking.pickup_time)}`.trim()} />}
        {booking.vehicle_type && <Row label="Vehicle" value={booking.vehicle_type} />}
        {vehicleCount > 1 && <Row label="Number of vehicles" value={String(vehicleCount)} />}
        {d.hours != null && <Row label="Hours booked" value={String(d.hours)} />}
        {showJourney && <Row label="Passengers" value={String(booking.passengers ?? 0)} />}
        <Row label="Suitcases / hand bags" value={`${booking.luggage ?? 0} / ${booking.hand_luggage ?? 0}`} />
        {booking.flight_number && <Row label="Flight" value={booking.flight_number} />}
        <Row label="Meet & greet" value={d.meetGreet ? "Yes" : "No"} />
        <Row label="Child seats" value={d.childSeats ?? "None"} />
        {d.cover && <Row label="Cancellation cover" value={d.cover} />}
      </div>
      {d.stops.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Stops ({d.stops.length})</div>
          <ol className="list-decimal pl-5 space-y-0.5 text-sm">{d.stops.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}
      {d.vehicles.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Vehicles</div>
          <ol className="list-decimal pl-5 space-y-0.5 text-sm">
            {d.vehicles.map((v, i) => (
              <li key={i}>
                {v.name}
                {v.passengers != null ? ` · ${v.passengers} passengers` : ""}
                {v.luggage != null ? ` · ${v.luggage} cases` : ""}
                {v.price != null ? ` · £${v.price.toFixed(2)}` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
      {d.extras.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Other extras</div>
          <ul className="list-disc pl-5 space-y-0.5 text-sm">{d.extras.map((e) => <li key={e.name}>{e.name}{e.quantity > 1 ? ` × ${e.quantity}` : ""}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
