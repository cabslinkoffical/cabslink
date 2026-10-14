import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";

const state = vi.hoisted(() => ({ data: null as any, isPending: false }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => state }));
vi.mock("@/lib/google-reviews-query", () => ({ googleReviewsQuery: {} }));
vi.mock("@/lib/google-reviews.functions", () => ({ GOOGLE_PROFILE_URL: "https://share.google/eVCAo7I5A17ZPE0pk" }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/components/ui/testimonials-columns-1", () => ({ TestimonialsColumn: ({ testimonials }: any) => <div>{testimonials.map((r: any) => <blockquote key={r.name}>{r.text}<cite>{r.name}</cite></blockquote>)}</div> }));

import { GoogleReviewsSection } from "@/components/site/GoogleReviewsSection";
import { GoogleReviewsStrip } from "@/components/site/GoogleReviewsStrip";

describe("Primary Google review display", () => {
  it("renders Google reviews and the provider score without Trustpilot", () => {
    state.data = { rating: 4.8, reviewCount: 12, profileUrl: "https://share.google/eVCAo7I5A17ZPE0pk", reviews: [{ author: "Test reviewer", stars: 5, excerpt: "Test provider text", dateLabel: "14 October 2026", topic: "Google review" }] };
    const { container } = render(<><GoogleReviewsSection /><GoogleReviewsStrip /></>);
    expect(screen.getByText("12 reviews on Google")).toBeInTheDocument();
    expect(screen.getByText("“Test provider text”")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Trustpilot/i);
  });

  it("keeps a Google link without inventing a score when unavailable", () => {
    state.data = null;
    const { container } = render(<><GoogleReviewsSection /><GoogleReviewsStrip /></>);
    expect(screen.getByText("Read customer reviews on Google.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read reviews on Google" })).toHaveAttribute("href", "https://share.google/eVCAo7I5A17ZPE0pk");
    expect(container.textContent).not.toMatch(/Trustpilot|\/5|out of 5/i);
  });

  it("removes Trustpilot displays from public conversion pages and footer", () => {
    for (const path of ["src/routes/index.tsx", "src/routes/contact.tsx", "src/routes/book.index.tsx", "src/routes/book.hourly.tsx", "src/components/site/Footer.tsx"]) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/<Trustpilot|import.*TRUSTPILOT|import.*Trustpilot/);
      expect(source).toMatch(/GoogleReviews|Reviews on Google/);
    }
    expect(readFileSync("src/routes/reviews.tsx", "utf8")).toContain("<TrustpilotStars");
  });
});