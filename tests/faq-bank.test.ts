import { describe, expect, it } from "vitest";
import { FAQ_GROUPS, vehicleFaqs } from "@/content/faq-bank";
import { FACT_TEXT, FACTS } from "@/lib/site-facts";
import { PUBLIC_ROUTES } from "@/lib/sitemap-routes";

const all = FAQ_GROUPS.flatMap((g) => g.items);
const answer = (n: number) => all.find((i) => i.n === n)?.a ?? "";

describe("FAQ question bank answers", () => {
  it("payment answer is the shared payment fact, offering card or another way", () => {
    expect(answer(4)).toBe(FACT_TEXT.payment);
  });

  it("states 60 free airport waiting minutes and 50p / 75p per minute after", () => {
    expect(FACTS.airportWait.freeMinutes).toBe(60);
    expect(answer(39)).toContain("50p per minute");
    expect(answer(39)).toContain("75p per minute");
  });

  it("meet and greet is an extra charge, never included", () => {
    expect(answer(33)).toMatch(/small extra charge/);
    expect(answer(33)).not.toMatch(/included/i);
  });

  it("does not promise discount codes (no customer coupon field exists)", () => {
    expect(all.some((i) => /discount code|promo code/i.test(i.q + i.a))).toBe(false);
  });

  it("never uses the word chauffeur", () => {
    expect(all.some((i) => /chauffeur/i.test(i.q + i.a))).toBe(false);
  });

  it("luggage answer comes from vehicle class data", () => {
    const out = vehicleFaqs([
      { name: "Saloon", passengers: 4, large_luggage: 2, cabin_bags: 2 },
      { name: "Eight-Seater Van", passengers: 8, large_luggage: 8, cabin_bags: 4 },
    ]);
    expect(out.find((f) => f.n === 25)?.a).toContain("Eight-Seater Van: up to 8 passengers, 8 large cases");
    expect(out.find((f) => f.n === 43)?.a).toContain("up to 8 passengers");
    expect(vehicleFaqs([])).toEqual([]);
  });

  it("the FAQ page is in the sitemap", () => {
    expect(PUBLIC_ROUTES as readonly string[]).toContain("/faq");
  });
});
