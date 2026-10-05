/** Image types the media library accepts. SVG is refused (it can carry script). */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function isAllowedImageType(type: string | null | undefined): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(String(type ?? "").toLowerCase());
}
