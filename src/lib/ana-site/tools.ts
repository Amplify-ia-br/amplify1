import { tool } from 'ai';
import { z } from 'zod-v4';
import type { KnowledgeReader } from '../okf/http.js';
import { createAnaZeroTools, isExplicitHandoffConsent, isValidHandoffContact, quoteIsFromUser, type AnaZeroToolState } from '../ana-zero/tools.js';

export const STATES = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
export type SiteHandoff = { summary: string; consentQuote: string; contact: string; route: 'leia' | 'other'; routeEvidence: string; uf?: string; ufEvidence?: string; organization?: string; role?: string };
export async function handoffKey(h: SiteHandoff) {
  const contact = h.contact.includes('@') ? h.contact.trim().toLowerCase() : h.contact.replace(/\D/g, '');
  const parts = [h.route, contact, h.uf || '', h.organization || '', h.role || ''].map(s => s.trim().toLowerCase());
  return Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parts)))).toString('hex');
}
const UF_NAMES: Record<string,string> = {AC:'acre',AL:'alagoas',AP:'amapa',AM:'amazonas',BA:'bahia',CE:'ceara',DF:'distrito federal',ES:'espirito santo',GO:'goias',MA:'maranhao',MT:'mato grosso',MS:'mato grosso do sul',MG:'minas gerais',PA:'para',PB:'paraiba',PR:'parana',PE:'pernambuco',PI:'piaui',RJ:'rio de janeiro',RN:'rio grande do norte',RS:'rio grande do sul',RO:'rondonia',RR:'roraima',SC:'santa catarina',SP:'sao paulo',SE:'sergipe',TO:'tocantins'};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function stateMatches(uf:string,evidence:string){
 const s=normalize(evidence).trim();
 return new RegExp(`(?:^|[\\s,/-])${uf.toLowerCase()}(?:$|[\\s,.!/-])`).test(s) || s===UF_NAMES[uf] || (uf==='DF' && s==='brasilia');
}
export function validateSiteHandoff(h: SiteHandoff, texts: string[], history?: Array<{role:string;text:string}>) {
  if (/\b(n[aã]o|nunca|jamais|recuso)\b/i.test(h.consentQuote) || !quoteIsFromUser(h.consentQuote, texts) || !isExplicitHandoffConsent(h.consentQuote)) return 'explicit_consent_required';
  if(history){
    let index=-1;
    for(let i=history.length-1;i>=0;i--){if(history[i].role==='user' && quoteIsFromUser(h.consentQuote,[history[i].text])){index=i;break;}}
    const direct=/\b(?:autorizo|pode(?:m)?|aceito|quero)\b.{0,70}(?:contato|compartilhar|passar|encaminhar|chamar|whats|telefone|especialista)/i.test(h.consentQuote);
    const asked=index>0 && history[index-1].role==='assistant' && /(?:posso|podemos|autoriza).{0,90}(?:passar|compartilhar|encaminhar|enviar).{0,90}(?:contato|whats|telefone)/i.test(history[index-1].text);
    if(!direct&&!asked)return 'explicit_consent_required';
    if(history.slice(index+1).some(t=>t.role==='user' && /(?:n[aã]o quero|n[aã]o autorizo|n[aã]o passe|n[aã]o compartilhe|cancele|desisti)/i.test(t.text)))return 'consent_withdrawn';
  }
  if (!quoteIsFromUser(h.contact, texts) || !isValidHandoffContact(h.contact)) return 'valid_contact_required';
  if (!quoteIsFromUser(h.routeEvidence, texts)) return 'route_evidence_required';
  // A page visit cannot establish interest in L.E.I.A. Explicit words or a confirmed
  // answer to the topic question must be provided as a user quote.
  if (h.route === 'leia' && !/l\.?\s*e\.?\s*i\.?\s*a\.?|laborat[oó]rio escolar/i.test(h.routeEvidence)) return 'confirm_leia_interest';
  if (h.route === 'leia' && (!STATES.includes(h.uf || '') || !h.ufEvidence || !quoteIsFromUser(h.ufEvidence, texts) || !stateMatches(h.uf!, h.ufEvidence!))) return 'state_required';
  if (h.organization && !quoteIsFromUser(h.organization, texts)) return 'organization_evidence_required';
  if (h.role && !quoteIsFromUser(h.role, texts)) return 'role_evidence_required';
  if (h.route === 'leia' && (!h.organization || !h.role)) return 'school_and_role_required';
  return null;
}
export function createSiteTools(reader: KnowledgeReader, state: AnaZeroToolState, userTexts: string[], history?: Array<{role:string;text:string}>) {
  return { ...createAnaZeroTools(reader, state, userTexts), request_handoff: tool({
    description: 'Registra pedido de atendimento humano com autorização explícita e contato válido, nunca agenda. route=leia somente com interesse explícito em L.E.I.A.; exige escola, papel e UF declarados. Demais assuntos vão para Leonardo. Peça apenas dados que ainda faltam, uma pergunta por vez. Não afirme entrega: a aplicação confirmará depois do CRM.',
    inputSchema: z.object({
      summary: z.string().min(1).max(1500), consentQuote: z.string().min(2).max(400), contact: z.string().min(3).max(200),
      route: z.enum(['leia', 'other']), routeEvidence: z.string().min(2).max(400),
      uf: z.string().length(2).optional(), ufEvidence: z.string().min(2).max(200).optional(),
      organization: z.string().min(2).max(200).optional(), role: z.string().min(2).max(200).optional(),
    }),
    execute: async (handoff: SiteHandoff) => {
      const error = validateSiteHandoff(handoff, userTexts, history);
      if (error) return { ok: false, error };
      state.toolCalls.push('request_handoff'); state.handoff = handoff;
      return { ok: true, status: 'pending_delivery' };
    },
  }) };
}
