import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, ImageOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { FLEET_IMAGES, fleetImageFor } from "@/assets/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listVehicleClassesAdmin, setVehicleClassHeroImage } from "@/lib/vehicle-classes.functions";

const opts = queryOptions({ queryKey: ["admin", "vehicle-classes"], queryFn: () => listVehicleClassesAdmin() });

export const Route = createFileRoute("/_authenticated/admin/fleet-images")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: FleetImageAuditPage,
});

type Source = "uploaded" | "curated" | "missing";

function sourceOf(slug: string, heroImage: string | null): Source {
  if (heroImage?.trim()) return "uploaded";
  if (FLEET_IMAGES[slug]) return "curated";
  return "missing";
}

function FleetImageAuditPage() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (v: { id: string; hero_image: string | null }) => setVehicleClassHeroImage({ data: v }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "vehicle-classes"] }),
        qc.invalidateQueries({ queryKey: ["public-vehicle-classes"] }),
      ]);
      toast.success("Artwork updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update artwork"),
  });

  const classes = [...(data.classes ?? [])].sort(
    (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );

  const counts = classes.reduce(
    (acc: Record<Source, number>, c: any) => {
      acc[sourceOf(c.slug, c.hero_image)]++;
      return acc;
    },
    { uploaded: 0, curated: 0, missing: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet image audit"
        description="Every vehicle class with the exact artwork the website renders, plus one-click replace or clear."
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Chip>{classes.length} classes</Chip>
        <Chip>{counts.uploaded} admin uploads</Chip>
        <Chip>{counts.curated} built-in artwork</Chip>
        {counts.missing > 0 ? (
          <Chip tone="bad">{counts.missing} missing</Chip>
        ) : (
          <Chip>0 missing</Chip>
        )}
      </div>

      {classes.length > 0 && <HeroPreview classes={classes} />}

      {classes.length === 0 ? (
        <EmptyState title="No vehicle classes" hint="Create a vehicle class first." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c: any) => (
            <ClassImageCard
              key={c.id}
              cls={c}
              busy={save.isPending && save.variables?.id === c.id}
              onChange={(hero_image) => save.mutate({ id: c.id, hero_image })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassImageCard({
  cls,
  busy,
  onChange,
}: {
  cls: any;
  busy: boolean;
  onChange: (heroImage: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");

  const source = sourceOf(cls.slug, cls.hero_image);
  const resolved = fleetImageFor(cls.slug, cls.hero_image);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `classes/${cls.slug || "class"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("vehicle-images")
        .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data, error } = await supabase.storage
        .from("vehicle-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error("Failed to sign URL");
      onChange(data.signedUrl);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{cls.name}</p>
          <p className="truncate text-xs text-muted-foreground">/{cls.slug}</p>
        </div>
        {source === "uploaded" && <Chip tone="good">Admin upload</Chip>}
        {source === "curated" && <Chip>Built-in artwork</Chip>}
        {source === "missing" && <Chip tone="bad">Missing</Chip>}
      </div>

      <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
        {resolved ? (
          <img src={resolved} alt={`${cls.name} artwork`} className="max-h-full w-full object-contain" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageOff className="size-6" />
            <span className="text-xs">No artwork</span>
          </div>
        )}
      </div>

      <p className="mt-2 break-all text-[11px] leading-snug text-muted-foreground">
        {cls.hero_image?.trim()
          ? cls.hero_image
          : FLEET_IMAGES[cls.slug]
            ? `bundled: ${cls.slug}.png`
            : "none"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || busy}
          onClick={() => inputRef.current?.click()}
        >
          {uploading || busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="ml-1.5">Replace</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || !cls.hero_image?.trim()}
          onClick={() => onChange(null)}
        >
          <Trash2 className="size-4" />
          <span className="ml-1.5">Clear</span>
        </Button>
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…or paste an image URL"
          className="h-9 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || !/^https?:\/\//.test(url.trim())}
          onClick={() => {
            onChange(url.trim());
            setUrl("");
          }}
        >
          <CheckCircle2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Chip({ tone = "muted", children }: { tone?: "muted" | "good" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-primary/10 text-primary border-primary/30"
      : tone === "bad"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}
