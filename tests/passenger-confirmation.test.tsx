import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PassengerConfirmation } from "@/components/site/PassengerConfirmation";

describe("Passenger confirmation", () => {
  it("requires an explicit valid count and returns it on confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    render(<PassengerConfirmation onConfirm={confirm} />);
    const input = screen.getByRole("spinbutton");
    const button = screen.getByRole("button", { name: "Confirm passengers" });
    expect(button).toBeDisabled();
    await user.type(input, "0");
    expect(button).toBeDisabled();
    await user.clear(input);
    await user.type(input, "6");
    await user.click(button);
    expect(confirm).toHaveBeenCalledWith(6);
  });
});