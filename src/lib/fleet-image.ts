// Read a fleet asset pointer that may or may not have WebP srcSet variants.
// Original PNG `url` remains a safe fallback; when srcSet is present we prefer
// the WebP variants (roughly 6% of the original size).
export type FleetAssetPointer = {
  url: string;
  srcSet?: string;
  fallbackUrl?: string;
  variants?: Record<string, { url: string; size: number }>;
};

export function fleetImageProps(asset: FleetAssetPointer, sizes: string) {
  if (asset.srcSet) {
    return {
      src: asset.url,
      srcSet: asset.srcSet,
      sizes,
    };
  }
  return { src: asset.url };
}

export function fleetThumbnailUrl(asset: FleetAssetPointer): string {
  return asset.variants?.["400"]?.url ?? asset.url;
}

// Pointer JSON written by the assets CLI has no srcSet/variants keys, so TS
// narrows the import to a literal type. Widen it back to FleetAssetPointer.
export function asFleetAsset(asset: { url: string }): FleetAssetPointer {
  return asset as FleetAssetPointer;
}
