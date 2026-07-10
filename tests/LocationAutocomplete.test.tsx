import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock useServerFn to invoke functions directly.
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

const autocompleteMock = vi.fn();
vi.mock("@/lib/places.functions", () => ({
  placesAutocomplete: (args: unknown) => autocompleteMock(args),
}));

import { LocationAutocomplete, type SelectedPlace } from "@/components/site/LocationAutocomplete";

function Harness({ onChange }: { onChange: (p: SelectedPlace | null) => void }) {
  const [value, setValue] = React.useState<SelectedPlace | null>(null);
  return (
    <LocationAutocomplete
      label="Pickup"
      value={value}
      onChange={(p) => { setValue(p); onChange(p); }}
    />
  );
}

beforeEach(() => {
  autocompleteMock.mockReset();
});

describe("LocationAutocomplete — editing invalidates selection", () => {
  it("clears the stored Place ID as soon as the user edits after selecting", async () => {
    autocompleteMock.mockResolvedValue({
      suggestions: [
        { placeId: "ChIJ_edin", primary: "Edinburgh Airport", secondary: "Edinburgh", full: "Edinburgh Airport, Edinburgh", kind: "address" },
      ],
    });

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;

    await user.type(input, "Edinburgh");
    const option = await screen.findByRole("option", { name: /Edinburgh Airport/i });
    await user.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ placeId: "ChIJ_edin" })
      );
    });
    onChange.mockClear();

    // Edit the previously selected value — Place ID must be invalidated.
    await user.type(input, "x");
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
