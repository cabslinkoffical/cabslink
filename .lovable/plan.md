## Phase 2 — Remaining Admin Modules

Build the 7 remaining stubbed admin sections into real, production-ready pages backed by the database. All gated by the existing `admin` role check; all writes through `createServerFn` with `requireSupabaseAuth` + `assertAdmin`.

### 1. Database (single migration)

New tables (all admin-only RLS, plus `GRANT` to authenticated + service_role):

- `pricing_rules` — fixed-price routes (from_address, to_address, vehicle_id, price, active, valid_from, valid_to)
- `hourly_rates` — per-vehicle hourly tiers (vehicle_id, min_hours, max_hours, price_per_hour, active)
- `surcharges` — named surcharges (name, type: `fixed`|`percent`, amount, applies_to: `all`|`vehicle`|`time_window`|`date_range`, vehicle_id, starts_at, ends_at, days_of_week, active)
- `content_blocks` — editable site copy (key, title, body, image_url, updated_by)
- `notification_templates` — message templates (key, channel: `email`|`sms`, subject, body, variables, active)
- `notification_log` — outbound history (template_key, recipient, channel, status, payload, sent_at, error)
- `activity_logs` — admin actions (actor_id, actor_email, action, entity, entity_id, diff, ip, user_agent, created_at)

Helper trigger: `log_admin_action()` on `bookings`, `vehicles`, `coupons`, `drivers`, `addresses`, `payments`, `pricing_rules`, `hourly_rates`, `surcharges`, `content_blocks`, `site_settings` — writes one row to `activity_logs` per insert/update/delete using `auth.uid()` and `auth.jwt() ->> 'email'`.

Seed `content_blocks` with the keys the public site already renders (hero_title, hero_sub, about_intro, footer_about, contact_address, contact_phone, contact_email).

### 2. Server functions (`src/lib/admin.functions.ts`)

Add CRUD pairs for each new table plus:

- `getReports({ range, granularity })` — revenue, bookings count, top vehicles, top routes, conversion (completed/total), avg fare; grouped by day/week/month.
- `listActivityLogs({ search, entity, actorId, from, to, limit, offset })`
- `sendTestNotification({ templateKey, recipient })` — renders + logs (no real provider yet; writes a `pending` row to `notification_log` and toasts that delivery is mocked).

### 3. Admin pages (replace stubs)

- **Pricing** (`/admin/pricing`) — table with from/to/vehicle/price, search by address, vehicle filter, active toggle, drawer for create/edit. Bulk-import CSV button (parses client-side, calls `upsertPricingRules`).
- **Hourly Rate** (`/admin/hourly-rate`) — per-vehicle tier editor: select vehicle → list its tiers → add/remove rows inline → save.
- **Surcharges** (`/admin/surcharges`) — cards grouped by `applies_to`. Create dialog with type/amount/scope/date controls. Active toggle.
- **Website Content** (`/admin/content`) — key/value editor with rich-text textarea, live preview pane, image URL field, "view on site" deep link.
- **Notifications** (`/admin/notifications`) — two tabs: **Templates** (CRUD) and **Log** (table with status badges, retry-send button for `failed`). Variable hint panel (`{{customer_name}}`, `{{booking_ref}}`…).
- **Reports** (`/admin/reports`) — date-range picker + granularity (day/week/month). KPI cards (gross revenue, completed bookings, cancellation rate, avg fare). Charts: revenue line, bookings stacked bar by status, top 5 vehicles bar, top 10 routes table. CSV export of the active dataset.
- **Activity Logs** (`/admin/logs`) — virtualized table with search, entity filter, actor filter, date range. Row expansion shows JSON diff (before/after).

### 4. UI consistency

- Reuse existing `src/components/admin/ui.tsx` primitives (PageHeader, StatCard, DataTable, Drawer).
- New shared bits: `DateRangePicker`, `JsonDiffViewer`, `CsvExportButton` under `src/components/admin/`.
- All pages follow the same loader pattern: `ensureQueryData` in the route loader, `useSuspenseQuery` in the component, `useMutation` + `invalidateQueries` for writes.

### 5. Public-site wiring

- Booking flow reads `pricing_rules` first (exact route match) before falling back to per-vehicle base fare.
- Hourly booking widget reads `hourly_rates` for the chosen vehicle.
- Surcharges applied at quote time based on date/time/vehicle scope.
- Home/About/Contact pull copy from `content_blocks` with hardcoded fallbacks so the site never goes blank.

### 6. Out of scope (call out, don't build)

- Real email/SMS delivery (needs provider connector — separate ask).
- Driver mobile app / live tracking.
- Multi-currency / tax engine beyond a flat VAT % already in `site_settings`.

### Technical notes

- One migration file with all 7 tables, all GRANTs, all RLS policies, the `log_admin_action()` function, all triggers, and seed inserts for `content_blocks`.
- Activity log trigger uses `SECURITY DEFINER` + `SET search_path = public` and only logs when `auth.uid()` is non-null (skips system writes).
- Reports queries use server-side aggregation (`group by date_trunc(...)`) — no client-side roll-ups over large rowsets.
- CSV export is client-side from the already-loaded React Query data; for >5k rows, switch to a server-streamed endpoint later.
- No new npm packages required (Recharts, date-fns, papaparse already in tree — if papaparse isn't, fall back to a tiny inline CSV writer).
