/**
 * Custom-tour builder — public server functions (thin RPC wrappers).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";
import {
  matchTourByRouteImpl,
  searchPoiOptionsImpl,
  corridorPoiOptionsImpl,
  type TourRouteMatch,
  type PoiOption,
} from "@/lib/custom-tour.server";

export type { TourRouteMatch, PoiOption };

export const matchTourByRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ pickup_place_id: placeIdSchema, destination_place_id: placeIdSchema })
      .parse(input),
  )
  .handler(async ({ data }): Promise<TourRouteMatch> =>
    matchTourByRouteImpl(data.pickup_place_id, data.destination_place_id),
  );

export const searchPoiOptions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ q: z.string().trim().min(2).max(80), limit: z.number().int().min(1).max(30).optional() })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PoiOption[]> =>
    searchPoiOptionsImpl(data.q, data.limit ?? 12),
  );

export const corridorPoiOptions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        pickup_place_id: placeIdSchema,
        destination_place_id: placeIdSchema,
        radius_miles: z.number().min(1).max(60).optional(),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ pois: PoiOption[]; corridor: boolean }> =>
    corridorPoiOptionsImpl(
      data.pickup_place_id,
      data.destination_place_id,
      data.radius_miles ?? 20,
      data.limit ?? 24,
    ),
  );
