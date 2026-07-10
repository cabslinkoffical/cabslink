import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { SelectedPlace } from "@/components/site/LocationAutocomplete";

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

// Mock LocationAutocomplete with a tiny controllable stub so we can drive
// DistanceCalculator's business logic without going through Places.
vi.mock("@/components/site/LocationAutocomplete", () => {
  const React = require("react");
  function LocationAutocomplete(props: {
    label: string;
    value: SelectedPlace | null;
    onChange: (p: SelectedPlace | null) => void;
  }) {
    const testId = props.label.toLowerCase().includes("pickup") ? "pickup" : "dest";
    return React.createElement(
      "div",
      null,
      React.createElement("span", { "data-testid": `${testId}-label` }, props.value?.label ?? ""),
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testId}-set-a`,
          onClick: () => props.onChange({ placeId: "PID_A", label: "Location A" }),
        },
        "set A"
      ),
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testId}-set-b`,
          onClick: () => props.onChange({ placeId: "PID_B", label: "Location B" }),
        },
        "set B"
      ),
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testId}-clear`,
          onClick: () => props.onChange(null),
        },
        "clear"
      )
    );
  }
  return { LocationAutocomplete };
});

const routeMock = vi.fn();
vi.mock("@/lib/route-distance.functions", () => ({
  calculateRouteDistance: (args: unknown) => routeMock(args),
}));

import { DistanceCalculator } from "@/components/site/DistanceCalculator";

beforeEach(() => {
  routeMock.mockReset();
});

describe("DistanceCalculator — swap", () => {
  it("clears the previous result and preserves the reversed selections", async () => {
    routeMock.mockResolvedValueOnce({ distanceMeters: 1609, distanceMiles: 1.0, durationSeconds: 60 });
    const user = userEvent.setup();
    render(<DistanceCalculator />);

    await user.click(screen.getByTestId("pickup-set-a"));
    await user.click(screen.getByTestId("dest-set-b"));
    await user.click(screen.getByRole("button", { name: /Calculate distance/i }));
    await screen.findByText(/1\.00 miles/);

    // Swap
    await user.click(screen.getByRole("button", { name: /Swap locations/i }));

    // Previous result cleared
    expect(screen.queryByText(/1\.00 miles/)).toBeNull();
    // Selections reversed
    expect(screen.getByTestId("pickup-label")).toHaveTextContent("Location B");
    expect(screen.getByTestId("dest-label")).toHaveTextContent("Location A");
    // The route fn is called with reversed ids on the next calculate
    routeMock.mockResolvedValueOnce({ distanceMeters: 1609, distanceMiles: 1.0, durationSeconds: 60 });
    await user.click(screen.getByRole("button", { name: /Calculate distance/i }));
    await waitFor(() =>
      expect(routeMock).toHaveBeenLastCalledWith({
        data: { pickupPlaceId: "PID_B", destinationPlaceId: "PID_A" },
      })
    );
  });
});

describe("DistanceCalculator — HTTP 429 friendly error + retry", () => {
  it("shows the rate-limit message and retries on click", async () => {
    routeMock
      .mockRejectedValueOnce(new Error("You've made too many requests. Please wait a moment and try again."))
      .mockResolvedValueOnce({ distanceMeters: 3218, distanceMiles: 2.0, durationSeconds: 120 });

    const user = userEvent.setup();
    render(<DistanceCalculator />);
    await user.click(screen.getByTestId("pickup-set-a"));
    await user.click(screen.getByTestId("dest-set-b"));
    await user.click(screen.getByRole("button", { name: /Calculate distance/i }));

    // Friendly message
    await screen.findByText(/too many requests/i);
    // Never leaks internal rate-limit details
    expect(screen.queryByText(/RATE_LIMIT|429|per minute|IP/i)).toBeNull();
    // Selections preserved on error
    expect(screen.getByTestId("pickup-label")).toHaveTextContent("Location A");
    expect(screen.getByTestId("dest-label")).toHaveTextContent("Location B");
    // Retry button visible for retryable errors
    const retry = screen.getByRole("button", { name: /Retry/i });
    await user.click(retry);
    await screen.findByText(/2\.00 miles/);
    expect(routeMock).toHaveBeenCalledTimes(2);
  });
});
