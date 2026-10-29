import type { SupabaseClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { resolveAnaSession } from '../ana/session.js';
import { getServerClient, checkAnaRateLimit } from '../ana/store.js';
import { ANA_ZERO_TECHNICAL_REPLY } from '../ana-zero/guardrails.js';
import { runAnaZeroTurn } from '../ana-zero/agent.js';
import { ANA_ZERO_DEFAULT_MODEL } from '../ana-zero/schema.js';
import { readServerEnv } from '../ana-zero/env.js';
import type { KnowledgeReader } from '../okf/http.js';
import { ANA_PAGES, ANA_UUID, parseAnaRequest, contextInstruction } from './context.js';
import { deliverToCrm } from './crm.js';
import { handoffKey, type SiteHandoff } from './tools.js';

const HEADERS = { 'cache-control':'no-store', 'x-robots-tag':'noindex, nofollow', 'x-content-type-options':'nosniff' };
const json = (data: unknown,status=200,extra: Record<string,string>={}) => Response.json(data,{status,headers:{...HEADERS,...extra}});
export function authenticProxy(request: Request,secret: string | undefined) {
 const actual = request.headers.get('authorization')?.replace(/^Bearer /,'') || '';
 return Boolean(secret && Buffer.byteLength(secret) === Buffer.byteLength(actual) && timingSafeEqual(Buffer.from(actual),Buffer.from(secret)));
}
async function boundedJson(request: Request) {
 const reader=request.body?.getReader(); if(!reader) throw new Error('body');
 let size=0; const parts:Uint8Array[]=[];
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>18000){await reader.cancel();throw new Error('size');}parts.push(r.value);}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export type Dependencies = { client?: SupabaseClient; run?: typeof runAnaZeroTurn; session?: typeof resolveAnaSession; rateLimit?: typeof checkAnaRateLimit; deliver?: typeof deliverToCrm };
export async function handleAnaSite(request:Request,reader:KnowledgeReader,deps:Dependencies={}) {
 if(readServerEnv('ANA_SITE_ENABLED')!=='true')return json({message:'A ANA está temporariamente indisponível.'},503);
 if(!authenticProxy(request,readServerEnv('ANA_SITE_PROXY_SECRET')))return json({message:'Acesso não autorizado.'},401);
 if(!['POST','GET'].includes(request.method))return json({message:'Método inválido.'},405);
 const client=deps.client ?? getServerClient(); if(!client)return json({message:'Conversa indisponível.'},503);
 let session;
 try { session=await (deps.session ?? resolveAnaSession)(request); }
 catch {
  // A malformed encoded cookie is untrusted input, not a server failure.
  const cleanHeaders=new Headers(request.headers);cleanHeaders.delete('cookie');
  session=await (deps.session ?? resolveAnaSession)(new Request(request.url,{headers:cleanHeaders}));
 }
 if(!session)return json({message:'Sessão indisponível.'},503);
 const headers=session.setCookie ? {'set-cookie':session.setCookie} : {};
 const url=new URL(request.url);
 if(request.method==='GET'){
  const key=url.searchParams.get('conversationId');if(!key||!ANA_UUID.test(key))return json({message:'Conversa inválida.'},400,headers);
  const found=await client.from('ana_conversations').select('id').eq('conversation_key',key).eq('session_hash',session.sessionHash).maybeSingle();
  if(found.error)return json({message:'Conversa indisponível.'},503,headers);
  if(!found.data)return json({message:'Conversa não encontrada.'},404,headers);
  const messages=await client.from('ana_messages').select('role,content,created_at').eq('conversation_id',found.data.id).in('role',['user','assistant']).order('created_at',{ascending:false}).limit(80);
  if(messages.error)return json({message:'Conversa indisponível.'},503,headers);
  return json({conversationId:key,messages:messages.data.reverse().map(({role,content})=>({role,content}))},200,headers);
 }
 let body;try{body=parseAnaRequest(await boundedJson(request));}catch{return json({message:'Mensagem inválida.'},400,headers);}
 if(!body)return json({message:'Mensagem ou contexto inválido.'},400,headers);
 const identity=`ana-site:${session.sessionHash}`;
 const rate=deps.rateLimit ?? checkAnaRateLimit;
 // Separate session and trusted-proxy IP buckets prevent cookie resets from bypassing limits.
 const ip=request.headers.get('x-ana-client-ip');
 const hash=async(text:string)=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');
 for(const [key,limit,seconds] of [[identity,30,300],[identity+':day',200,86400],...(ip&&ip!=='unknown' ? [[`ana-site:ip:${ip}`,100,300]] : [])] as [string,number,number][]){
  const allowed=await rate(await hash(key),limit,seconds);if(!allowed.allowed)return json({message:'Aguarde um pouco antes de tentar novamente.'},'reason' in allowed ? 503 : 429,{...headers,'retry-after':String(seconds)});
 }
 const page=ANA_PAGES[body.context.pageId];
 const claimed=await client.rpc('begin_ana_site_turn',{p_key:body.conversationId,p_hash:session.sessionHash,p_request:body.messageId,p_path:page.path,p_context:`${body.context.pageId}:${body.context.sectionId}`});
 if(claimed.error)return json({message:'Conversa indisponível.'},503,headers);
 const claim=claimed.data;
 if(claim?.kind==='forbidden')return json({message:'Conversa não encontrada.'},403,headers);
 if(claim?.kind==='busy')return json({message:'Aguarde a resposta anterior e tente novamente.'},409,headers);
 if(claim?.kind==='cached')return json(claim.response,200,headers);
 if(claim?.kind!=='ready')return json({message:'Conversa indisponível.'},503,headers);
 try{
  const turn=await (deps.run ?? runAnaZeroTurn)({model:ANA_ZERO_DEFAULT_MODEL,reader,history:[...claim.history,{role:'user',text:body.message}],memory:claim.memory,pagePath:page.path,siteContext:contextInstruction(body.context),signal:AbortSignal.timeout(48000)});
  if(turn.text === ANA_ZERO_TECHNICAL_REPLY)throw new Error('generation_failed');
  const handoff=turn.handoff as SiteHandoff|undefined;
  const dedupeKey=handoff ? await handoffKey(handoff) : undefined;
  let message=handoff ? 'Anotei seu pedido para o time dar sequência. A entrega ao responsável ainda está sendo confirmada.' : turn.text;
  const result={conversationId:body.conversationId,message,...(handoff?{handoff:'pending'}:{})};
  const saved=await client.rpc('finish_ana_site_turn',{p_id:claim.id,p_hash:session.sessionHash,p_request:body.messageId,p_user:body.message,p_assistant:message,p_memory:turn.memory,p_response:result,p_handoff:handoff?{...handoff,origin:page.path,dedupeKey}:null,p_metadata:{engine:'ana-site',promptVersion:'2026-10-29.1',context:body.context,sources:turn.sources,model:turn.resolvedModel,errors:turn.errors.map(()=> 'generation_error')}});
  if(saved.error||!saved.data)throw new Error('save_failed');
  if(handoff){
   const queued=await client.from('ana_site_deliveries').select('id').eq('conversation_id',claim.id).eq('payload->>dedupeKey',dedupeKey!).single();
   const delivered=queued.data ? await (deps.deliver ?? deliverToCrm)(client,queued.data.id) : 'pending';
   if(delivered==='delivered'){
    message='Seu pedido foi encaminhado ao time responsável, com o contexto desta conversa.';
    Object.assign(result,{message,handoff:'delivered'});
    // A successful delivery persists its exact wording for replay and navigation.
    await client.from('ana_messages').update({content:message,metadata:{siteResponse:result,engine:'ana-site',context:body.context}}).eq('conversation_id',claim.id).eq('external_id',`assistant:${body.messageId}`);
   }
  }
  return json(result,200,headers);
 }catch{
  await client.from('ana_site_state').update({lock_token:null,locked_until:null}).eq('conversation_id',claim.id).eq('lock_token',body.messageId);
  return json({message:'Não foi possível responder agora. Tente novamente.'},502,headers);
 }
}
