# Staff console rules

- The console menu is three areas (dashboard & reports, bookings & messages, settings) defined once in src/components/admin/admin-areas.ts; the sidebar and the All settings page both read it, so new console pages are added there.
- Record lists load one page at a time through src/lib/admin-paging.ts (runPaged/slicePage) and the shared Pager; tabs, search and summary counts are computed in the database, never from the loaded page, and exports fetch the full filtered set on demand.
- Booking list status presentation uses BookingStatusCell to keep booking state, payment state and lock indication in one compact row without duplicating payment labels in the price column.
