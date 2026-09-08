import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMedia, type MediaAsset } from "@/lib/media.functions";
import { useMediaUpload } from "./useMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, UploadCloud, Search, ImageIcon, Check } from "lucide-react";

export function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function useMediaList(params: { search: string; folder: string; limit?: number }) {
  const list = useServerFn(listMedia);
  return useQuery({
    queryKey: ["media", params.search, params.folder, params.limit ?? 60],
    queryFn: () => list({ data: { search: params.search || undefined, folder: params.folder, limit: params.limit ?? 60 } }),
  });
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  folder = "general",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  folder?: string;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [tab, setTab] = useState("library");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { data, isLoading } = useMediaList({ search, folder: "all" });
  const { uploadFiles, busy, progress } = useMediaUpload(folder);

  async function handleFiles(files: File[]) {
    const done = await uploadFiles(files);
    await qc.invalidateQueries({ queryKey: ["media"] });
    if (done.length === 1) {
      onSelect(done[0]!.url);
      onOpenChange(false);
    } else if (done.length > 1) {
      setTab("library");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name…" className="pl-9" />
            </div>
            <div className="max-h-[52vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : !data?.items.length ? (
                <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                  <ImageIcon className="size-6" />
                  No images yet — use the Upload tab.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {data.items.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected(a)}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-colors ${
                        selected?.id === a.id ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={a.url} alt={a.alt_text ?? a.file_name} loading="lazy" className="h-28 w-full bg-muted object-cover" />
                      {selected?.id === a.id && (
                        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-4" />
                        </span>
                      )}
                      <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{a.file_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void handleFiles(files);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files ?? []);
                if (files.length) void handleFiles(files);
              }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-14 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
              {busy
                ? progress
                  ? `Uploading ${progress.done + 1} of ${progress.total}…`
                  : "Uploading…"
                : "Drag images here, or click to choose (JPG, PNG, WebP · max 15MB each)"}
            </button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onSelect(selected.url, selected);
              onOpenChange(false);
            }}
          >
            Insert image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Simple "Choose image" button that opens the library. */
export function MediaPickerButton({
  onSelect,
  folder = "general",
  label = "Choose image",
  variant = "outline",
}: {
  onSelect: (url: string) => void;
  folder?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <ImageIcon className="size-4" />
        <span className="ml-1.5">{label}</span>
      </Button>
      <MediaPicker open={open} onOpenChange={setOpen} onSelect={onSelect} folder={folder} />
    </>
  );
}

/** URL text input paired with a media-library picker button. */
export function MediaUrlInput({
  value,
  onChange,
  folder = "general",
  placeholder = "https://…",
  showPreview = true,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  showPreview?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        <MediaPickerButton folder={folder} onSelect={onChange} label="Library" />
      </div>
      {showPreview && value ? (
        <img src={value} alt="" className="h-20 rounded-lg border border-border object-cover" />
      ) : null}
    </div>
  );
}
