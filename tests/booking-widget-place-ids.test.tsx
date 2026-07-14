import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const navigateMock = vi.fn();

// Stub PlaceAutocomplete — distinguishes fields by props.id
vi.mock("@/components/site/PlaceAutocomplete", async () => {
  const React = await import("react");
  type SelectedPlace = { placeId: string; label: string };
  function PlaceAutocomplete(props: {
    id?: string;
    value: SelectedPlace | null;
    onChange: (p: SelectedPlace | null) => void;
  }) {
    const key = props.id ?? "unknown";
    return React.createElement(
      "div",
      null,
      React.createElement("span", { "data-testid": `${key}-label` }, props.value?.label ?? ""),
      React.createElement("button", { type: "button", "data-testid": `${key}-pick-a`, onClick: () => props.onChange({ placeId: "PID_A", label: "A" }) }, "pickA"),
      React.createElement("button", { type: "button", "data-testid": `${key}-pick-b`, onClick: () => props.onChange({ placeId: "PID_B", label: "B" }) }, "pickB"),
    );
  }
  return { PlaceAutocomplete };
});

vi.mock("@tanstack/react-router", async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { BookingWidget } from "@/components/site/BookingWidget";

beforeEach(() => navigateMock.mockReset());

describe("BookingWidget — Place-ID gating", () => {
  it("keeps Book Now disabled and blocks submit when no places are selected", async () => {
    render(<BookingWidget />);
    const submit = screen.getByRole("button", { name: /Book Now/i });
    expect(submit).toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("submits with pickupPlaceId/destinationPlaceId query params when both selected", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getByTestId("widget-pickup-pick-a"));
    await user.click(screen.getByTestId("widget-dropoff-pick-b"));
    await user.click(screen.getByRole("button", { name: /Book Now/i }));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const arg = navigateMock.mock.calls[0][0];
    const params = new URLSearchParams(arg.search.q);
    expect(params.get("pickupPlaceId")).toBe("PID_A");
    expect(params.get("dropoffPlaceId")).toBe("PID_B");
    expect(params.get("pickupLabel")).toBe("A");
    expect(params.get("dropoffLabel")).toBe("B");
  });

  it("keeps Book Now disabled when pickup and destination are identical", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getByTestId("widget-pickup-pick-a"));
    await user.click(screen.getByTestId("widget-dropoff-pick-a"));
    const submit = screen.getByRole("button", { name: /Book Now/i });
    expect(submit).toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
