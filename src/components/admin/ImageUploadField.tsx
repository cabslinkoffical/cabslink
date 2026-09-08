import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { ImageIcon, X } from "lucide-react";

/**
 * Image field backed by the shared media library.
 * Pick an existing image or upload a new one — everything lands in one library.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  folder = "general",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        <div className="mt-1.5 flex items-start gap-3 rounded-xl border border-border p-3">
          <img src={value} alt="" className="h-20 w-28 rounded-lg bg-muted object-cover" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              <ImageIcon className="mr-1.5 size-4" />
              Change image
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              <X className="mr-1.5 size-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-7 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <ImageIcon className="size-5" />
          Choose image from media library, or upload a new one
        </button>
      )}
      <MediaPicker open={open} onOpenChange={setOpen} onSelect={onChange} folder={folder} />
    </div>
  );
}
