import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Deterministic server secret for confirmation-token derivation in tests.
// Production sets BOOKING_TOKEN_SECRET via secrets storage; this value is
// test-only and never shipped.
process.env.BOOKING_TOKEN_SECRET ||= "test-only-booking-token-secret-do-not-use-in-production-xxxxxxxxxxxxxxxx";

afterEach(() => cleanup());
