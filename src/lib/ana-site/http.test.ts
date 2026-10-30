import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleAnaSite } from './http';

afterEach(() => vi.unstubAllEnvs());
describe('unsafe generated output', () => {
  it('does not persist or deliver an unrecorded handoff and releases the turn for retry', async () => {
    vi.stubEnv('ANA_SITE_ENABLED', 'true');
    vi.stubEnv('ANA_SITE_PROXY_SECRET', 'test-secret');
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const rpc = vi.fn(async (..._args: unknown[]) => ({ data: { kind: 'ready', id: 'test-conversation', history: [], memory: [] } }));
    const deliver = vi.fn();
    const request = new Request('https://example.test/api/ana-site', { method: 'POST', headers: { authorization: 'Bearer test-secret' }, body: JSON.stringify({ conversationId: crypto.randomUUID(), messageId: crypto.randomUUID(), message: 'oi', context: { pageId: 'home', sectionId: 'inicio' } }) });
    const response = await handleAnaSite(request, {} as never, {
      client: { from, rpc } as never,
      session: vi.fn(async () => ({ sessionHash: 'test-hash' })) as never,
      rateLimit: vi.fn(async () => ({ allowed: true })) as never,
      run: vi.fn(async () => ({ text: 'Já anotei seu pedido para o time dar sequência.' })) as never,
      deliver,
    });
    expect(response.status).toBe(502);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('begin_ana_site_turn');
    expect(from).toHaveBeenCalledWith('ana_site_state');
    expect(update).toHaveBeenCalledWith({ lock_token: null, locked_until: null });
    expect(deliver).not.toHaveBeenCalled();
  });
});
