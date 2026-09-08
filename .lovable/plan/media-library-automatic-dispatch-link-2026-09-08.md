# Media Library + Automatic Dispatch Link

Two pieces of work. Part 1 gives the admin panel one shared image library. Part 2 connects a separate dispatch site (own domain, own project) to this site's live booking data, with no manual export.

---

## Part 1 — Media Library

### One place for every image

- A single storage folder holds every image used anywhere on the site (blog covers, vehicle class photos, page/SEO images, tour images).
- A new admin page **Media** (under Content in the sidebar) shows all images as a grid with search, newest-first, and infinite/paged loading.
- Each image tile shows a thumbnail, file name, size, dimensions, upload date, and a "copy link" button.

### Picking and uploading

- Every place in the admin that currently offers "Upload" gets one button: **Choose image**.
- That opens a dialog with two tabs:
  - **Library** — pick any existing image (single click to select, Insert to confirm).
  - **Upload** — drag-and-drop or file picker, multiple files at once, auto-compressed to WebP using the existing optimiser; uploaded files land in the library and are selected immediately.
- Images can also be uploaded straight from the Media page.

### Deleting safely

- Before delete, the system checks where the image is used (blog posts, vehicle classes, SEO pages, tours).
- If it is in use, the dialog lists exactly which items use it and asks for confirmation; deleting removes it from storage and clears the reference so nothing shows a broken image.
- Unused images delete after a simple confirm. Bulk-select and delete is supported.

### Existing images

- Photos already uploaded before this change (blog and vehicle images) are indexed into the library on first load, so they appear in the picker straight away and keep working on live pages.

---

## Part 2 — Automatic Dispatch Link

### What you want

A second project on its own domain that always has the current bookings and can assign drivers, without anyone copying data.

### The honest options

1. **Shared backend (recommended, and what actually works with no sync delay).** The dispatch project talks to *this* site's database directly using its own restricted key. There is one set of data, so a booking created here is instantly visible there, and a driver assigned there is instantly visible here. No polling, no duplicate records, no drift.
2. **Signed API feed.** This site exposes read/write endpoints; the dispatch project calls them with a shared secret. Also real, but every screen needs an endpoint, and the dispatch project holds a copy of nothing — it must re-fetch constantly.

Plan: build option 1, and add a small number of signed endpoints from option 2 only for events that must be pushed (new booking alert), so the dispatch panel updates instantly rather than waiting for a refresh.

### What gets built here

- A **dispatch role** with tightly scoped permissions: it can read bookings and drivers, and update only the driver assignment and job status fields. It cannot read payment card data or touch pricing, settings, or customers beyond what a dispatcher needs.
- Access rules (row-level policies) plus grants for that role on the exact tables it needs.
- A **Dispatch access** page in the admin panel: create/revoke access keys for the dispatch project, see last-used time.
- A signed webhook that fires on new booking and on cancellation, so the dispatch panel can show a live alert.
- Live updates enabled on bookings so both panels reflect changes within a second.

### What happens in the other project

- It connects to this same backend with the dispatch key (no service key, no database password shared).
- It builds its own dispatch screens: job board, driver allocation, live status.
- Assignments write back to the same booking rows, so this admin panel shows the assigned driver immediately.

### Order of work

1. Media library (storage, admin page, picker, safe delete, index existing images).
2. Dispatch role, permissions, access keys page.
3. Webhook + live updates, then a test proving an assignment made outside this site appears here.

---

## Technical notes

- Storage: one public bucket `media` (public read for fast, permanently valid URLs — no more 10-year signed links), admin-only write/delete via policies. New table `media_assets` (path, url, file name, mime, bytes, width, height, folder, alt text, uploaded_by, created_at) with admin-only RLS + grants.
- Server functions in `src/lib/media.functions.ts`: `listMedia`, `registerUpload`, `deleteMedia` (with usage scan), `reindexLegacyMedia`.
- New components: `src/components/admin/MediaPicker.tsx` (dialog), `src/components/admin/MediaGrid.tsx`; `ImageUploadField` and `HeroImageUploader` are rewritten to delegate to the picker so existing call sites keep working.
- Upload path keeps `src/lib/optimize-image.ts` for client-side WebP conversion.
- Dispatch: new Postgres role/claim `dispatch` in the existing `user_roles`/`has_role` pattern; policies use `has_role(auth.uid(),'dispatch')`; column-level grants restrict updates to `driver_id`, `status`, `dispatch_notes`. Access keys are dispatch-user accounts created in this panel, not raw service keys.
- Webhook: `src/routes/api/public/dispatch-events.ts` for inbound acks and an outbound HMAC-signed POST to a configurable dispatch URL; shared secret stored as a project secret.
- Realtime enabled on `bookings` for the dispatch role only.
