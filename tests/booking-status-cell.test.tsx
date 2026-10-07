import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingStatusCell } from "@/components/admin/BookingStatusCell";

describe("compact booking status", () => {
  it("shows one payment label and an accessible lock without a second text row", () => {
    render(<BookingStatusCell status="Completed" paymentStatus="paid" locked />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getAllByText("paid")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Status locked" })).toHaveAttribute("title", "Status locked");
    expect(screen.queryByText("Status locked")).not.toBeInTheDocument();
  });

  it("keeps unpaid red and uses unpaid when payment state is missing", () => {
    render(<BookingStatusCell status="New" locked={false} />);
    expect(screen.getByText("unpaid")).toHaveClass("text-destructive");
    expect(screen.queryByRole("img", { name: "Status locked" })).not.toBeInTheDocument();
  });

  it("retains the editable status control beside payment state", () => {
    render(<BookingStatusCell status="New" paymentStatus="unpaid" locked={false}><select aria-label="Change status"><option>New</option></select></BookingStatusCell>);
    expect(screen.getByRole("combobox", { name: "Change status" })).toBeInTheDocument();
    expect(screen.getAllByText("unpaid")).toHaveLength(1);
  });
});