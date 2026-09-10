import { createFileRoute } from '@tanstack/react-router';
import Stripe from 'stripe';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';

const WEBHOOK_SECRET_ENV: Record<StripeEnv, string> = {
  sandbox: 'PAYMENTS_SANDBOX_WEBHOOK_SECRET',
  live: 'PAYMENTS_LIVE_WEBHOOK_SECRET',
};

export const Route = createFileRoute('/api/public/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env: StripeEnv = url.searchParams.get('env') === 'live' ? 'live' : 'sandbox';
        const secretName = WEBHOOK_SECRET_ENV[env];
        const secret = process.env[secretName];

        if (!secret) {
          console.error(`[stripe-webhook] ${secretName} is not configured for ${env}`);
          return new Response(`Webhook secret not configured for ${env}`, { status: 500 });
        }

        const signature = request.headers.get('stripe-signature');
        if (!signature) {
          console.error('[stripe-webhook] Missing stripe-signature header');
          return new Response('Missing stripe-signature header', { status: 400 });
        }

        const payload = await request.text();
        const stripe = createStripeClient(env);

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(payload, signature, secret);
        } catch (err: any) {
          console.error(`[stripe-webhook] Signature verification failed: ${err.message}`);
          return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
        }

        console.log(`[stripe-webhook] Received ${event.type} (${env})`);

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          const ref = (session.metadata?.booking_ref ?? '').toUpperCase();

          if (!ref) {
            console.error('[stripe-webhook] checkout.session.completed missing booking_ref metadata');
            return new Response('Missing booking_ref in session metadata', { status: 400 });
          }

          try {
            const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

            const { data: booking, error: findError } = await supabaseAdmin
              .from('bookings')
              .select('id, price, status, payment_status')
              .eq('booking_ref', ref)
              .maybeSingle();

            if (findError || !booking) {
              console.error(`[stripe-webhook] Booking ${ref} not found`, findError?.message);
              return new Response(`Booking ${ref} not found`, { status: 404 });
            }

            const amount = Math.round(Number(booking.price ?? 0) * 100);
            const paidAt = new Date().toISOString();

            const { error: bookingError } = await supabaseAdmin
              .from('bookings')
              .update({ payment_status: 'paid', status: 'confirmed' })
              .eq('id', booking.id);

            if (bookingError) {
              console.error(`[stripe-webhook] Failed to update booking ${ref}:`, bookingError.message);
              return new Response('Failed to update booking', { status: 500 });
            }

            const { data: existingPayment } = await supabaseAdmin
              .from('payments')
              .select('id')
              .eq('reference', session.id)
              .maybeSingle();

            if (!existingPayment) {
              const { error: paymentError } = await supabaseAdmin.from('payments').insert({
                booking_id: booking.id,
                amount: amount / 100,
                currency: (session.currency ?? 'gbp').toUpperCase(),
                method: session.payment_method_types?.[0] ?? 'card',
                status: 'paid',
                reference: session.id,
                notes: `Stripe Checkout session ${session.id} (${env})`,
                paid_at: paidAt,
              });

              if (paymentError) {
                console.error(`[stripe-webhook] Failed to insert payment for ${ref}:`, paymentError.message);
                return new Response('Failed to record payment', { status: 500 });
              }
            }

            console.log(`[stripe-webhook] Booking ${ref} marked as paid and confirmed`);
            return new Response('ok', { status: 200 });
          } catch (err: any) {
            console.error('[stripe-webhook] Error processing checkout.session.completed:', err.message);
            return new Response('Internal error', { status: 500 });
          }
        }

        return new Response('ok', { status: 200 });
      },
    },
  },
});
