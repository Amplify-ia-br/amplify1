import { requireAdmin, getAdminClient } from '../ana-zero/admin/auth.js';
import { deliverToCrm } from './crm.js';
import { ANA_UUID } from './context.js';
const headers={'cache-control':'no-store','x-robots-tag':'noindex, nofollow'};
export async function handleSiteAdmin(request:Request){
 const identity=await requireAdmin(request);if(identity instanceof Response)return identity;
 const client=getAdminClient()!;
 if(request.method==='GET'){
  const result=await client.from('ana_site_deliveries').select('id,status,payload,attempts,last_error,created_at,delivered_at').order('created_at',{ascending:false}).limit(100);
  return Response.json(result.error?{error:'storage_unavailable'}:{deliveries:result.data},{status:result.error?503:200,headers});
 }
 if(request.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405,headers});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'forbidden'},{status:403,headers});
 const raw=await request.text();if(raw.length>500)return Response.json({error:'invalid_request'},{status:400,headers});
 let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'invalid_request'},{status:400,headers});}
 if(!ANA_UUID.test(body.id||''))return Response.json({error:'invalid_request'},{status:400,headers});
 const status=await deliverToCrm(client,body.id);
 return Response.json({status},{headers});
}
