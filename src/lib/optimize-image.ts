// Client-side image optimizer. Runs entirely in the browser (main thread offloaded
// via createImageBitmap + OffscreenCanvas when available), so it adds zero load
// to the website / server. Converts to WebP by default.

export type OptimizeSpeed = "off" | "fast" | "balanced" | "max";

export interface OptimizePreset {
  maxWidth: number;
  quality: number; // 0..1
  mime: "image/webp" | "image/jpeg";
}

export const OPTIMIZE_PRESETS: Record<Exclude<OptimizeSpeed, "off">, OptimizePreset> = {
  fast:     { maxWidth: 1920, quality: 0.85, mime: "image/webp" }, // light compression, fastest
  balanced: { maxWidth: 1600, quality: 0.78, mime: "image/webp" }, // recommended
  max:      { maxWidth: 1280, quality: 0.7,  mime: "image/webp" }, // smallest files
};

const STORAGE_KEY = "img-optimize-speed";

export function getOptimizeSpeed(): OptimizeSpeed {
  if (typeof window === "undefined") return "balanced";
  return ((localStorage.getItem(STORAGE_KEY) as OptimizeSpeed) ?? "balanced");
}
export function setOptimizeSpeed(s: OptimizeSpeed) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, s);
}

const SKIP_TYPES = new Set(["image/svg+xml", "image/gif"]);

export async function optimizeImage(
  file: File,
  speed: OptimizeSpeed = getOptimizeSpeed(),
): Promise<File> {
  if (speed === "off") return file;
  if (!file.type.startsWith("image/")) return file;
  if (SKIP_TYPES.has(file.type)) return file;

  const preset = OPTIMIZE_PRESETS[speed];
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, preset.maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canUseOffscreen = typeof OffscreenCanvas !== "undefined";
    let blob: Blob | null = null;

    if (canUseOffscreen) {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await canvas.convertToBlob({ type: preset.mime, quality: preset.quality });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(res, preset.mime, preset.quality)
      );
    }
    bitmap.close?.();
    if (!blob || blob.size >= file.size) return file; // keep original if no gain

    const ext = preset.mime === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${ext}`, { type: preset.mime, lastModified: Date.now() });
  } catch {
    return file; // never block upload on optimizer failure
  }
}
