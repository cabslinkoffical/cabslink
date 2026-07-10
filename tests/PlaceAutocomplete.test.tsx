import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

const autocompleteMock = vi.fn();
vi.mock("@/lib/places.functions", () => ({
  placesAutocomplete: (args: unknown) => autocompleteMock(args),
}));

import { PlaceAutocomplete, type SelectedPlace } from "@/components/site/PlaceAutocomplete";

function Harness({ onChange }: { onChange?: (p: SelectedPlace | null) => void } = {}) {
  const [value, setValue] = React.useState<SelectedPlace | null>(null);
  return (
    <PlaceAutocomplete
      value={value}
      onChange={(p) => { setValue(p); onChange?.(p); }}
    />
  );
}

beforeEach(() => { autocompleteMock.mockReset(); });

describe("PlaceAutocomplete — editing invalidates selection", () => {
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
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ placeId: "ChIJ_edin" })));
    onChange.mockClear();
    await user.type(input, "x");
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("PlaceAutocomplete — stale response race", () => {
  it("shows only suggestions for the latest query when a slow earlier request resolves after", async () => {
    // Slow Edinburgh, fast Glasgow. Deliver Glasgow first, Edinburgh second.
    let resolveEdin: (v: any) => void = () => {};
    const edinPromise = new Promise((r) => (resolveEdin = r));
    let resolveGlas: (v: any) => void = () => {};
    const glasPromise = new Promise((r) => (resolveGlas = r));

    autocompleteMock.mockImplementation((args: any) => {
      const q = args?.data?.input ?? "";
      if (/edin/i.test(q)) return edinPromise;
      if (/glas/i.test(q)) return glasPromise;
      return Promise.resolve({ suggestions: [] });
    });

    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox") as HTMLInputElement;

    await user.type(input, "Edinburgh");
    // debounce (300ms) + microtask
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });

    await user.clear(input);
    await user.type(input, "Glasgow");
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });

    // Glasgow resolves first — its suggestions should render.
    await act(async () => {
      resolveGlas({ suggestions: [{ placeId: "ChIJ_glas", primary: "Glasgow Central", secondary: "Glasgow", full: "Glasgow Central, Glasgow", kind: "address" }] });
      await Promise.resolve();
    });
    await screen.findByRole("option", { name: /Glasgow Central/i });
    expect(screen.queryByRole("option", { name: /Edinburgh/i })).toBeNull();

    // Now the slow Edinburgh request resolves — its suggestions MUST NOT appear.
    await act(async () => {
      resolveEdin({ suggestions: [{ placeId: "ChIJ_edin", primary: "Edinburgh Airport", secondary: "Edinburgh", full: "Edinburgh Airport, Edinburgh", kind: "address" }] });
      await Promise.resolve();
    });
    expect(screen.queryByRole("option", { name: /Edinburgh/i })).toBeNull();
    // Only Glasgow suggestion remains selectable.
    expect(screen.getAllByRole("option").length).toBe(1);
  });

  it("clearing the field cancels open suggestions", async () => {
    autocompleteMock.mockResolvedValue({
      suggestions: [{ placeId: "ChIJ_x", primary: "X", secondary: "", full: "X", kind: "address" }],
    });
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "Xy");
    await screen.findByRole("option", { name: /^X/ });
    await user.clear(input);
    await waitFor(() => expect(screen.queryByRole("option")).toBeNull());
  });
});

describe("PlaceAutocomplete — attribution", () => {
  it("renders the Powered by Google attribution when suggestions are shown", async () => {
    autocompleteMock.mockResolvedValue({
      suggestions: [{ placeId: "ChIJ_x", primary: "X", secondary: "", full: "X", kind: "address" }],
    });
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole("combobox"), "Xy");
    await screen.findByRole("option");
    expect(screen.getByText(/Powered by Google/i)).toBeInTheDocument();
  });
  it("omits its own attribution when hideAttribution is set (parent renders one)", async () => {
    autocompleteMock.mockResolvedValue({
      suggestions: [{ placeId: "ChIJ_x", primary: "X", secondary: "", full: "X", kind: "address" }],
    });
    const user = userEvent.setup();
    function H() {
      const [v, setV] = React.useState<SelectedPlace | null>(null);
      return <PlaceAutocomplete hideAttribution value={v} onChange={setV} />;
    }
    render(<H />);
    await user.type(screen.getByRole("combobox"), "Xy");
    await screen.findByRole("option");
    expect(screen.queryByText(/Powered by Google/i)).toBeNull();
  });
});
