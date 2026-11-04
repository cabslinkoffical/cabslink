# Staff console rules

- The console menu is three areas (dashboard & reports, bookings & messages, settings) defined once in src/components/admin/admin-areas.ts; the sidebar shows only the current area's pages plus AreaShortcuts (links to the other two areas, pinned above the footer), and the dashboard's AreaGateway cards are the main entry to the other areas, so new console pages are added there.
- Record lists load one page at a time through src/lib/admin-paging.ts (runPaged/slicePage) and the shared Pager; tabs, search and summary counts are computed in the database, never from the loaded page, and exports fetch the full filtered set on demand.
- Booking list status presentation uses BookingStatusCell to keep booking state, payment state and lock indication in one compact row without duplicating payment labels in the price column.
- Console dates, "today", report ranges and chart buckets use src/lib/uk-time.ts (Europe/London calendar days, exclusive next-day end) so figures match UK business days in GMT and BST.
- Dashboard and report booking counts reuse the booking-tab rules (bookingInTab and the shared status groups in src/lib/admin-bookings.ts), so a figure always matches the list it opens.
- Staff payment edits go through upsertPayment/deletePayment, which protect processor-owned card rows and re-derive the booking's paid state from the ledger after every change.
- Admin totals/reports read complete data via fetchAllPages (stable order); revenue is net of refunds and dated by paid_at, else created_at, via shared revenue helpers.
- Ready-made tour admin: categories are rows in tour_categories linked to theme_group (rename cascades, delete uncategorises, max 7 shown); copying and the step-by-step editor save through admin_duplicate_tour / admin_save_tour_draft; draft previews render the shared TourDetailView from an admin-checked loader at /tour-preview/$id.
- Dashboard → SEO "controls live page" status comes only from recordControlsLivePage (src/lib/seo/cms-head.ts), which mirrors the page loaders; place-page records drive title/description/H1 only while LOCATION_HUB_CMS_HEAD_ENABLED is on (owner-approved), never canonicals.
