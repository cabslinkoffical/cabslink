/** Descriptive image alt text built from a vehicle class and its real models. */
export function vehicleAlt(className: string, models?: Array<{ name?: string | null }> | null): string {
  const names = (models ?? [])
    .map((m) => (m?.name ?? "").trim())
    .filter(Boolean)
    .slice(0, 2);
  return names.length
    ? `${className} class vehicle, such as a ${names.join(" or ")}`
    : `${className} class vehicle`;
}
