import { useEffect, useState } from "react";

/** True after hydration. Marquee loop copies render only then, so the page
 * HTML that search engines read lists each item once. */
export function useLooped() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on;
}
