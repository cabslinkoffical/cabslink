# Tour enquiries work like transfer bookings

Today a tour enquiry is just a message in the inbox: no reference number, no price, no payment,
no way for the customer to track or cancel it. Transfer bookings already have all of that.
This plan gives tour enquiries the same lifecycle.

## The new tour journey

1. **Customer enquires** from a tour page. They immediately get a reference (e.g. `CL-8F3K2Q`)
   and an email saying the enquiry is received and a price will follow.
   Status shown everywhere: **Enquiry received**.
2. **Admin adds the price** in Tour Enquiries. Saving the price moves the enquiry to
   **Confirmed – awaiting payment** and sends the customer a confirmation email with the
   agreed price and payment details/link.
3. **Admin marks it paid** (or the customer pays online). Status becomes **Paid & confirmed**.
4. **Customer can track and cancel** the tour through the existing Manage Booking page using
   the reference plus last name — same verification, same cancellation-request flow that
   lands in Cancellations & Refunds.

## Admin Tour Enquiries screen

- Reference column, tour name, customer, date/time, passengers, price, status.
- **Price** field with a Save button; saving triggers the confirmation email
  (with a confirm dialog so it is never sent by accident).
- **Preview** panel showing the full enquiry: tour, chosen stops, date/time, passengers,
  luggage, flight/hotel, notes, price, status history.
- **Delete** with a confirmation prompt.
- Status names match the customer-facing wording above (no more "read/booked/resolved" mix);
  staff-selectable statuses: Enquiry received, Confirmed – awaiting payment, Paid & confirmed,
  Completed, Cancelled.
- Search and status filter kept.

## Technical approach

- Tour enquiries become rows in `bookings` with `service_type = 'tour'` and `price` left null,
  instead of rows in `contact_messages`. This reuses reference generation, booking statuses,
  payment status, the Manage Booking lookup, cancellation requests and the emails already built
  for transfers — no parallel system.
- Migration: add `tour_slug`, `tour_name`, `tour_stops` (jsonb) and `price_quoted_at` to
  `bookings`; keep grants/RLS unchanged in shape (same policies as existing booking columns).
  Existing tour rows in `contact_messages` are backfilled into `bookings` so nothing is lost.
- New server functions in `src/lib/tours.functions.ts`: `submitTourEnquiry` (public, captcha +
  rate limit, inserts booking, sends "enquiry received" email) and, in
  `src/lib/admin.functions.ts`, `setTourPrice` (admin: writes price, moves status to
  `awaiting_payment`, sends confirmation email) plus reuse of existing status/delete functions.
- `TourBookingDialog.tsx` calls `submitTourEnquiry` instead of `submitContactMessage`, and shows
  the reference on success.
- `src/components/admin/TourEnquiries.tsx` is rebuilt against the bookings data with price entry,
  preview sheet, delete and renamed statuses.
- Manage Booking needs no new flow — tour rows are bookings; its labels get tour-aware wording
  (shows tour name and stops instead of pickup/dropoff when `service_type = 'tour'`).
- Status labels for tours live in `src/lib/tour-enquiries.ts`, mapped onto booking statuses so
  transfers keep their existing wording.
- Contact inbox stops showing tour rows (they are no longer messages).

## Tests

- Enquiry creates a booking with a reference, null price, status `new`.
- Setting a price moves status to `awaiting_payment` and records `price_quoted_at`.
- Manage Booking lookup by reference + last name returns a tour enquiry and allows cancellation.
