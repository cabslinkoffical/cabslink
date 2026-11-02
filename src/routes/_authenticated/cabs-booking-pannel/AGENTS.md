# Staff console rules

- The console menu is three areas (dashboard & reports, bookings & messages, settings) defined once in src/components/admin/admin-areas.ts; the sidebar shows only the current area's pages and the dashboard's AreaGateway cards are the entry to the other two areas (no area switcher in the sidebar), so new console pages are added there.
- Record lists load one page at a time through src/lib/admin-paging.ts (runPaged/slicePage) and the shared Pager; tabs, search and summary counts are computed in the database, never from the loaded page, and exports fetch the full filtered set on demand.
- Booking list status presentation uses BookingStatusCell to keep booking state, payment state and lock indication in one compact row without duplicating payment labels in the price column.
- Console dates, "today", report ranges and chart buckets use src/lib/uk-time.ts (Europe/London calendar days, exclusive next-day end) so figures match UK business days in GMT and BST.
- Dashboard and report booking counts reuse the booking-tab rules (bookingInTab and the shared status groups in src/lib/admin-bookings.ts), so a figure always matches the list it opens.
- Staff payment edits go through upsertPayment/deletePayment, which protect processor-owned card rows and re-derive the booking's paid state from the ledger after every change.
