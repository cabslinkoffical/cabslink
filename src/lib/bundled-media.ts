type AssetPointer = {
  url: string;
  original_filename?: string;
  size?: number;
  content_type?: string;
};

export type BundledMediaItem = {
  path: string;
  url: string;
  file_name: string;
  folder: string;
  bytes: number | null;
  mime_type: string | null;
  usage_locations: { label: string; title: string; href?: string }[];
};

const localImages = import.meta.glob("../assets/**/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const pointerImages = import.meta.glob("../assets/**/*.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, AssetPointer>;

const SERVICE_PAGES: Record<string, { title: string; href: string }[]> = {
  airport: [{ title: "Airport Transfers", href: "/airport-transfers" }, { title: "Home — Our Services", href: "/" }],
  corporate: [{ title: "Corporate Travel", href: "/corporate-travel" }, { title: "Home — Our Services", href: "/" }],
  tours: [{ title: "Tours", href: "/tours" }, { title: "Home — Our Services", href: "/" }],
  group: [{ title: "Group Transfers", href: "/group-transfers" }, { title: "Home — Our Services", href: "/" }],
  cruise: [{ title: "Cruise Transfers", href: "/cruise-transfers" }, { title: "Home — Our Services", href: "/" }],
  station: [{ title: "Station Transfers", href: "/stations" }, { title: "Home — Our Services", href: "/" }],
  vip: [{ title: "VIP Transfers", href: "/vip-transfers" }],
  sports: [{ title: "Sports Travel", href: "/sports-travel" }],
  events: [{ title: "Sports and event transfers", href: "/sports-travel" }],
  coach: [{ title: "Coach Hire", href: "/coach-hire" }],
  minibus: [{ title: "Minibus Hire", href: "/minibus-hire" }],
  hospital: [{ title: "Hospital Transfers", href: "/hospital-transfers" }],
  university: [{ title: "University Transfers", href: "/university-transfers" }],
  "long-distance": [{ title: "Long-distance Travel", href: "/long-distance-transfers" }],
};

function fileStem(fileName: string) {
  return fileName.replace(/\.asset\.json$/, "").replace(/\.[^.]+$/, "");
}

function usageFor(path: string, fileName: string) {
  const stem = fileStem(fileName);
  if (path.includes("/services/")) {
    return (SERVICE_PAGES[stem] ?? [{ title: "Services", href: "/services" }]).map((item) => ({
      label: "Website page",
      ...item,
    }));
  }
  if (path.includes("/fleet/")) {
    return [
      { label: "Fleet image", title: "Fleet", href: "/fleet" },
      { label: "Booking vehicle choice", title: "Book a journey", href: "/book" },
    ];
  }
  if (stem === "edinburgh") return [{ label: "Website page", title: "About Cabslink", href: "/about" }];
  if (stem === "chauffeur") return [{ label: "Website page", title: "VIP Transfers", href: "/vip-transfers" }];
  if (stem.startsWith("cabslink-logo")) return [{ label: "Site identity", title: "Header and footer", href: "/" }];
  return [{ label: "Built-in website asset", title: "Website source" }];
}

function folderFor(path: string) {
  if (path.includes("/fleet/")) return "fleet";
  if (path.includes("/services/")) return "services";
  if (path.includes("logo")) return "branding";
  return "website";
}

export const BUNDLED_MEDIA: BundledMediaItem[] = [
  ...Object.entries(localImages).map(([path, url]) => {
    const file_name = path.split("/").pop() ?? "image";
    return {
      path: `bundled/${path.replace(/^\.\.\/assets\//, "")}`,
      url,
      file_name,
      folder: folderFor(path),
      bytes: null,
      mime_type: file_name.endsWith(".png") ? "image/png" : "image/jpeg",
      usage_locations: usageFor(path, file_name),
    };
  }),
  ...Object.entries(pointerImages).map(([path, pointer]) => {
    const file_name = pointer.original_filename ?? path.split("/").pop()?.replace(".asset.json", "") ?? "image";
    return {
      path: `bundled/${path.replace(/^\.\.\/assets\//, "").replace(".asset.json", "")}`,
      url: pointer.url,
      file_name,
      folder: folderFor(path),
      bytes: pointer.size ?? null,
      mime_type: pointer.content_type ?? null,
      usage_locations: usageFor(path, file_name),
    };
  }),
];