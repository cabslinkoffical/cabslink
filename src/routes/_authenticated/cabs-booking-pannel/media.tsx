import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  catalogueBundledMedia,
  deleteMedia,
  finishMediaOptimization,
  getMediaUsage,
  importLegacyMedia,
  listOptimizationCandidates,
  updateMedia,
  type MediaAsset,
  type MediaUsage,
} from "@/lib/media.functions";
import { BUNDLED_MEDIA } from "@/lib/bundled-media";
import { optimizeImage } from "@/lib/optimize-image";
import { supabase } from "@/integrations/supabase/client";
import { useMediaList, formatBytes } from "@/components/admin/media/MediaPicker";
import { useMediaUpload } from "@/components/admin/media/useMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UploadCloud, Search, Trash2, Copy, ImageIcon, RefreshCw, Check, ExternalLink, Gauge, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/media")({
  component: MediaLibraryPage,
  head: () => ({
    meta: [
      { title: "Media Library | Cabslink Admin" },
      { name: "description", content: "Upload, browse and manage every image used across the Cabslink website." },
      { property: "og:title", content: "Media Library | Cabslink Admin" },
      { property: "og:description", content: "Upload, browse and manage every image used across the Cabslink website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const [syncing, setSyncing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [activeAsset, setActiveAsset] = useState<MediaAsset | null>(null);
  const [activeUsage, setActiveUsage] = useState<MediaUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data, isLoading } = useMediaList({ search, folder, limit: 200 });
  const { uploadFiles, busy, progress } = useMediaUpload(folder === "all" ? "general" : folder);
  const runUsage = useServerFn(getMediaUsage);
  const runDelete = useServerFn(deleteMedia);
  const runImport = useServerFn(importLegacyMedia);
  const runUpdate = useServerFn(updateMedia);
  const runCatalogue = useServerFn(catalogueBundledMedia);
  const runCandidates = useServerFn(listOptimizationCandidates);
  const runFinishOptimization = useServerFn(finishMediaOptimization);

  const refresh = () => qc.invalidateQueries({ queryKey: ["media"] });

  async function handleFiles(files: File[]) {
    await uploadFiles(files);
    await refresh();
  }

  async function syncWebsiteImages(showToast = true) {
    setSyncing(true);
    try {
      const [legacy, bundled] = await Promise.all([
        runImport({}),
        runCatalogue({ data: { assets: BUNDLED_MEDIA } }),
      ]);
      await refresh();
      if (showToast) {
        const added = legacy.imported + bundled.imported;
        toast.success(added ? `${added} website image${added === 1 ? "" : "s"} added.` : "Media Library is already in sync.");
      }
    } catch (e) {
      toast.error(`Could not sync website images: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const key = "cabslink-media-auto-sync-v2";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void syncWebsiteImages(false);
  }, []);

  async function openDetails(asset: MediaAsset) {
    setActiveAsset(asset);
    setActiveUsage([]);
    setUsageLoading(true);
    try {
      const result = await runUsage({ data: { ids: [asset.id] } });
      setActiveUsage(result[asset.id] ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUsageLoading(false);
    }
  }

  async function optimizeNewImages() {
    setOptimizing(true);
    let optimized = 0;
    let skipped = 0;
    let failed = 0;
    try {
      const candidates = await runCandidates({});
      if (!candidates.length) {
        toast.success("All eligible images are already optimized.");
        return;
      }
      for (const asset of candidates) {
        try {
          if (/image\/(svg\+xml|gif|webp|avif)/i.test(asset.mime_type ?? "") || /\.(svg|gif|webp|avif)(\?|$)/i.test(asset.url)) {
            await runFinishOptimization({ data: { id: asset.id, status: "already_optimized", original_bytes: asset.bytes } });
            skipped++;
            continue;
          }
          const response = await fetch(asset.url);
          if (!response.ok) throw new Error(`Image request failed (${response.status})`);
          const blob = await response.blob();
          const original = new File([blob], asset.file_name, { type: blob.type || asset.mime_type || "image/jpeg" });
          const output = await optimizeImage(original, "balanced");
          if (output === original || output.size >= original.size) {
            await runFinishOptimization({ data: { id: asset.id, status: "already_optimized", original_bytes: original.size } });
            skipped++;
            continue;
          }
          const cleanName = output.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-100);
          const path = `optimized/${asset.id}/${cleanName}`;
          const { error: uploadError } = await supabase.storage.from("media").upload(path, output, {
            cacheControl: "31536000",
            upsert: true,
            contentType: output.type,
          });
          if (uploadError) throw uploadError;
          const { data: signed, error: signError } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          if (signError || !signed?.signedUrl) throw signError ?? new Error("Could not create optimized image link");
          await runFinishOptimization({ data: {
            id: asset.id,
            status: "optimized",
            url: signed.signedUrl,
            path,
            file_name: output.name,
            mime_type: output.type,
            bytes: output.size,
            original_bytes: original.size,
          } });
          optimized++;
        } catch {
          failed++;
        }
      }
      await refresh();
      toast.success(`${optimized} optimized · ${skipped} already efficient${failed ? ` · ${failed} could not be processed` : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOptimizing(false);
    }
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

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            Every image used on the website lives here. {data ? `${data.total} image${data.total === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={syncing || working}
            onClick={() => void syncWebsiteImages()}
          >
            {syncing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RefreshCw className="mr-1.5 size-4" />}
            {syncing ? "Syncing…" : "Sync website images"}
          </Button>
          <Button type="button" variant="outline" disabled={optimizing || syncing} onClick={() => void optimizeNewImages()}>
            {optimizing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Gauge className="mr-1.5 size-4" />}
            {optimizing ? "Optimizing…" : "Optimize new images"}
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
                   <button type="button" onClick={() => void openDetails(a)} className="relative block w-full" aria-label={`Open details for ${a.file_name}`}>
                    <img src={a.url} alt={a.alt_text ?? a.file_name} loading="lazy" className="h-32 w-full bg-muted object-cover" />
                  </button>
                  <div className="space-y-1.5 p-2">
                     <div className="flex items-center gap-2">
                       <button
                         type="button"
                         onClick={() => toggle(a.id)}
                         aria-label={`${isSel ? "Deselect" : "Select"} ${a.file_name}`}
                         className={`grid size-5 shrink-0 place-items-center rounded border ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                       >
                         {isSel ? <Check className="size-3.5" /> : null}
                       </button>
                       <p className="truncate text-xs font-medium" title={a.file_name}>{a.file_name}</p>
                     </div>
                    <p className="text-[11px] text-muted-foreground">
                      {a.width && a.height ? `${a.width}×${a.height} · ` : ""}
                      {formatBytes(a.bytes)} · {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </p>
                     <p className="text-[11px] capitalize text-muted-foreground">
                       {a.optimization_status.replaceAll("_", " ")}
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

      <Dialog open={Boolean(activeAsset)} onOpenChange={(open) => { if (!open) setActiveAsset(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{activeAsset?.file_name}</DialogTitle>
            <DialogDescription>Image details and every known place where it appears.</DialogDescription>
          </DialogHeader>
          {activeAsset ? (
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_260px]">
              <img src={activeAsset.url} alt={activeAsset.alt_text ?? activeAsset.file_name} className="max-h-80 w-full rounded-lg border border-border bg-muted object-contain" />
              <div className="min-w-0 space-y-4">
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Folder:</span> <span className="capitalize">{activeAsset.folder}</span></p>
                  <p><span className="text-muted-foreground">Size:</span> {formatBytes(activeAsset.bytes)}</p>
                  <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{activeAsset.optimization_status.replaceAll("_", " ")}</span></p>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MapPin className="size-4" /> Used on website</p>
                  {usageLoading ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : activeUsage.length ? (
                    <ul className="max-h-48 space-y-2 overflow-y-auto">
                      {activeUsage.map((item) => (
                        <li key={`${item.table}-${item.id}`} className="rounded-md border border-border p-2 text-xs">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-muted-foreground">{item.label}</p>
                          {(item as MediaUsage & { href?: string }).href ? (
                            <a href={(item as MediaUsage & { href?: string }).href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary">
                              Open page <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No current website usage found.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
