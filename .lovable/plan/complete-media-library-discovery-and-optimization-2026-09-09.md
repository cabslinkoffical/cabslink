# Complete Media Library Discovery and Optimization

## Goal
Make the Media Library automatically contain every image used by the website, explain where each image appears, and safely optimize only images that have not already been optimized.

## Changes
- Expand image discovery to include:
  - images uploaded to the shared media library;
  - images already saved against pages, services, fleet, tours, blog, stops, drivers, and site settings;
  - built-in website images shipped with the app.
- Run discovery automatically when the Media Library opens, while keeping a manual “Sync website images” action.
- Add an image details panel opened from each thumbnail, showing image information and every known website page/section where it is used.
- Add an “Optimize new images” action with progress and a completion summary.
- Mark optimized media records so repeat runs skip them; also skip formats that should not be recompressed and files where optimization produces no size saving.
- When an uploaded/database-backed image is optimized, preserve its website references so pages continue to display the optimized replacement.
- Treat built-in generated assets as already website-optimized and catalogue them without recompressing them.
- Improve empty, loading, failure, and partial-success messages so the library never silently appears empty when discovery fails.

## Data and safety
- Extend `media_assets` with source/optimization metadata and optional known usage locations.
- Keep media management admin-only under the existing access rules.
- Do not delete originals until a replacement upload and all reference updates succeed.
- Do not optimize SVG/GIF assets or reprocess records already marked optimized.

## Verification
- Confirm existing website assets populate an empty library.
- Confirm opening an image shows its page/section usage.
- Confirm the first optimization run processes only eligible images and the second run skips them.
- Run focused type checks/tests and verify the admin page at desktop and mobile sizes.
