import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  createRouter, RouterProvider, createMemoryHistory,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// PlaceAutocomplete calls a server function on mount; the booking wizard does
// not need it for this check, so it stays a plain input.
vi.mock("@/components/site/PlaceAutocomplete", async () => {
  const R = await import("react");
  function PlaceAutocomplete(props: { id?: string; value: any; onChange: (p: any) => void }) {
    return R.createElement("input", {
      "data-testid": `pa-${props.id ?? "x"}`,
      value: props.value?.label ?? "",
      readOnly: true,
    });
  }
  return { PlaceAutocomplete };
});

const calcMock = vi.fn();
vi.mock("@/lib/pricing.functions", () => ({
  calculateQuotes: (args: any) => calcMock(args),
  createBooking: vi.fn(),
}));

// The vehicle step hides any class the public catalogue does not list, so the
// catalogue is stubbed with the three classes this journey quotes.
vi.mock("@/lib/vehicle-classes.functions", () => ({
  listPublicVehicleClasses: async () => [
    { id: "cls-saloon", name: "Saloon", slug: "saloon", pricing_vehicle_id: "veh-saloon", quote_on_request: false, hero_image: null, passengers: 3, large_luggage: 2, models: [] },
    { id: "cls-estate", name: "Estate Car", slug: "estate-car", pricing_vehicle_id: "veh-estate", quote_on_request: false, hero_image: null, passengers: 4, large_luggage: 4, models: [] },
    { id: "cls-coach", name: "24-Seater Coach", slug: "coach", pricing_vehicle_id: "veh-coach", quote_on_request: true, hero_image: null, passengers: 24, large_luggage: 24, models: [] },
  ],
}));

vi.mock("@tanstack/react-start", () => {
  const chain = (state: any = {}) => ({
    middleware: (_m: any) => chain(state),
    inputValidator: (v: any) => chain({ ...state, validator: v }),
    handler: (h: any) => async (args: any) => h({ data: args?.data, context: {} }),
  });
  return {
    useServerFn: (fn: any) => fn,
    createServerFn: (_o?: any) => chain(),
    createMiddleware: (_o?: any) => ({ server: () => ({}), client: () => ({}) }),
  };
});

vi.mock("@/components/site/SiteLayout", async () => {
  const R = await import("react");
  return { SiteLayout: ({ children }: any) => R.createElement("div", null, children) };
});

import { routeTree } from "@/routeTree.gen";

const card = (vehicleId: string, name: string, price: number, quoteOnRequest: boolean) => ({
  vehicleId,
  name,
  category: "Executive",
  imageUrl: "",
  passengers: 8,
  luggage: 8,
  handLuggage: 8,
  distanceMiles: 42,
  finalPrice: price,
  breakdown: [],
  pricing: {},
  snapshot: {},
  fixedPriceApplied: false,
  pricingSource: "meter",
  classId: `cls-${vehicleId.split("-")[1]}`,
  classSlug: vehicleId.split("-")[1],
  classDisplayOrder: 1,
  quoteOnRequest,
  unavailable: false,
  unavailableMessage: null,
});

async function renderAt(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    defaultPendingMs: 0,
    context: { queryClient: qc } as any,
  });
  await router.load();
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
}

beforeEach(() => calcMock.mockReset());

describe("Booking vehicle list order", () => {
  it("lists quote-on-request classes after every priced class, whatever their price", async () => {
    // The coach carries no price (0) and would otherwise lead a cheapest-first list.
    calcMock.mockResolvedValue({
      quotes: [
        card("veh-coach", "24-Seater Coach", 0, true),
        card("veh-saloon", "Saloon", 100, false),
        card("veh-estate", "Estate Car", 120, false),
      ],
      distanceMiles: 42,
      durationMinutes: 55,
    });
    const q = new URLSearchParams({
      pickupPlaceId: "PID_A", pickupLabel: "Edinburgh Airport",
      dropoffPlaceId: "PID_B", dropoffLabel: "Loch Lomond",
      date: "2026-12-01", time: "10:00", passengers: "2",
    }).toString();
    await renderAt(`/book?q=${encodeURIComponent(q)}`);

    const headings = await screen.findAllByRole("heading", { level: 3 });
    const shown = headings
      .map((h) => h.textContent ?? "")
      .filter((t) => ["Saloon", "Estate Car", "24-Seater Coach"].includes(t));
    expect(shown).toEqual(["Saloon", "Estate Car", "24-Seater Coach"]);
  });
});
