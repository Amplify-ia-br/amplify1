// @vitest-environment node
import {describe,it,expect,vi,afterEach} from 'vitest';
import {deliverToCrm} from './crm';
const base={id:'delivery-1',conversation_id:'conversation-1',status:'pending',payload:{summary:'Teste',consentQuote:'Pode compartilhar',contact:'qa@example.invalid',route:'other',origin:'/'}};
function db(delivery:any){
 const checkpoints:any[]=[];
 const chain:any={}; chain.eq=()=>chain;chain.select=()=>chain;chain.single=async()=>({data:{id:delivery.id}});
 return {checkpoints,rpc:vi.fn().mockResolvedValue({data:delivery}),from:()=>({update:(v:any)=>{checkpoints.push(v);return chain;}})};
}
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
function env(){vi.stubEnv('ANA_SITE_CRM_ENABLED','true');vi.stubEnv('GHL_PRIVATE_INTEGRATION_TOKEN','test');vi.stubEnv('GHL_LOCATION_ID','location');vi.stubEnv('GHL_ANA_LEONARDO_ID','leonardo');vi.stubEnv('GHL_ANA_LEIA_PIPELINE_ID','pipeline');vi.stubEnv('GHL_ANA_LEIA_STAGE_ID','stage');}
describe('fila de entrega CRM',()=>{
 it('desativada não chama o CRM',async()=>{const d=db(base);const f=vi.fn();expect(await deliverToCrm(d as any,base.id,f)).toBe('pending');expect(f).not.toHaveBeenCalled();});
 it('entrega já concluída não repete chamadas',async()=>{env();const d=db({...base,status:'delivered'});const f=vi.fn();expect(await deliverToCrm(d as any,base.id,f)).toBe('delivered');expect(f).not.toHaveBeenCalled();});
 it('não confirma sucesso em falha da API',async()=>{env();const d=db(base);expect(await deliverToCrm(d as any,base.id,vi.fn().mockResolvedValue(new Response('{}',{status:503})))).toBe('pending');expect(d.checkpoints.at(-1)).toMatchObject({status:'pending',last_error:'crm_http_503'});});
 it('assuntos gerais são atribuídos a Leonardo e não disparam ANA regional',async()=>{
  env();const calls:{url:string;body:any;method:string}[]=[];const d=db(base);
  const f=vi.fn(async(url:any,init:any)=>{calls.push({url:String(url),body:init.body?JSON.parse(init.body):null,method:init.method});
   if(String(url).endsWith('/contacts/upsert'))return Response.json({contact:{id:'contact'}});
   if(String(url).endsWith('/notes')&&init.method==='GET')return Response.json({notes:[]});
   if(String(url).endsWith('/notes'))return Response.json({note:{id:'note'}});
   return Response.json({contact:{id:'contact',assignedTo:'leonardo'}});
  });
  expect(await deliverToCrm(d as any,base.id,f as any)).toBe('delivered');
  expect(calls.some(c=>c.body?.assignedTo==='leonardo')).toBe(true);
  expect(JSON.stringify(calls)).not.toContain('ana-handoff-ready');
  expect(d.checkpoints.at(-1).status).toBe('delivered');
 });
 it('reprocessamento regional usa contato/oportunidade/nota já registrados',async()=>{
  env();vi.useFakeTimers();
  const d=db({...base,routing_prepared:true,contact_id:'contact',opportunity_id:'opportunity',note_id:'note',payload:{...base.payload,route:'leia',uf:'SC',organization:'Escola',role:'Direção'}});
  const calls:any[]=[];const f=vi.fn(async(url:any,init:any)=>{calls.push({url:String(url),body:init.body,method:init.method});return Response.json(String(url).includes('/opportunities/')?{opportunity:{assignedTo:'regional-owner'}}:{contact:{assignedTo:'regional-owner',tags:['ana-handoff-ready']}})});
  const promise=deliverToCrm(d as any,base.id,f as any);await vi.runAllTimersAsync();expect(await promise).toBe('delivered');
  expect(calls.filter(c=>c.url.includes('/upsert')||c.url.includes('/notes')||c.url.endsWith('/tags'))).toHaveLength(0);
  expect(calls.find(c=>c.method==='PUT').body).toContain('regional-owner');vi.useRealTimers();
 });
 it('não confunde responsável anterior com confirmação do fluxo regional',async()=>{
  env();vi.useFakeTimers();let owner:string|null='old-owner';const calls:any[]=[];
  const d=db({...base,contact_id:'contact',opportunity_id:'opportunity',note_id:'note',payload:{...base.payload,route:'leia',uf:'SC',organization:'Escola',role:'Direção'}});
  const f=vi.fn(async(url:any,init:any)=>{
   const body=init.body?JSON.parse(init.body):null;calls.push({url:String(url),method:init.method,body});
   if(String(url).endsWith('/contacts/contact')&&init.method==='PUT')owner=body.assignedTo;
   return Response.json({contact:{assignedTo:owner,tags:[]}});
  });
  const promise=deliverToCrm(d as any,base.id,f as any);await vi.runAllTimersAsync();expect(await promise).toBe('pending');
  expect(calls.some(c=>c.body&&'assignedTo' in c.body&&c.body.assignedTo===null)).toBe(true);
  expect(calls.some(c=>c.url.includes('/opportunities/'))).toBe(false);
  expect(d.checkpoints.at(-1).last_error).toBe('regional_assignment_pending');
 });
});
