## Goal
Cut homepage image transfer by converting large images to WebP, serving responsive sizes, and giving the LCP hero image priority — without touching design, layout, carousel behaviour, or the booking form.

## Constraints I need to surface first

1. **Fleet carousel images are CDN pointers**, not local files. `src/assets/fleet/*.png.asset.json` point to R2-hosted PNGs (~800 KB each). `vite-imagetools` cannot process URLs — only local files. To convert them I have to: download original from CDN → convert to WebP locally with sharp → upload new WebP via `lovable-assets create` → update the `.asset.json` pointer to point at the WebP. Original PNG assets stay live at their CDN URL as fallback until I confirm the WebPs work.
2. **Local images in `src/assets/`** (hero.jpg, edinburgh.jpg, v-class-side.png, v-class.png, v-class-interior.jpg, airport.jpg, corporate.jpg, chauffeur.jpg, fleet-suv.jpg) — these I can process with `vite-imagetools` query imports (`?format=webp&w=1600;1024;640&as=srcset`) which works in both dev and production build.
3. **Lighthouse against the published URL** requires you to click Publish after I ship the code — I can't publish for you, and preview URL Lighthouse numbers aren't representative. I'll run Lighthouse via Playwright + `lighthouse` CLI against the published URL only after you re-publish and confirm. Until then I'll report: production build asset sizes, transferred bytes from a Playwright network trace against the local production preview, LCP element inspection, and whether below-fold images stayed unloaded on initial viewport.
4. **Homepage component splitting and removing public realtime subscriptions** — you asked to do those after this phase is verified. I will not touch them in this turn.

## Plan

### 1. Tooling
- `bun add -D vite-imagetools sharp`
- Add `imagetools()` plugin via `vite-tanstack-config`'s `vite: { plugins: [...] }` escape hatch. Verify it doesn't collide with the pre-bundled plugin list.
- Add a TypeScript module declaration for `*?w=...&format=webp&as=srcset` imports so typecheck passes.

### 2. Local images → WebP srcSet
For each local image used on the homepage, replace the direct import with an imagetools srcset import at 3 widths (mobile / tablet / desktop, capped at the image's real max width):

```ts
import heroSrcSet from "@/assets/hero.jpg?w=640;1024;1600&format=webp&as=srcset";
import heroFallback from "@/assets/hero.jpg?w=1600&format=webp";
```

Render:
```tsx
<img
  src={heroFallback}
  srcSet={heroSrcSet}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 600px"
  width={1600} height={1000}
  loading="lazy" decoding="async"
  alt="..."
/>
```
Explicit `width`/`height` on every image (preserving real aspect ratios) so no CLS.

### 3. Fleet carousel CDN images → WebP
Script (one-shot, in `/tmp`, not committed):
- Read each `src/assets/fleet/*.png.asset.json`
- `curl` the CDN URL to `/tmp/fleet/<name>.png`
- `sharp` convert to WebP at widths 400 (thumbnail strip) and 1200 (hero stage), quality ~82, with alpha preserved
- `lovable-assets create --file /tmp/fleet/<name>-1200.webp --filename <name>-1200.webp` → capture pointer
- `lovable-assets create --file /tmp/fleet/<name>-400.webp --filename <name>-400.webp` → capture pointer
- Rewrite `src/assets/fleet/<name>.png.asset.json` to include both variants (keeping original `url` as `fallbackUrl` for safety):
  ```json
  { "version": 1, "url": "/__l5e/.../<name>-1200.webp",
    "srcSet": ".../<name>-400.webp 400w, .../<name>-1200.webp 1200w",
    "fallbackUrl": "/__l5e/.../<name>.png", ...existing }
  ```
  This is a superset of the pointer schema; existing readers continue to work.
- If any conversion fails, keep the original PNG pointer untouched for that vehicle.

### 4. Homepage LCP treatment
The visible LCP candidate at first paint is the hero **vehicle carousel image** on desktop (right column, above fold). On mobile the H1 text is bigger than the image but the image still renders above fold.

- Give the active carousel `<img>`:
  - `fetchpriority="high"` (only when `active === 0` on first render)
  - No `loading="lazy"` on the active slide
  - Explicit width/height
- Non-active carousel thumbnails (bottom selector strip): `loading="lazy" decoding="async"`, use the 400w WebP
- Non-active hero slides: not preloaded, not eagerly requested. Only when the carousel advances (or hovers a thumbnail) do we swap `src` — the browser fetches then. This matches your "only load the active carousel image" requirement.
- Add a preload link for the first vehicle's 1200w WebP inside `src/routes/index.tsx`'s `head().links`:
  ```ts
  { rel: "preload", as: "image", href: "<vclass-1200.webp url>",
    imagesrcset: "...400w, ...1200w",
    imagesizes: "(max-width: 640px) 100vw, 600px",
    fetchpriority: "high" }
  ```
  Note: `imagesrcset` is honoured by Chromium/WebKit; unsupported browsers fall back to `href`.

### 5. Below-the-fold discipline
- Every `<img>` in Services, How It Works, Testimonials, Fleet grid: `loading="lazy" decoding="async"`, WebP srcSet, explicit dimensions.
- No preloads for anything below the fold.

### 6. Remove unused imports
After the switch, delete unreferenced `import xImg from "@/assets/x.jpg"` lines. Do not delete the underlying JPG/PNG files — they're the source `vite-imagetools` reads from.

### 7. Build + measure

Then:
1. `bun run build` — capture chunk sizes, warnings, asset output.
2. Serve the production build locally and run a Playwright script that:
   - Loads `/` at 1280x800 with cache disabled
   - Waits for `load`
   - Prints total image transfer bytes, per-URL sizes, `initiatorType`, response headers
   - Checks that non-active carousel slides and below-fold images are NOT in the request log for the initial viewport
   - Screenshots the fold to confirm no layout regression
3. Post the report with:
   - Before/after homepage image transfer (measured, not estimated)
   - Largest remaining image
   - LCP image URL, transferred size, `priority: "High"` observed in the request record
   - Any build warnings
   - Below-fold images confirmed absent from initial requests

### 8. What I will NOT claim
- I will not claim Lighthouse mobile/desktop scores against production until you re-publish and I re-run Lighthouse against `cabslink.lovable.app`. If you want, once the code lands I'll: ask you to click Publish, then run `lighthouse` via CLI against the published URL from the sandbox and post the report. That's a second turn after this one.
- I will not claim "load time cut in half" — I'll only report measured deltas.

## Files changed
- `vite.config.ts` (add imagetools plugin)
- `package.json` (add vite-imagetools, sharp)
- `src/env.d.ts` or new `src/imagetools.d.ts` (module declarations)
- `src/routes/index.tsx` (image markup, preload in head, active-only carousel loading)
- `src/routes/fleet.tsx` (below-fold vehicle grid — WebP + lazy)
- `src/assets/fleet/*.png.asset.json` × 8 (add WebP variants; keep PNG fallback)
- New: `src/lib/fleet-image.ts` — small helper to read `{ url, srcSet, fallbackUrl }` from the pointer JSON consistently

## Explicit non-goals for this turn
- No component splitting of `src/routes/index.tsx`
- No changes to Supabase realtime subscriptions
- No design, copy, carousel behaviour, booking form, or layout changes
- No deletion of original CDN PNG assets (kept as fallback)

Approve and I'll execute the whole thing in one go, then post the measured report.
