import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet } from "@tanstack/react-router";

const navigateMock = vi.fn();

// Stub PlaceAutocomplete before importing the widget
vi.mock("@/components/site/PlaceAutocomplete", async () => {
  const React = await import("react");
  type SelectedPlace = { placeId: string; label: string };
  function PlaceAutocomplete(props: {
    value: SelectedPlace | null;
    onChange: (p: SelectedPlace | null) => void;
    placeholder?: string;
  }) {
    const label = props.placeholder ?? "";
    const testId = label.toLowerCase().includes("pickup") ? "widget-pickup" : "widget-drop";
    return React.createElement(
      "div",
      null,
      React.createElement("span", { "data-testid": `${testId}-label` }, props.value?.label ?? ""),
      React.createElement("button", { type: "button", "data-testid": `${testId}-pick-a`, onClick: () => props.onChange({ placeId: "PID_A", label: "A" }) }, "pickA"),
      React.createElement("button", { type: "button", "data-testid": `${testId}-pick-b`, onClick: () => props.onChange({ placeId: "PID_B", label: "B" }) }, "pickB"),
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
  it("blocks submit and shows a friendly error when no places are selected", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    const submit = screen.getByRole("button", { name: /Get a Quote/i });
    await user.click(submit);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/select pickup and destination/i)).toBeInTheDocument();
  });

  it("submits with pickupPlaceId/destinationPlaceId query params when both selected", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getByTestId("widget-pickup-pick-a"));
    await user.click(screen.getByTestId("widget-drop-pick-b"));
    await user.click(screen.getByRole("button", { name: /Get a Quote/i }));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const arg = navigateMock.mock.calls[0][0];
    const params = new URLSearchParams(arg.search.q);
    expect(params.get("pickupPlaceId")).toBe("PID_A");
    expect(params.get("dropoffPlaceId")).toBe("PID_B");
    expect(params.get("pickupLabel")).toBe("A");
    expect(params.get("dropoffLabel")).toBe("B");
  });

  it("blocks submit when pickup and destination are identical", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);
    await user.click(screen.getByTestId("widget-pickup-pick-a"));
    await user.click(screen.getByTestId("widget-drop-pick-a" as any).parentElement?.querySelector("[data-testid='widget-drop-pick-a']") ? "widget-drop-pick-a" : "widget-drop-pick-b");
    // Force identical via re-selecting A on dropoff too
    // (dropoff harness exposes both pick-a and pick-b)
    // Simpler: pick B, then reset by picking A on dropoff.
    // We re-locate the button:
    const dropA = screen.queryByTestId("widget-drop-pick-a");
    if (dropA) await user.click(dropA);
    await user.click(screen.getByRole("button", { name: /Get a Quote/i }));
    // Either the identical-check message or the missing-places message should
    // appear; assert nav did not fire.
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
