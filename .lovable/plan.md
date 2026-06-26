## Admin Panel

A separate `/admin` area, password-protected, only accessible to users with the `admin` role. Styled to match the existing dark/gold cabslink theme but with a focused sidebar layout.

### 1. Auth & access

- Add `/auth` page (email + password sign in / sign up) using Lovable Cloud auth.
- Reuse the existing `user_roles` table + `has_role()` function — no schema change for roles.
- First admin: I'll grant `admin` to a user you specify (give me the email after sign-up).
- Move admin routes under `src/routes/_authenticated/admin/...` so the managed auth gate handles sign-in, then a child `beforeLoad` checks the `admin` role via a server function and redirects non-admins to `/`.

### 2. New table: `vehicles` (for Fleet CRUD)

Columns: name, category, seats, luggage, description, image_url, price_per_hour, display_order, active. Public can read active rows; admins write. Fleet page reads from this table; the hardcoded list becomes a fallback / seed.

### 3. Admin layout

`src/routes/_authenticated/admin/route.tsx` — sidebar + top bar shell.
Sidebar items: Dashboard, Bookings, Messages, Fleet, Users.

### 4. Pages

- **Dashboard** (`/admin`): KPI cards (total bookings, pending bookings, revenue estimate, new messages, fleet count) + line chart of bookings per day (last 30d) + bar chart of bookings by vehicle type. Recharts.
- **Bookings** (`/admin/bookings`): table with search, status filter, row actions to view details, update status (pending / confirmed / completed / cancelled), edit notes, delete. Detail drawer shows full booking.
- **Messages** (`/admin/messages`): inbox table, read/unread toggle, mark resolved, delete, reply via mailto link.
- **Fleet** (`/admin/fleet`): grid + table; create/edit/delete vehicles with image URL, toggle active, reorder.
- **Users** (`/admin/users`): list of auth users with their roles; promote/demote admin; uses a server function that calls Auth Admin API (service role) gated by `has_role(admin)`.

### 5. Server functions (`src/lib/admin.functions.ts`)

All use `requireSupabaseAuth` middleware + an `assertAdmin(context)` helper:
- `isAdmin()` — for the route gate
- `listBookings`, `updateBooking`, `deleteBooking`
- `listMessages`, `updateMessage`, `deleteMessage`
- `listVehicles`, `upsertVehicle`, `deleteVehicle`
- `listUsersWithRoles`, `setUserRole` (Auth Admin via dynamic `client.server` import)
- `getDashboardStats`

### 6. Public side wiring

- Header gets a small "Sign in" link → `/auth`; when signed in as admin it shows "Admin".
- Fleet page switches to read from `vehicles` table (seeded from current hardcoded list in the migration).
- Booking submit + contact submit already insert into the right tables; no change required.

### Technical notes

- Migration: create `vehicles` table with GRANTs (`anon` SELECT where `active`, `authenticated` SELECT/INSERT/UPDATE/DELETE behind admin policies, `service_role` ALL), RLS policies using `has_role(auth.uid(), 'admin')`, plus an `INSERT` seed of the 8 current fleet entries.
- TanStack Query + `ensureQueryData` in loaders; `useMutation` + `invalidateQueries` for writes.
- Recharts already available via shadcn `chart.tsx`.
- No new packages required.
- Email/password only; no Google. Sign-up enabled but only confers admin after manual role grant.
