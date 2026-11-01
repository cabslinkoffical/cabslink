import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ row: null as any, fail: false, endpointFail: false }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  rpc: vi.fn(async () => {
    const r = state.row;
    if (!r || !(r.status === 'pending' || r.status === 'sending' && (!r.lease_expires_at || Date.parse(r.lease_expires_at) <= Date.now()))) return { data: null, error: null };
    r.status = 'sending'; r.lease_expires_at = new Date(Date.now() + 300000).toISOString();
    return { data: structuredClone(r), error: null };
  }),
  from: (table: string) => ({ update: (patch: any) => {
    const q: any = { eq: () => q, select: () => q,
      maybeSingle: async () => {
        if (state.fail) return { data: null, error: { message: 'write failed' } };
        Object.assign(state.row, patch); return { data: { id: state.row.id }, error: null };
      },
      then: (resolve: any) => resolve({ error: state.endpointFail ? { message: 'endpoint write failed' } : null }),
    }; return q;
  } }),
} }));
import { deliverPendingDispatchEvents } from '@/lib/dispatch.server';
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
  state.fail = false; state.endpointFail = false;
  state.row = { id: 'stable-event-id', status: 'sending', lease_expires_at: '2026-10-29T11:59:00Z', event_type: 'booking.updated', payload: {}, attempts: 0,
    endpoint: { id: 'endpoint', active: true, url: 'https://example.invalid', secret: 'test' } };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('reclaims an expired sending lease', async () => {
  expect(await deliverPendingDispatchEvents(1)).toEqual({ processed: 1, delivered: 1, failed: 0 });
  expect(state.row.status).toBe('delivered');
});
it('does not send an unexpired claim', async () => {
  state.row.lease_expires_at = '2026-10-29T12:01:00Z';
  expect(await deliverPendingDispatchEvents()).toEqual({ processed: 0, delivered: 0, failed: 0 });
  expect(fetch).not.toHaveBeenCalled();
});
it('reports failed completion and retries after expiry with the same event ID', async () => {
  state.fail = true;
  expect(await deliverPendingDispatchEvents(1)).toEqual({ processed: 1, delivered: 0, failed: 1 });
  expect(console.error).toHaveBeenCalled(); expect(state.row.status).toBe('sending');
  state.fail = false;
  vi.advanceTimersByTime(300001);
  expect(await deliverPendingDispatchEvents(1)).toEqual({ processed: 1, delivered: 1, failed: 0 });
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls).toHaveLength(2);
  for (const [, init] of calls) {
    expect((init!.headers as any)['x-cabslink-delivery']).toBe('stable-event-id');
    expect(JSON.parse(init!.body as string).id).toBe('stable-event-id');
  }
});
it('reports a failed skipped-state write', async () => {
  state.row.endpoint.active = false; state.fail = true;
  expect((await deliverPendingDispatchEvents(1)).failed).toBe(1);
  expect(fetch).not.toHaveBeenCalled(); expect(state.row.status).toBe('sending');
});
it('reports a failed retry-state write', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('timeout')); state.fail = true;
  expect((await deliverPendingDispatchEvents(1)).failed).toBe(1);
  expect(console.error).toHaveBeenCalled(); expect(state.row.status).toBe('sending');
});
it('reports endpoint-state failures', async () => {
  state.endpointFail = true;
  expect((await deliverPendingDispatchEvents(1)).failed).toBe(1);
  expect(console.error).toHaveBeenCalled();
});
