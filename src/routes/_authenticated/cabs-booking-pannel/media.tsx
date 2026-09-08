import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteMedia, getMediaUsage, importLegacyMedia, updateMedia, type MediaUsage } from "@/lib/media.functions";
import { useMediaList, formatBytes } from "@/components/admin/media/MediaPicker";
import { useMediaUpload } from "@/components/admin/media/useMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UploadCloud, Search, Trash2, Copy, ImageIcon, DownloadCloud, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/media")({
  component: MediaLibraryPage,
  head: () => ({
    meta: [
      { title: "Media Library | Cabslink Admin" },
      { name: "description", content: "Upload, browse and manage every image used across the Cabslink website." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function MediaLibraryPage() {
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, MediaUsage[]> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data, isLoading } = useMediaList({ search, folder, limit: 200 });
  const { uploadFiles, busy, progress } = useMediaUpload(folder === "all" ? "general" : folder);
  const runUsage = useServerFn(getMediaUsage);
  const runDelete = useServerFn(deleteMedia);
  const runImport = useServerFn(importLegacyMedia);
  const runUpdate = useServerFn(updateMedia);

  const refresh = () => qc.invalidateQueries({ queryKey: ["media"] });

  async function handleFiles(files: File[]) {
    await uploadFiles(files);
    await refresh();
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function askDelete() {
    if (!selected.length) return;
    setWorking(true);
    try {
      const map = await runUsage({ data: { ids: selected } });
      setUsage(map);
      setConfirmOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function confirmDelete() {
    setWorking(true);
    try {
      const res = await runDelete({ data: { ids: selected, clearReferences: true } });
      toast.success(
        res.cleared
          ? `${res.deleted} image(s) deleted and removed from ${res.cleared} page(s).`
          : `${res.deleted} image(s) deleted.`,
      );
      setSelected([]);
      setConfirmOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  const inUseCount = usage ? Object.values(usage).flat().length : 0;

  return (
    <div className="space-y-5">
      <Breadcrumbs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            Every image used on the website lives here. {data ? `${data.total} image${data.total === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={working}
            onClick={async () => {
              setWorking(true);
              try {
                const res = await runImport({});
                toast.success(res.imported ? `${res.imported} older image(s) added to the library.` : "No new older images found.");
                await refresh();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setWorking(false);
              }
            }}
          >
            <DownloadCloud className="mr-1.5 size-4" />
            Import older images
          </Button>
          {selected.length > 0 && (
            <Button type="button" variant="destructive" disabled={working} onClick={askDelete}>
              <Trash2 className="mr-1.5 size-4" />
              Delete {selected.length}
            </Button>
          )}
          <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <UploadCloud className="mr-1.5 size-4" />}
            {busy ? (progress ? `Uploading ${progress.done + 1}/${progress.total}…` : "Uploading…") : "Upload images"}
          </Button>
        </div>
      </div>

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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", ...(data?.folders ?? [])].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFolder(f)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
                folder === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length) void handleFiles(files);
        }}
        className="rounded-2xl border border-dashed border-border p-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <ImageIcon className="size-6" />
            No images yet — drag files here or use Upload images.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.items.map((a) => {
              const isSel = selected.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`group overflow-hidden rounded-xl border transition-colors ${
                    isSel ? "border-primary ring-2 ring-primary/40" : "border-border"
                  }`}
                >
                  <button type="button" onClick={() => toggle(a.id)} className="relative block w-full">
                    <img src={a.url} alt={a.alt_text ?? a.file_name} loading="lazy" className="h-32 w-full bg-muted object-cover" />
                    {isSel && (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-4" />
                      </span>
                    )}
                  </button>
                  <div className="space-y-1.5 p-2">
                    <p className="truncate text-xs font-medium" title={a.file_name}>{a.file_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.width && a.height ? `${a.width}×${a.height} · ` : ""}
                      {formatBytes(a.bytes)} · {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </p>
                    <Input
                      defaultValue={a.alt_text ?? ""}
                      placeholder="Alt text"
                      className="h-7 text-xs"
                      onBlur={async (e) => {
                        const v = e.target.value.trim();
                        if (v === (a.alt_text ?? "")) return;
                        await runUpdate({ data: { id: a.id, alt_text: v || null } });
                        toast.success("Alt text saved");
                        await refresh();
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-full text-xs"
                      onClick={async () => {
                        await navigator.clipboard.writeText(a.url);
                        toast.success("Link copied");
                      }}
                    >
                      <Copy className="mr-1.5 size-3.5" />
                      Copy link
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} image{selected.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {inUseCount ? (
                  <>
                    <p className="text-destructive">
                      Careful — {inUseCount} page{inUseCount === 1 ? " uses" : "s use"} these images. Deleting will remove the image from:
                    </p>
                    <ul className="max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5">
                      {Object.values(usage ?? {}).flat().map((u, i) => (
                        <li key={i}>{u.label}: {u.title}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>These images are not used anywhere on the website. This cannot be undone.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Keep them</AlertDialogCancel>
            <AlertDialogAction disabled={working} onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>
              {working ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
