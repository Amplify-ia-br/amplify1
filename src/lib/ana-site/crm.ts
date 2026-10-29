import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteHandoff } from './tools.js';
import { readServerEnv } from '../ana-zero/env.js';

export const REGION_TAGS = ['ana-region-nordeste', 'ana-region-sp', 'ana-region-df', 'ana-region-sul'];
export function regionTag(uf?: string) {
  return 'AL BA CE MA PB PE PI RN SE'.split(' ').includes(uf || '') ? REGION_TAGS[0]
    : uf === 'SP' ? REGION_TAGS[1] : uf === 'DF' ? REGION_TAGS[2]
    : 'PR SC RS ES'.split(' ').includes(uf || '') ? REGION_TAGS[3] : null;
}
type Delivery = { id: string; conversation_id: string; payload: SiteHandoff & { origin: string }; contact_id?: string; opportunity_id?: string; note_id?: string; status: string; routing_prepared?: boolean };
export async function deliverToCrm(client: SupabaseClient, deliveryId: string, fetcher: typeof fetch = fetch) {
  if (readServerEnv('ANA_SITE_CRM_ENABLED') !== 'true') return 'pending' as const;
  const lock = crypto.randomUUID();
  const claim = await client.rpc('claim_ana_site_delivery', { p_id: deliveryId, p_token: lock });
  if (claim.error || !claim.data) return 'pending' as const;
  const delivery = claim.data as Delivery;
  if (delivery.status === 'delivered') return 'delivered' as const;
  const h = delivery.payload;
  const token = readServerEnv('GHL_PRIVATE_INTEGRATION_TOKEN') || readServerEnv('GHL_PRIVATE_TOKEN');
  const locationId = readServerEnv('GHL_LOCATION_ID');
  const leonardoId = readServerEnv('GHL_ANA_LEONARDO_ID');
  async function checkpoint(values: Record<string, unknown>) {
    const result = await client.from('ana_site_deliveries').update(values).eq('id', delivery.id).eq('lock_token', lock).select('id').single();
    if (result.error || !result.data) throw new Error('delivery_checkpoint_failed');
  }
  async function ghl(path: string, method: string, body?: unknown) {
    const response = await fetcher(`https://services.leadconnectorhq.com${path}`, {
      method, signal: AbortSignal.timeout(10000),
      headers: { authorization: `Bearer ${token}`, version: '2021-07-28', 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`crm_http_${response.status}`);
    return response.json();
  }
  try {
    if (!token || !locationId || (h.route !== 'leia' && !leonardoId)) throw new Error('crm_not_configured');
    let contactId = delivery.contact_id;
    if (!contactId) {
      const contact = await ghl('/contacts/upsert', 'POST', { locationId,
        ...(h.contact.includes('@') ? { email: h.contact.toLowerCase() } : { phone: h.contact }),
        companyName: h.organization, state: h.uf, source: 'ANA · CRIATOWN', createNewIfDuplicateAllowed: false,
        ...(h.route === 'other' ? { assignedTo: leonardoId } : {}),
      });
      contactId = contact.contact?.id;
      if (!contactId) throw new Error('contact_not_confirmed');
      await checkpoint({ contact_id: contactId });
    }
    let opportunityId = delivery.opportunity_id;
    if (h.route === 'leia' && !opportunityId) {
      const pipelineId = readServerEnv('GHL_ANA_LEIA_PIPELINE_ID');
      const pipelineStageId = readServerEnv('GHL_ANA_LEIA_STAGE_ID');
      if (!pipelineId || !pipelineStageId) throw new Error('leia_pipeline_not_configured');
      const opportunity = await ghl('/opportunities/upsert', 'POST', { locationId, contactId, pipelineId, pipelineStageId,
        name: `${h.organization} · L.E.I.A. · ANA`, status: 'open' });
      opportunityId = opportunity.opportunity?.id;
      if (!opportunityId) throw new Error('opportunity_not_confirmed');
      await checkpoint({ opportunity_id: opportunityId });
    }
    if (!delivery.note_id) {
      // Search the stable marker before retrying a note after a network interruption.
      const marker = `[ANA:${delivery.id}]`;
      const previous = await ghl(`/contacts/${contactId}/notes`, 'GET');
      const existing = previous.notes?.find((n: { body?: string }) => n.body?.includes(marker));
      const result = existing || (await ghl(`/contacts/${contactId}/notes`, 'POST', { body: `${marker}\nOrigem: ${h.origin}\nResumo: ${h.summary}\nPapel: ${h.role || 'Não informado'}\nUF: ${h.uf || 'Não informada'}\nAutorização para contato: ${h.consentQuote}` })).note;
      if (!result?.id) throw new Error('note_not_confirmed');
      await checkpoint({ note_id: result.id });
    }
    const current = await ghl(`/contacts/${contactId}`, 'GET');
    if (h.route === 'leia') {
      if (!delivery.routing_prepared) {
        await ghl(`/contacts/${contactId}/tags`, 'DELETE', { tags: [...REGION_TAGS, 'ana-handoff-ready'] });
        // Existing contacts can have an unrelated owner. A new assignment must
        // come from this workflow run, not from the previous contact state.
        await ghl(`/contacts/${contactId}`, 'PUT', { assignedTo: null });
        const unassigned = await ghl(`/contacts/${contactId}`, 'GET');
        if (unassigned.contact?.assignedTo) throw new Error('regional_assignment_reset_pending');
        await checkpoint({ routing_prepared: true });
      }
      if (!delivery.routing_prepared || !current.contact?.tags?.includes('ana-handoff-ready')) {
        await ghl(`/contacts/${contactId}/tags`, 'POST', { tags: ['ana-site', 'ana-leia', ...(regionTag(h.uf) ? [regionTag(h.uf)] : [])] });
        await ghl(`/contacts/${contactId}/tags`, 'POST', { tags: ['ana-handoff-ready'] });
      }
      // Do not rerun the distribution workflow on retries. Wait for its confirmed owner.
      let owner: string | undefined;
      for (let attempt=0; attempt<5; attempt++) {
        await new Promise(resolve=>setTimeout(resolve,1000));
        const routed = await ghl(`/contacts/${contactId}`, 'GET');
        owner = routed.contact?.assignedTo;
        if(owner) break;
      }
      if (!owner) throw new Error('regional_assignment_pending');
      await ghl(`/opportunities/${opportunityId}`, 'PUT', { assignedTo: owner });
      const opportunity = await ghl(`/opportunities/${opportunityId}`, 'GET');
      if (opportunity.opportunity?.assignedTo !== owner) throw new Error('opportunity_owner_not_confirmed');
    } else {
      await ghl(`/contacts/${contactId}`, 'PUT', { assignedTo: leonardoId });
      const assigned = await ghl(`/contacts/${contactId}`, 'GET');
      if (assigned.contact?.assignedTo !== leonardoId) throw new Error('owner_not_confirmed');
      await ghl(`/contacts/${contactId}/tags`, 'POST', { tags: ['ana-site', 'ana-triagem-leonardo'] });
    }
    await checkpoint({ status: 'delivered', delivered_at: new Date().toISOString(), last_error: null, lock_token: null, locked_until: null });
    return 'delivered' as const;
  } catch (error) {
    await checkpoint({ status: 'pending', last_error: error instanceof Error ? error.message.slice(0,100) : 'delivery_failed', lock_token: null, locked_until: null }).catch(() => {});
    return 'pending' as const;
  }
}
