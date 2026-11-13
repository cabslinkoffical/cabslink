/**
 * /book/tour — the day-tour booking wizard.
 *
 * Four steps: your day (pickup, date, hours), tour & stops, vehicle & price,
 * details & payment. Prices always come from the server (`quoteTour`); the
 * booking is saved unpaid and then paid with the same card checkout used for
 * transfers.
 */
import { normalizeHead } from "@/lib/seo/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DayBookingWizard } from "@/components/site/DayBookingWizard";

/**
 * `tour` deep-links a premade tour. The rest is the hand-off from the hourly
 * hire form: the customer has already told us where, when and for how long, so
 * they land here on the stops-and-tours step with everything filled in.
 */
const searchSchema = z.object({
  tour: z.string().trim().max(120).optional(),
  pickupPlaceId: z.string().trim().max(300).optional(),
  pickupLabel: z.string().trim().max(300).optional(),
  date: z.string().trim().max(20).optional(),
  time: z.string().trim().max(10).optional(),
  hours: z.coerce.number().int().min(1).max(24).optional(),
  passengers: z.coerce.number().int().min(1).max(80).optional(),
  luggage: z.coerce.number().int().min(0).max(80).optional(),
  endPlaceId: z.string().trim().max(300).optional(),
  endLabel: z.string().trim().max(300).optional(),
  stops: z.string().trim().max(6000).optional(),
});

export const Route = createFileRoute("/book/tour")({
  validateSearch: searchSchema,
  head: () => normalizeHead({
    meta: [
      { title: "Book a Private Day Tour in Scotland | Cabslink" },
      {
        name: "description",
        content:
          "Build your Scottish day tour by the hour: choose a tour or your own stops, pick your hours and vehicle, see an itemised price and pay online.",
      },
      { property: "og:title", content: "Book a Private Day Tour in Scotland | Cabslink" },
      {
        property: "og:description",
        content: "Hourly private day tours with included mileage, itemised pricing and secure online payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/book/tour" }],
  }),
  component: TourBookingRoute,
});

function TourBookingRoute() {
  const search = Route.useSearch();
  return <DayBookingWizard kind="tour" search={search} />;
}
