import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element has come within `margin` of the screen, then stays
 * true. Used to hold back heavy extras (the Google Maps script) until a
 * visitor actually scrolls towards them. Browsers without
 * IntersectionObserver get `true` straight away.
 */
export function useNearViewport(ref: RefObject<Element | null>, margin = "400px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
