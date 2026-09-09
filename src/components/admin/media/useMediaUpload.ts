import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { registerUpload } from "@/lib/media.functions";
import { optimizeImage } from "@/lib/optimize-image";
import { toast } from "sonner";

const BUCKET = "media";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const MAX_BYTES = 15 * 1024 * 1024;

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "jpg";
  const base = (dot > -1 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "image";
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

async function dimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    const bmp = await createImageBitmap(file);
    const out = { width: bmp.width, height: bmp.height };
    bmp.close?.();
    return out;
  } catch {
    return { width: null, height: null };
  }
}

export function useMediaUpload(folder = "general") {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const register = useServerFn(registerUpload);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) {
        toast.error("Please choose image files only.");
        return [];
      }
      setBusy(true);
      setProgress({ done: 0, total: images.length });
      const uploaded: { url: string; file_name: string }[] = [];
      try {
        for (let i = 0; i < images.length; i++) {
          const raw = images[i]!;
          if (raw.size > MAX_BYTES) {
            toast.error(`${raw.name} is over 15MB.`);
            continue;
          }
          const file = await optimizeImage(raw);
          const path = `${folder}/${safeName(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
          if (upErr) throw upErr;
          const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
          if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Could not create image link");
          const dim = await dimensions(file);
          await register({
            data: {
              path,
              url: signed.signedUrl,
              file_name: file.name,
              mime_type: file.type,
              bytes: file.size,
              width: dim.width,
              height: dim.height,
              folder,
              source_kind: "upload",
              optimization_status: file.type === "image/webp" || file.type === "image/avif" ? "optimized" : "already_optimized",
              original_bytes: raw.size,
            },
          });
          uploaded.push({ url: signed.signedUrl, file_name: file.name });
          setProgress({ done: i + 1, total: images.length });
        }
        if (uploaded.length) toast.success(uploaded.length === 1 ? "Image uploaded" : `${uploaded.length} images uploaded`);
      } catch (e) {
        toast.error((e as Error).message ?? "Upload failed");
      } finally {
        setBusy(false);
        setProgress(null);
      }
      return uploaded;
    },
    [folder, register],
  );

  return { uploadFiles, busy, progress };
}
