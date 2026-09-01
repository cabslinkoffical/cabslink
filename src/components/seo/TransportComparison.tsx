/**
 * "How to get there" comparison for journey pages.
 *
 * Renders every realistic way to make a journey — bus, coach, train, tram,
 * park-and-ride, private car — with the operator's own published fares and
 * times. Data comes from `src/lib/seo/transport-modes.ts`, which omits any
 * mode it cannot verify. This section deliberately says when a public option
 * is cheaper or faster than a car.
 */
import { Bus, Car, Info, TrainFront, ExternalLink, ParkingCircle, Clock, Ticket } from "lucide-react";
import type { JourneyTransportComparison, TransportModeKind } from "@/lib/seo/transport-modes";

const ICONS: Record<TransportModeKind, typeof Bus> = {
  bus: Bus,
  coach: Bus,
  train: TrainFront,
  tram: TrainFront,
  "park-and-ride": ParkingCircle,
  car: Car,
};

const KIND_LABEL: Record<TransportModeKind, string> = {
  bus: "Bus",
  coach: "Coach",
  train: "Train",
  tram: "Tram",
  "park-and-ride": "Park & ride",
  car: "Private car",
};

function formatChecked(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function TransportComparison({
  data,
  routeName,
}: {
  data: JourneyTransportComparison;
  routeName: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold-ink)]">
        Every way to make this journey
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
        How to get from {routeName}
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{data.verdict}</p>

      {/* Desktop table */}
      <div className="mt-8 hidden overflow-hidden rounded-2xl border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Option</th>
              <th scope="col" className="px-4 py-3 font-semibold">Fare</th>
              <th scope="col" className="px-4 py-3 font-semibold">Journey time</th>
              <th scope="col" className="px-4 py-3 font-semibold">Frequency</th>
              <th scope="col" className="px-4 py-3 font-semibold">Where it stops &amp; the catch</th>
            </tr>
          </thead>
          <tbody>
            {data.options.map((o) => {
              const Icon = ICONS[o.kind];
              return (
                <tr key={`${o.operator}-${o.service}`} className="border-t align-top">
                  <td className="px-4 py-4">
                    <span className="flex items-start gap-2 font-medium">
                      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                      <span>
                        {o.service}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {KIND_LABEL[o.kind]} · {o.operator}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold tabular-nums">{o.fare}</td>
                  <td className="px-4 py-4 tabular-nums">{o.duration}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {o.frequency}
                    {o.firstLast && <span className="block text-xs">{o.firstLast}</span>}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    <span className="block">{o.stops}</span>
                    <span className="mt-1 block text-xs">{o.tradeOff}</span>
                    <a
                      href={o.source}
                      target="_blank"
                      rel="noopener nofollow"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--gold-ink)] hover:underline"
                    >
                      Operator info <ExternalLink className="size-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="mt-8 grid gap-4 md:hidden">
        {data.options.map((o) => {
          const Icon = ICONS[o.kind];
          return (
            <li key={`${o.operator}-${o.service}`} className="rounded-2xl border bg-background p-5">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                <div>
                  <h3 className="font-display text-base font-semibold">{o.service}</h3>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABEL[o.kind]} · {o.operator}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Ticket className="size-3" /> Fare
                  </dt>
                  <dd className="font-semibold tabular-nums">{o.fare}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> Time
                  </dt>
                  <dd className="font-semibold tabular-nums">{o.duration}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">{o.frequency}</p>
              {o.firstLast && <p className="text-xs text-muted-foreground">{o.firstLast}</p>}
              <p className="mt-3 text-sm text-muted-foreground">{o.stops}</p>
              <p className="mt-1 text-xs text-muted-foreground">{o.tradeOff}</p>
              <a
                href={o.source}
                target="_blank"
                rel="noopener nofollow"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--gold-ink)] hover:underline"
              >
                Operator info <ExternalLink className="size-3" />
              </a>
            </li>
          );
        })}
      </ul>

      {data.carSuitsWhen.length > 0 && (
        <div className="mt-8 rounded-2xl border bg-muted/40 p-6">
          <h3 className="font-display text-lg font-semibold">When a private car is the right answer</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {data.carSuitsWhen.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <Car className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Fares and frequencies above are the operators' own published figures, last checked on{" "}
          {formatChecked(data.lastChecked)}. Operator prices and timetables change — check the
          operator's site before you travel.
        </span>
      </p>
    </div>
  );
}
