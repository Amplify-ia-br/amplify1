// Integration harness: real persistence and HTTP handler, deterministic model fixture.
import assert from 'node:assert/strict';
import { handleAnaSite } from '../src/lib/ana-site/http';
import { getServerClient } from '../src/lib/ana/store';
import { fileKnowledgeService } from '../src/lib/okf/file-service';
const client=getServerClient()!;
if(!client)throw new Error('Database credential missing');
const key=crypto.randomUUID();const requestId=crypto.randomUUID();let calls=0;
const result={text:'O L.E.I.A. é um programa de fluência em IA para estudantes.',memory:[],toolCalls:[],sources:[{id:'leia',title:'L.E.I.A.'}],regenerated:false,issues:[],errors:[],resolvedModel:'fixture',usage:{inputTokens:0,outputTokens:0,totalTokens:0}};
const deps={client,run:async()=>{calls++;return result;},rateLimit:async()=>({allowed:true as const,configured:true as const,remaining:99,resetAt:123})};
const body={conversationId:key,messageId:requestId,message:'Como funciona o LEIA?',context:{pageId:'leia',sectionId:'programa'}};
const authorization=`Bearer ${process.env.ANA_SITE_PROXY_SECRET}`;
const request=(cookie?:string,b=body)=>new Request('https://ana.example/api/ana-site',{method:'POST',headers:{authorization,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(b)});
let cid:string|undefined;
try{
 const first=await handleAnaSite(request(),fileKnowledgeService,deps as any);assert.equal(first.status,200);
 const cookie=first.headers.get('set-cookie')!.split(';')[0];assert.match(cookie,/ana_session=/);
 const one=await first.json();assert.equal(one.message,result.text);
 const repeat=await handleAnaSite(request(cookie),fileKnowledgeService,deps as any);assert.equal(repeat.status,200);assert.equal(calls,1);assert.deepEqual(await repeat.json(),one);
 const resume=await handleAnaSite(new Request(`https://ana.example/api/ana-site?conversationId=${key}`,{headers:{authorization,cookie}}),fileKnowledgeService,deps as any);assert.equal(resume.status,200);assert.equal((await resume.json()).messages.length,2);
 const stolen=await handleAnaSite(request(undefined,{...body,messageId:crypto.randomUUID()}),fileKnowledgeService,deps as any);assert.equal(stolen.status,403);
 const malformed=await handleAnaSite(request('ana_session=%',{...body,messageId:crypto.randomUUID()}),fileKnowledgeService,deps as any);assert.equal(malformed.status,403);assert.ok(malformed.headers.get('set-cookie'));
 const unauth=await handleAnaSite(new Request('https://ana.example/api/ana-site',{method:'POST'}),fileKnowledgeService,deps as any);assert.equal(unauth.status,401);
 const injected=await handleAnaSite(request(cookie,{...body,model:'client-selected'} as any),fileKnowledgeService,deps as any);assert.equal(injected.status,400);
 const broken=await handleAnaSite(request(cookie,{...body,messageId:crypto.randomUUID()}),fileKnowledgeService,{...deps,run:async()=>{throw Error('test network failure')}} as any);assert.equal(broken.status,502);
 const handoff={summary:'Pedido sintético de teste',consentQuote:'Pode compartilhar meu contato',contact:'ana-qa@example.invalid',route:'other',routeEvidence:'Quero falar com o time'};
 const handoffDeps={...deps,run:async()=>({...result,handoff}),deliver:async()=> 'pending'};
 for(let i=0;i<2;i++){
  const response=await handleAnaSite(request(cookie,{...body,messageId:crypto.randomUUID()}),fileKnowledgeService,handoffDeps as any);assert.equal(response.status,200);assert.equal((await response.json()).handoff,'pending');
 }
 const conv=await client.from('ana_conversations').select('id').eq('conversation_key',key).single();
 const deliveries=()=>client.from('ana_site_deliveries').select('id').eq('conversation_id',conv.data!.id);
 assert.equal((await deliveries()).data?.length,1);
 handoff.contact='ana-qa-correction@example.invalid';
 const correction=await handleAnaSite(request(cookie,{...body,messageId:crypto.randomUUID()}),fileKnowledgeService,handoffDeps as any);assert.equal(correction.status,200);
 assert.equal((await deliveries()).data?.length,2);
 console.log('PASS: real database persistence, cookie resume, replay, session isolation, proxy authentication, injection rejection, model failure, durable outbox, deduplication and contact correction. Model and delivery were deterministic fixtures; CRM was not called.');
}finally{
 const found=await client.from('ana_conversations').select('id').eq('conversation_key',key).maybeSingle();cid=found.data?.id;
 if(cid){const cleanup=await client.from('ana_conversations').delete().eq('id',cid).eq('conversation_key',key);if(cleanup.error)throw cleanup.error;}
}
