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
  it("blocks submit and shows validation when no places are selected", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getAllByRole("button", { name: /Search/i })[0]);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Select a pickup location from the suggestions/i)).toBeTruthy();
  });

  it("submits with pickupPlaceId/dropoffPlaceId query params when both selected", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getByTestId("widget-pickup-pick-a"));
    await user.click(screen.getByTestId("widget-dropoff-pick-b"));
    const today = new Date();
    const d = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, d);
    if (!timeInput.value) await user.type(timeInput, "10:00");
    // Passengers + luggage are required — open the occupancy popover and set them
    await user.click(screen.getByRole("button", { name: /Passengers/i }));
    await user.click(screen.getByLabelText(/Increase Passengers/i));
    await user.click(screen.getByLabelText(/Increase Luggage/i));
    await user.click(screen.getAllByRole("button", { name: /Search/i })[0]);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const arg = navigateMock.mock.calls[0][0];
    const params = new URLSearchParams(arg.search.q);
    expect(params.get("pickupPlaceId")).toBe("PID_A");
    expect(params.get("dropoffPlaceId")).toBe("PID_B");
    expect(params.get("pickupLabel")).toBe("A");
    expect(params.get("dropoffLabel")).toBe("B");
    expect(Number(params.get("passengers"))).toBeGreaterThanOrEqual(1);
    expect(Number(params.get("luggage"))).toBeGreaterThanOrEqual(0);
  });


  it("blocks submit when pickup and destination are identical", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getByTestId("widget-pickup-pick-a"));
    await user.click(screen.getByTestId("widget-dropoff-pick-a"));
    await user.click(screen.getAllByRole("button", { name: /Search/i })[0]);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/cannot be the same as pickup/i)).toBeTruthy();
  });
});

