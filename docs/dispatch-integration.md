# CabsLink dispatch integration

How a separate dispatch project (own domain) receives bookings automatically and assigns drivers.

## 1. Live data (read + assign)

The dispatch project connects to the same CabsLink backend using a **dispatch login** created in
Admin → System → Dispatch Link → "Dispatch logins".

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(CABSLINK_SUPABASE_URL, CABSLINK_PUBLISHABLE_KEY);
await supabase.auth.signInWithPassword({ email, password }); // dispatch account
```

A dispatch account may:

- read `bookings` (non-deleted), `drivers`, `vehicles`, `vehicle_classes`
- update `bookings.driver_id`, `bookings.status`, `bookings.dispatch_notes`

Allowed statuses for dispatch: `confirmed`, `assigned`, `driver_en_route`, `passenger_on_board`,
`completed`. Any attempt to change price, customer details, payment status or to delete is rejected
by the database (`dispatch_guard_booking_update`). `assigned_at` is stamped automatically.

Live updates: `bookings` is in the realtime publication.

```ts
supabase.channel("jobs")
  .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, handler)
  .subscribe();
```

## 2. Push notifications (webhooks)

Add the dispatch project's HTTPS endpoint in Admin → Dispatch Link → Connections. Every booking
create / driver assignment / status change is queued and delivered immediately (retried with
backoff, up to 6 attempts; hourly sweep for anything still pending).

Request headers:

| Header | Meaning |
| --- | --- |
| `x-cabslink-event` | `booking.created`, `booking.assigned`, `booking.status_changed`, `booking.deleted`, `dispatch.test` |
| `x-cabslink-delivery` | unique delivery id (use for idempotency) |
| `x-cabslink-timestamp` | unix seconds |
| `x-cabslink-signature` | hex HMAC-SHA256 of `` `${timestamp}.${rawBody}` `` using the endpoint's signing key |

Body: `{ "id": "<delivery id>", "type": "<event>", "data": { ... } }`.

Verify before trusting (Node/Web Crypto):

```ts
const raw = await request.text();
const ts = request.headers.get("x-cabslink-timestamp")!;
const expected = hmacSha256Hex(SIGNING_KEY, `${ts}.${raw}`);
if (!timingSafeEqualHex(expected, request.headers.get("x-cabslink-signature")!)) return new Response("bad signature", { status: 401 });
if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return new Response("stale", { status: 401 });
```

Reply `2xx` quickly; anything else is retried.

## 3. Reconciliation

Poll periodically as a backstop:
`select * from bookings where updated_at > <cursor> order by updated_at asc limit 500`.

## Internals

- `dispatch_endpoints` — connections + signing key + last delivery state
- `dispatch_events` — delivery queue and log
- `/api/public/dispatch/drain` — delivery worker, protected by `DISPATCH_DRAIN_TOKEN`
