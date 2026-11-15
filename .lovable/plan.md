# Email automation upgrade (phased)

Your spec has 9 phases. As the spec itself says, I'll build and test them one at a time. This plan covers the first step. Nothing gets published without your approval.

## What already exists (kept as is)
- The New campaign form, the placeholders {{name}}, {{coupon_code}}, {{coupon_offer}} and {{coupon_expiry}}, and UK-time scheduling with summer/winter time handled.
- My Customers (drivers excluded), CSV export, one-click unsubscribe, sending through Resend from offers@cabslink.com.

## Step 1 (this turn): templates, automatic triggers, and the right audience
1. **Who can be emailed**
   - People who ticked the offers box.
   - Past bookers, under UK "soft opt-in" rules: offers for similar trips, and every email has an unsubscribe link.
   - Each customer shows why they can be emailed ("Ticked offers box on [date]" or "Booked on [date]").
   - Unsubscribed, bounced and complaint addresses are never emailed.
   - Past bookers who left an email go on the list from today, so the list is no longer zero.
2. **Ready-made template library** with plain UK English copy and no em dashes:
   - Event offer (Edinburgh Festival, Christmas markets, Hogmanay)
   - Coupon / discount code
   - Seasonal offer (summer tours, winter airport runs)
   - Come back offer, for people who haven't booked in 90 days
   - Thank you after a trip, with a next-trip code
   - General promotion

   Pick "Use template" and the form fills in. You can still edit everything.
3. **Automatic triggers (automation rules)**, each switched off until you turn it on:
   - X days after a completed trip
   - X days since the last booking
   - X days after an enquiry with no booking

   Each rule has a template and an optional coupon. A "quiet days" gap (default 7) means one person never gets two offer emails within that many days.
4. **Safety**
   - A master "Pause all emails" switch.
   - A daily sending cap.
   - A pre-send check that warns if:
     - the text mentions a code but no coupon is attached
     - the coupon has expired
     - the audience is zero
     - a placeholder can't be filled

## Later steps (each one after you've tested the step before)
- Calendar view
- AI-drafted campaigns that need your approval
- Open and click tracking with bounce auto-pause
- Reporting cards
- The Monday 08:00 summary email
- Activity log entries

## Two differences from the spec
- **Sending check timing:** the system checks for due emails once an hour, not every 15 minutes, because the platform rejected the 15-minute schedule. Emails still go out within an hour of their set time.
- **Consent:** the spec says consent only, but you chose to also include past bookers. I'll follow your choice under soft opt-in rules. Tell me if you'd rather use opt-in only.
