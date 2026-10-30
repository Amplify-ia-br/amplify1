import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dateTime } from './api';
type Delivery={id:string;status:string;attempts:number;created_at:string;last_error?:string;payload:{summary:string;contact:string;route:string;origin:string;consentQuote:string}};
async function api(init?:RequestInit){
 const {data}=await supabase.auth.getSession();
 const response=await fetch('/api/ana-site-admin',{...init,headers:{'content-type':'application/json',authorization:`Bearer ${data.session?.access_token||''}`}});
 if(!response.ok)throw new Error('Não foi possível carregar os encaminhamentos do site.');
 return response.json();
}
export function SiteDeliveriesTab(){
 const cache=useQueryClient();const [retrying,setRetrying]=useState('');const [message,setMessage]=useState('');
 const query=useQuery<{deliveries:Delivery[]}>({queryKey:['ana-site-deliveries'],queryFn:()=>api()});
 async function retry(id:string){setRetrying(id);setMessage('');try{const result=await api({method:'POST',body:JSON.stringify({id})});setMessage(result.status==='delivered'?'Entrega confirmada no CRM.':'Pedido continua pendente. Confira a configuração e tente novamente.');await cache.invalidateQueries({queryKey:['ana-site-deliveries']});}catch{setMessage('Não foi possível reprocessar agora.');}finally{setRetrying('');}}
 return <section className="space-y-4"><h2 className="text-lg font-semibold">Encaminhamentos do site CRIATOWN</h2><p className="text-sm text-muted-foreground">Pedidos com autorização de contato. O status entregue exige confirmação do CRM.</p>{query.isLoading&&<p>Carregando…</p>}{query.isError&&<p role="alert">Não foi possível carregar. Verifique a migração do site.</p>}<p role="status">{message}</p>{query.data?.deliveries.length===0&&<p>Nenhum encaminhamento registrado.</p>}{query.data?.deliveries.map(d=><article key={d.id} className="rounded-lg border p-4 space-y-2"><div className="flex justify-between gap-4"><strong>{d.status==='delivered'?'Entregue':'Pendente'} · {d.payload.route==='leia'?'L.E.I.A.':'Leonardo'}</strong><small>{dateTime(d.created_at)}</small></div><p>{d.payload.summary}</p><p className="text-sm">Contato: {d.payload.contact} · Origem: {d.payload.origin}</p><details><summary>Autorização e tentativas</summary><p>{d.payload.consentQuote}</p><p>{d.attempts} tentativa(s). {d.last_error||''}</p></details>{d.status!=='delivered'&&<button className="rounded border px-3 py-2" disabled={!!retrying} onClick={()=>retry(d.id)}>{retrying===d.id?'Reprocessando…':'Tentar entrega novamente'}</button>}</article>)}</section>;
}
