import { describe, it, expect } from "vitest";
import { formatTime12 } from "@/lib/time-format";
describe("formatTime12", () => {
  it("adds AM/PM", () => {
    expect(formatTime12("10:58")).toBe("10:58 AM");
    expect(formatTime12("00:15")).toBe("12:15 AM");
    expect(formatTime12("12:00:00")).toBe("12:00 PM");
    expect(formatTime12("23:45")).toBe("11:45 PM");
    expect(formatTime12(null)).toBe("");
    expect(formatTime12("soon")).toBe("soon");
  });
});
