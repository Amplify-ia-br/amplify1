import { describe,it,expect } from 'vitest';
import { validateSiteHandoff, stateMatches, handoffKey, type SiteHandoff } from './tools';
import { parseAnaRequest,resolveContext,contextInstruction } from './context';
import { authenticProxy } from './http';
import { regionTag } from './crm';
const handoff:SiteHandoff={summary:'Solicitou apresentação',consentQuote:'Pode compartilhar meu contato',contact:'11987654321',route:'leia',routeEvidence:'Quero conhecer o LEIA',organization:'Escola Exemplo',role:'Direção',uf:'SP',ufEvidence:'São Paulo'};
const texts=['Quero conhecer o LEIA','Escola Exemplo','Direção','São Paulo','Pode compartilhar meu contato','11987654321'];
describe('entrada pública da ANA',()=>{
 it('aceita somente páginas e seções registradas',()=>{expect(resolveContext({pageId:'leia',sectionId:'caminho'})).toBeTruthy();expect(resolveContext({pageId:'qr',sectionId:'inicio'})).toBeNull();expect(resolveContext({pageId:'home',sectionId:'caminho'})).toBeNull();});
 it('não aceita histórico, modelo ou prompt controlado pelo cliente',()=>{const input={conversationId:crypto.randomUUID(),messageId:crypto.randomUUID(),message:'oi',context:{pageId:'leia',sectionId:'inicio'}};expect(parseAnaRequest(input)).toBeTruthy();for(const k of ['memory','messages','model','prompt'])expect(parseAnaRequest({...input,[k]:'fake'})).toBeNull();});
 it('a página de obrigado não prova envio e a página não prova perfil',()=>{expect(contextInstruction({pageId:'thanks',sectionId:'inicio'})).toContain('não comprova');expect(contextInstruction({pageId:'leia',sectionId:'inicio'})).toContain('Não infira');});
 it('rejeita acesso sem segredo entre servidores',()=>{expect(authenticProxy(new Request('https://example.test'),undefined)).toBe(false);expect(authenticProxy(new Request('https://example.test',{headers:{authorization:'Bearer wrong'}}),'secret')).toBe(false);expect(authenticProxy(new Request('https://example.test',{headers:{authorization:'Bearer secret'}}),'secret')).toBe(true);});
});
describe('encaminhamento com evidência',()=>{
 it('deduplica repetições mas preserva correção de contato ou frente',async()=>{
  const key=await handoffKey(handoff);
  expect(await handoffKey({...handoff,contact:'(11) 98765-4321',summary:'Novo resumo'})).toBe(key);
  expect(await handoffKey({...handoff,route:'other'})).not.toBe(key);
  expect(await handoffKey({...handoff,contact:'21987654321'})).not.toBe(key);
 });
 it('aceita contato autorizado e região declarada',()=>expect(validateSiteHandoff(handoff,texts)).toBeNull());
 it('recusa preferência de canal como autorização',()=>expect(validateSiteHandoff({...handoff,consentQuote:'WhatsApp'},[...texts,'WhatsApp'])).toBe('explicit_consent_required'));
 it('recusa negação',()=>expect(validateSiteHandoff({...handoff,consentQuote:'Não quero compartilhar meu contato'},[...texts,'Não quero compartilhar meu contato'])).toBe('explicit_consent_required'));
 it('não transforma um sim antigo em autorização',()=>expect(validateSiteHandoff({...handoff,consentQuote:'sim'},[...texts,'sim'],[{role:'assistant',text:'Quer conhecer o programa?'},{role:'user',text:'sim'}])).toBe('explicit_consent_required'));
 it('aceita sim após pergunta explícita de autorização',()=>expect(validateSiteHandoff({...handoff,consentQuote:'sim'},[...texts,'sim'],[{role:'assistant',text:'Posso passar seu WhatsApp para um especialista continuar a conversa?'},{role:'user',text:'sim'}])).toBeNull());
 it('aceita pode após pergunta sobre encaminhamento',()=>expect(validateSiteHandoff({...handoff,consentQuote:'pode'},[...texts,'pode'],[{role:'assistant',text:'Posso encaminhar seu contato e o resumo para Leonardo?'},{role:'user',text:'pode'}])).toBeNull());
 it('respeita retirada posterior da autorização',()=>expect(validateSiteHandoff(handoff,[...texts,'Não autorizo mais'],[{role:'user',text:handoff.consentQuote},{role:'user',text:'Não autorizo mais'}])).toBe('consent_withdrawn'));
 it('não infere UF de texto arbitrário nem da página',()=>{expect(validateSiteHandoff({...handoff,ufEvidence:'Direção'},texts)).toBe('state_required');expect(stateMatches('SP','São Paulo')).toBe(true);expect(stateMatches('SP','Somos de SP.')).toBe(true);expect(stateMatches('PA','São Paulo')).toBe(false);});
 it('pede escola e papel somente quando faltam para LEIA',()=>{expect(validateSiteHandoff({...handoff,organization:undefined},texts)).toBe('school_and_role_required');expect(validateSiteHandoff({...handoff,route:'other',organization:undefined,uf:undefined},texts)).toBeNull();});
 it('aproveita a UF por extenso dentro da frase sem pedir novamente',()=>{expect(stateMatches('DF','Sou diretor de uma escola no Distrito Federal.')).toBe(true);expect(stateMatches('SP','A escola fica em São Paulo.')).toBe(true);expect(stateMatches('PA','Escola na Paraíba')).toBe(false);});
 it('não aceita contato inventado',()=>expect(validateSiteHandoff({...handoff,contact:'21987654321'},texts)).toBe('valid_contact_required'));
 it('preserva as cinco rotas regionais',()=>{expect(regionTag('SP')).toBe('ana-region-sp');expect(regionTag('BA')).toBe('ana-region-nordeste');expect(regionTag('DF')).toBe('ana-region-df');expect(regionTag('ES')).toBe('ana-region-sul');expect(regionTag('SC')).toBe('ana-region-sul');expect(regionTag('RJ')).toBeNull();});
});
