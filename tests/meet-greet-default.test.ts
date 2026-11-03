import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Owner rule: Meet & Greet is an optional paid extra — never pre-ticked.
const src = readFileSync("src/routes/book.index.tsx", "utf8");

describe("Meet & Greet default", () => {
  it("starts unticked on the transfer booking form", () => {
    expect(src).toMatch(/\[meetGreet, setMeetGreet\] = useState\(false\)/);
  });
  it("is unticked again when the booking is reset", () => {
    expect(src).not.toMatch(/setMeetGreet\(true\)/);
  });
});
