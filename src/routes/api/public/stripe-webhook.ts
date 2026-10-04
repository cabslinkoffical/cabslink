import { createFileRoute } from '@tanstack/react-router';
import type Stripe from 'stripe';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';

/**
 * Stripe webhook. The environment is not taken from the URL: the event is
 * accepted only if its signature verifies against the live or sandbox signing
 * secret, and sandbox events are ignored on production hosts.
 */
function verifyEvent(payload: string, signature: string): { event: Stripe.Event; env: StripeEnv; stripe: Stripe } | null {
  const candidates: Array<[StripeEnv, string | undefined]> = [
    ['live', process.env['PAYMENTS_LIVE_WEBHOOK_SECRET']],
    ['sandbox', process.env['PAYMENTS_SANDBOX_WEBHOOK_SECRET']],
  ];
  for (const [env, secret] of candidates) {
    if (!secret) continue;
    try {
      const stripe = createStripeClient(env);
      const event = stripe.webhooks.constructEvent(payload, signature, secret);
      return { event, env, stripe };
    } catch {
      /* try the next secret */
    }
  }
  return null;
}

export const Route = createFileRoute('/api/public/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('stripe-signature');
        if (!signature) return new Response('Missing stripe-signature header', { status: 400 });

        const payload = await request.text();
        const verified = verifyEvent(payload, signature);
        if (!verified) {
          console.error('[stripe-webhook] Signature verification failed');
          return new Response('Webhook signature verification failed', { status: 400 });
        }
        const { event, env, stripe } = verified;

        const lib = await import('@/lib/stripe-payments.server');
        if (env === 'sandbox' && lib.resolveStripeEnvForHost(lib.hostFromRequest(request)) === 'live') {
          console.warn(`[stripe-webhook] Ignoring sandbox ${event.type} on a production host`);
          return new Response('ignored', { status: 200 });
        }

        console.log(`[stripe-webhook] Received ${event.type} (${env})`);
        try {
          const deps = await lib.defaultPaymentDeps();
          switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
              const res = await lib.applyPaidSession(
                { session: event.data.object as Stripe.Checkout.Session, env, stripe, eventCreated: event.created },
                deps,
              );
              if (!res.applied && res.reason === 'update_failed') {
                return new Response('Failed to update booking', { status: 500 });
              }
              break;
            }
            case 'checkout.session.expired':
              await lib.handleSessionExpired(event.data.object as Stripe.Checkout.Session, env, deps);
              break;
            case 'charge.refunded':
              await lib.handleChargeRefunded(event.data.object as Stripe.Charge, env, deps);
              break;
            case 'charge.dispute.created':
              await lib.handleDisputeCreated(event.data.object as Stripe.Dispute, env, deps);
              break;
            default:
              break;
          }
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error(`[stripe-webhook] Error processing ${event.type}:`, err?.message);
          return new Response('Internal error', { status: 500 });
        }
      },
    },
  },
});
