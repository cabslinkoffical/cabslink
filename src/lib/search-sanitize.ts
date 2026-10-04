/**
 * Shared sanitiser for free-text searches interpolated into PostgREST
 * `.or(...ilike...)` filters. Strips characters that can break out of the
 * filter grammar (commas, brackets) or act as LIKE wildcards (% and _).
 */
export function sanitizeSearchTerm(input: string, maxLength = 80): string {
  return (input ?? "")
    .replace(/[,()[\]{}%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
