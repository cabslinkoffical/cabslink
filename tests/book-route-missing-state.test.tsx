import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  createRouter, createRootRoute, createRoute, RouterProvider, createMemoryHistory, Outlet,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// PlaceAutocomplete needs a lightweight stub because the real one calls a
// server function on mount inside the edit dialog.
vi.mock("@/components/site/PlaceAutocomplete", async () => {
  const R = await import("react");
  type SP = { placeId: string; label: string };
  function PlaceAutocomplete(props: { id?: string; value: SP | null; onChange: (p: SP | null) => void }) {
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

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));

import { Route as BookRoute } from "@/routes/book";

function renderAt(url: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const route = (BookRoute as any).update({ getParentRoute: () => rootRoute });
  const routeTree = rootRoute.addChildren([route]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    defaultPendingMs: 0,
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
}

beforeEach(() => calcMock.mockReset());

describe("/book — missing-location state (router-aware)", () => {
  it("does not call calculateQuotes and shows the empty-state when no Place IDs", async () => {
    renderAt("/book");
    // Empty-state text (see book.tsx)
    await screen.findByText(/Enter your journey|journey first|choose your locations/i);
    expect(calcMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Calculating quotes/i)).toBeNull();
  });

  it("shows empty-state when a label is present but Place ID missing (incomplete free text)", async () => {
    renderAt("/book?q=" + encodeURIComponent("pickupLabel=Somewhere&dropoffLabel=Elsewhere"));
    await screen.findByText(/Enter your journey|journey first|choose your locations/i);
    expect(calcMock).not.toHaveBeenCalled();
  });

  it("shows empty-state when pickup and destination Place IDs are identical", async () => {
    const q = new URLSearchParams({
      pickupPlaceId: "ChIJ_same", pickupLabel: "Same",
      dropoffPlaceId: "ChIJ_same", dropoffLabel: "Same",
    }).toString();
    renderAt(`/book?q=${encodeURIComponent(q)}`);
    await screen.findByText(/Enter your journey|journey first|choose your locations/i);
    expect(calcMock).not.toHaveBeenCalled();
  });
});
