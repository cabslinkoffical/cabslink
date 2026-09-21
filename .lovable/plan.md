# Homepage image delivery optimization

## Scope
Optimize homepage image bytes only. Preserve every image choice, layout, text, style, and interaction.

## Changes
- Create responsive WebP variants from the existing six service images at phone and retina-card widths, then add accurate `srcset`/`sizes` values.
- Serve homepage fleet-card images through responsive 260px/520px WebP variants. Use the existing asset pipeline’s transformed URLs for uploaded images and generated variants for bundled fallbacks.
- Reduce the logo candidates to approximately 100px/150px WebP and retain its existing visual dimensions.
- Add explicit intrinsic `width` and `height` attributes to every homepage image touched, including the decorative vehicle reflection.
- Preserve eager/high-priority loading for the above-fold vehicle and logo; preserve lazy loading for service and fleet cards.

## Technical details
- Keep source images unchanged and generate derivatives only.
- Use `srcset` width descriptors plus responsive `sizes`, allowing browsers to select the smallest sufficient candidate.
- Preserve image aspect ratios so the current near-zero layout shift is not regressed.

## Verification
- Check desktop and mobile rendering for unchanged geometry and no horizontal overflow.
- Inspect loaded image URLs, formats, intrinsic dimensions, loading modes, and transfer sizes.
- Compare homepage image bytes before and after, and confirm the hero remains eager while below-fold images remain lazy.
