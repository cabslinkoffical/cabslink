import { useEffect, useRef } from "react";

/** Reset only on navigation, never while the customer edits a field. */
export function useBookingStepScroll(step: string | number) {
  const previous = useRef(step);
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    const frame = requestAnimationFrame(() => {
      // Instant overrides the site's smooth scrolling and browser scroll anchoring.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);
}