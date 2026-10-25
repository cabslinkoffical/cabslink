import { createFileRoute } from '@tanstack/react-router';
import type Stripe from 'stripe';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';

/**
 * Stripe webhook at the path Lovable's built-in payments registers
 * (/api/public/payments/webhook?env=sandbox|live). The environment comes from
 * the query parameter; the event is only accepted if its signature verifies
 * against that environment's signing secret (the other secret is tried as a
 * fallback). Sandbox events are ignored on production hosts.
 */
function verifyEvent(
  payload: string,
  signature: string,
  env: StripeEnv,
): { event: Stripe.Event; env: StripeEnv; stripe: Stripe } | null {
  const candidates: Array<[StripeEnv, string | undefined]> = [
    [env, env === 'sandbox' ? process.env['PAYMENTS_SANDBOX_WEBHOOK_SECRET'] : process.env['PAYMENTS_LIVE_WEBHOOK_SECRET']],
    [env === 'sandbox' ? 'live' : 'sandbox', env === 'sandbox' ? process.env['PAYMENTS_LIVE_WEBHOOK_SECRET'] : process.env['PAYMENTS_SANDBOX_WEBHOOK_SECRET']],
  ];
  for (const [candidateEnv, secret] of candidates) {
    if (!secret) continue;
    try {
      const stripe = createStripeClient(candidateEnv);
      const event = stripe.webhooks.constructEvent(payload, signature, secret);
      return { event, env: candidateEnv, stripe };
    } catch {
      /* try the next secret */
    }
  }
  return null;
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('[payments-webhook] Invalid or missing env query parameter:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;

        const signature = request.headers.get('stripe-signature');
        if (!signature) return new Response('Missing stripe-signature header', { status: 400 });

        const payload = await request.text();
        const verified = verifyEvent(payload, signature, env);
        if (!verified) {
          console.error('[payments-webhook] Signature verification failed');
          return new Response('Webhook signature verification failed', { status: 400 });
        }
        const { event, env: verifiedEnv, stripe } = verified;

        const lib = await import('@/lib/stripe-payments.server');
        if (lib.sandboxRejected(verifiedEnv) || (verifiedEnv === 'sandbox' && lib.resolveStripeEnvForHost(lib.hostFromRequest(request)) === 'live')) {
          console.warn(`[payments-webhook] Ignoring sandbox ${event.type} in production`);
          const deps = await lib.defaultPaymentDeps();
          await lib.logPaymentActivity(deps.db, 'payment_sandbox_rejected', null, {
            event_id: event.id, event_type: event.type, environment: verifiedEnv,
          });
          return new Response('ignored', { status: 200 });
        }

        console.log(`[payments-webhook] Received ${event.type} (${verifiedEnv})`);
        try {
          const deps = await lib.defaultPaymentDeps();
          switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
              const res = await lib.applyPaidSession(
                { session: event.data.object as Stripe.Checkout.Session, env: verifiedEnv, stripe, eventCreated: event.created },
                deps,
              );
              if (!res.applied && res.reason === 'update_failed') {
                return new Response('Failed to update booking', { status: 500 });
              }
              break;
            }
            case 'checkout.session.expired':
              await lib.handleSessionExpired(event.data.object as Stripe.Checkout.Session, verifiedEnv, deps);
              break;
            case 'charge.refunded':
              await lib.handleChargeRefunded(event.data.object as Stripe.Charge, verifiedEnv, deps);
              break;
            case 'charge.dispute.created':
              await lib.handleDisputeCreated(event.data.object as Stripe.Dispute, verifiedEnv, deps);
              break;
            default:
              break;
          }
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error(`[payments-webhook] Error processing ${event.type}:`, err?.message);
          return new Response('Internal error', { status: 500 });
        }
      },
    },
  },
});
