# Standardize destination hubs and navigation

## Changes
- Apply the requested exact H1 copy to the eight named hub pages.
- Add a keyboard-accessible Destinations menu between Services and Fleet on desktop and mobile, with all ten requested links.
- Restructure `/areas`: remove Popular locations, place Coverage Map first, combine category/region browsing into tabs, update region links and coverage summary copy.
- Move hub benefit cards below destination listings and before long-form FAQ content.
- Standardize visible breadcrumb separators to `/` through shared breadcrumb components and any remaining inline implementations.
- Render every listed hub with the same navy `PageHero` treatment used by `/airports`, preserving each page's existing content and metadata.

## Technical details
- Extend the shared hub renderer rather than duplicating layouts across six pages.
- Use the existing tabs and button design components for accessible controls.
- Keep route URLs, page data, destination cards, and booking behavior unchanged.
- Verify desktop and mobile navigation, every requested H1, `/areas` tab behavior, breadcrumb separators, and page ordering in the preview.
