import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadCloud, X, Loader2 } from "lucide-react";

const BUCKET = "blog-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder = "posts",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    setBusy(true);
    try {
      const path = `${folder}/${safeName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, TEN_YEARS);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not create image URL");
      onChange(data.signedUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {value ? (
        <div className="mt-1.5 flex items-start gap-3 rounded-xl border border-border p-3">
          <img src={value} alt="" className="h-20 w-28 rounded-lg object-cover bg-muted" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <UploadCloud className="size-4 mr-1.5" />}
              Replace
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              <X className="size-4 mr-1.5" />Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-7 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
          {busy ? "Uploading…" : "Click to upload an image (JPG, PNG, WebP · max 10MB)"}
        </button>
      )}
    </div>
  );
}
