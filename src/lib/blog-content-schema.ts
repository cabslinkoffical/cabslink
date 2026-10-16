import { z } from "zod";

/** Existing blog media includes both absolute URLs and same-origin asset paths. */
export const blogImageSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() || null : value,
  z.string().refine((value) => {
    if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Choose an image or enter a valid image URL.").nullable().optional(),
);

/** Preserve legacy question/answer text while using the editor's q/a shape. */
export const blogFaqsSchema = z.array(z.preprocess((value) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const faq = value as Record<string, unknown>;
  return { q: faq["q"] ?? faq["question"], a: faq["a"] ?? faq["answer"] };
}, z.object({ q: z.string(), a: z.string() }))).default([]);