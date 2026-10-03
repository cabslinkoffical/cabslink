# Redesign location and area pages

## Goal
Apply the selected high-end editorial travel direction to `/areas`, region pages, and individual area pages while preserving all existing facts, search, links, maps, SEO content, and booking behaviour.

## What will change
- Recompose `/areas` as a navy-led editorial directory with a stronger centered introduction, prominent search, cinematic region emphasis, and a quieter alphabetical directory.
- Restyle category, region, and destination cards with sharper hierarchy, restrained gold accents, and more deliberate spacing.
- Carry the same visual language into `/areas/region/:slug` and `/areas/:slug` so visitors experience one coherent location system.
- Keep the existing Urbanist and Epilogue fonts, navy/gold brand palette, coverage map, tabs, FAQs, internal links, and all real content.
- Adapt the composition for mobile, tablet, and desktop with accessible focus states and reduced-motion support.

## Technical details
- Extend shared location components instead of duplicating page-specific layouts.
- Use existing semantic design tokens; add only reusable editorial tokens or utilities where necessary.
- Preserve current data loaders, metadata, structured data, destination URLs, and booking links.
- Validate `/areas`, one region page, and one individual area page in desktop and mobile views, then confirm the build is clean.
