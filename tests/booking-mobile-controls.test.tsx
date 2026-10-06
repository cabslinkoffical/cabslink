import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BookingSummaryDisclosure } from "@/components/site/BookingSummaryDisclosure";
import { useBookingStepScroll } from "@/components/site/useBookingStepScroll";

describe("Mobile booking controls", () => {
  it("starts collapsed, toggles the summary, and edits without expanding", () => {
    const edit = vi.fn();
    render(<BookingSummaryDisclosure onEdit={edit}><p>Journey details</p></BookingSummaryDisclosure>);
    const toggle = screen.getByRole("button", { name: /Trip summary/i });
    const content = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveClass("hidden", "lg:block");
    fireEvent.click(screen.getByRole("button", { name: "Edit booking" }));
    expect(edit).toHaveBeenCalledOnce();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(content).toHaveClass("block");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("scrolls to the top after a step change, not during field updates", () => {
    vi.useFakeTimers();
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    function Step({ step, name }: { step: string; name: string }) {
      useBookingStepScroll(step);
      return <p>{name}</p>;
    }
    const view = render(<Step step="details" name="" />);
    act(() => vi.runAllTimers());
    expect(scroll).not.toHaveBeenCalled();
    view.rerender(<Step step="details" name="Passenger" />);
    act(() => vi.runAllTimers());
    expect(scroll).not.toHaveBeenCalled();
    view.rerender(<Step step="payment" name="Passenger" />);
    act(() => vi.runAllTimers());
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "instant" });
    view.rerender(<Step step="details" name="Passenger" />);
    act(() => vi.runAllTimers());
    expect(scroll).toHaveBeenCalledTimes(2);
    scroll.mockRestore();
    vi.useRealTimers();
  });
});