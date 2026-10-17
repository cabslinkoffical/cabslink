import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Stops and a return journey must extend the one booking sheet, never open a
// second white card below it (owner rule: "not create a new form").
vi.mock("@/components/site/PlaceAutocomplete", async () => {
  const React = await import("react");
  type SelectedPlace = { placeId: string; label: string };
  function PlaceAutocomplete(props: {
    id?: string;
    value: SelectedPlace | null;
    onChange: (p: SelectedPlace | null) => void;
    placeholder?: string;
  }) {
    return React.createElement("input", {
      placeholder: props.placeholder ?? "",
      readOnly: true,
      "data-testid": props.id ? `${props.id}-input` : "stop-input",
    });
  }
  return { PlaceAutocomplete };
});

vi.mock("@tanstack/react-router", async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, useNavigate: () => vi.fn() };
});

import { BookingWidget } from "@/components/site/BookingWidget";

function sheetAndForm() {
  const form = document.querySelector("form") as HTMLFormElement;
  const cards = Array.from(form.children).filter(
    (el) => el.tagName === "DIV" && el.classList.contains("bg-white"),
  ) as HTMLElement[];
  return { form, cards };
}

describe("Booking form extends one sheet", () => {
  it("keeps exactly one white card, with stops and return inside it", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);

    let { form, cards } = sheetAndForm();
    expect(cards.length).toBe(1);
    const sheet = cards[0];

    await user.click(screen.getByRole("button", { name: /Add stop/i }));
    await user.click(screen.getByRole("button", { name: /Add stop/i }));
    await user.click(screen.getByRole("button", { name: /Add return/i }));

    ({ form, cards } = sheetAndForm());
    expect(cards.length).toBe(1);

    const stopInputs = form.querySelectorAll('input[placeholder="Add stop"]');
    expect(stopInputs.length).toBe(2);
    stopInputs.forEach((input) => expect(sheet.contains(input)).toBe(true));

    const returnDate = form.querySelector('input[aria-label="Return date"]');
    expect(returnDate).not.toBeNull();
    expect(sheet.contains(returnDate)).toBe(true);

    const addStop = screen.getByRole("button", { name: /Add stop/i });
    expect(sheet.contains(addStop)).toBe(true);

    const search = screen
      .getAllByRole("button")
      .find((b) => /search/i.test(b.textContent ?? ""));
    expect(search && sheet.contains(search)).toBe(true);
  });
});
