import { LocalMapSection, type MapFocus } from "@/components/site/LocalMapSection";

/** Airport pages keep their own map band near the end of the page. */
export function AirportMapSection({ focus }: { focus: MapFocus | null }) {
  return <LocalMapSection focus={focus} />;
}
