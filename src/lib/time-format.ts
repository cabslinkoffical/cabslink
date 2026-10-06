/** "14:05" / "14:05:00" → "2:05 PM". Leaves anything unparseable unchanged. */
export function formatTime12(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return value;
  const h = Number(m[1]);
  if (h > 23) return value;
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
