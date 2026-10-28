// Scoped server-to-server bridge. Keys are distinct from Supabase credentials.
// Project, namespace and peer URL come only from reviewed server configuration.
const encode=(s:string)=>new TextEncoder().encode(s);
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function sign(secret:string,value:string){const key=await crypto.subtle.importKey('raw',encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encode(value)));}
export type BridgeConfig={enabled:boolean;namespace:string;project:string;peerProject:string;peerUrl:string;ingressSecret:string;egressSecret:string;sharedProject?:boolean};
export function bridgeEnvironment(read:(name:string)=>string|undefined):BridgeConfig{
 const shared=read('ELEVARE_COMMUNICATION_BRIDGE_SHARED_PROJECT_VERIFIED')==='true';
 // One Supabase project has one secret namespace. Source and coordinator need
 // opposite directions, so the website uses its own explicit configuration.
 const get=(name:string)=>shared&&name!=='ELEVARE_COMMUNICATION_BRIDGE_SHARED_PROJECT_VERIFIED'?read(name.replace('ELEVARE_COMMUNICATION_BRIDGE_','ELEVARE_WEBSITE_COMMUNICATION_BRIDGE_')):read(name);
 return {enabled:get('ELEVARE_COMMUNICATION_BRIDGE_ENABLED')==='true',namespace:get('ELEVARE_COMMUNICATION_BRIDGE_NAMESPACE')??'',project:get('ELEVARE_COMMUNICATION_BRIDGE_PROJECT_REF')??'',peerProject:get('ELEVARE_COMMUNICATION_BRIDGE_PEER_PROJECT_REF')??'',peerUrl:get('ELEVARE_COMMUNICATION_BRIDGE_PEER_URL')??'',ingressSecret:get('ELEVARE_COMMUNICATION_BRIDGE_INGRESS_SECRET')??'',egressSecret:get('ELEVARE_COMMUNICATION_BRIDGE_EGRESS_SECRET')??'',sharedProject:get('ELEVARE_COMMUNICATION_BRIDGE_SHARED_PROJECT_VERIFIED')==='true'};}
export async function bridgeCall(config:BridgeConfig,operation:string,payload:unknown,request:typeof fetch=fetch,now=Date.now()){
 if(!config.enabled||!config.egressSecret||config.egressSecret.length<32)throw Error('bridge_configuration_missing');
 const url=new URL(config.peerUrl);if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw Error('bridge_peer_invalid');
 const raw=JSON.stringify({operation,namespace:config.namespace,project:config.project,payload}),timestamp=String(Math.floor(now/1000)),nonce=crypto.randomUUID();
 const signature=await sign(config.egressSecret,config.namespace+'.'+timestamp+'.'+nonce+'.'+raw);
 const response=await request(url.href,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json','x-elevare-time':timestamp,'x-elevare-nonce':nonce,'x-elevare-signature':signature},body:raw});
 if(!response.ok)throw Error('bridge_peer_unavailable');return response.json();
}
export async function handleBridgeRequest(req:Request,db:any,config:BridgeConfig,receive:(operation:string,payload:any)=>Promise<unknown>,now=Date.now()){
 const headers={'cache-control':'no-store'};if(!config.enabled||!config.ingressSecret||config.ingressSecret.length<32)return new Response(null,{status:503,headers});
 if(req.method!=='POST')return new Response(null,{status:405,headers});
 const reader=req.body?.getReader();let size=0;const chunks:Uint8Array[]=[];if(reader)for(;;){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>16384){await reader.cancel();return new Response(null,{status:413,headers});}chunks.push(v.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const v of chunks){bytes.set(v,offset);offset+=v.length;}const raw=new TextDecoder().decode(bytes),timestamp=req.headers.get('x-elevare-time')??'',nonce=req.headers.get('x-elevare-nonce')??'',signature=req.headers.get('x-elevare-signature')??'';
 if(!/^\d{10}$/.test(timestamp)||Math.abs(Number(timestamp)*1000-now)>300000||!/^[a-f0-9-]{36}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature))return new Response(null,{status:401,headers});
 const expected=await sign(config.ingressSecret,config.namespace+'.'+timestamp+'.'+nonce+'.'+raw);let difference=0;for(let i=0;i<64;i++)difference|=signature.charCodeAt(i)^expected.charCodeAt(i);if(difference)return new Response(null,{status:401,headers});
 let body:any;try{body=JSON.parse(raw);}catch{return new Response(null,{status:400,headers});}
 if(body.namespace!==config.namespace||body.project!==config.peerProject||Object.keys(body).sort().join(',')!=='namespace,operation,payload,project')return new Response(null,{status:403,headers});
 const replay=await db.rpc('communication_bridge_nonce',{p_namespace:config.namespace,p_nonce:nonce,p_hash:hex(await crypto.subtle.digest('SHA-256',bytes))});
 if(replay.error||replay.data!==true)return new Response(null,{status:409,headers});
 try{return Response.json(await receive(body.operation,body.payload),{headers});}catch{return new Response(null,{status:409,headers});}
}
async function rpc(db:any,name:string,args:any={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
export async function receiveBridgeEvent(db:any,config:BridgeConfig,operation:string,payload:any){
 if(operation!=='accept'||!payload||Object.keys(payload).length!==1||!payload.event)throw Error('bridge_operation_invalid');
 const accepted=await rpc(db,'communication_bridge_accept',{p_namespace:config.namespace,p_project:config.peerProject,p_event:payload.event});
 const outcome=accepted.notice_id?await rpc(db,'communication_bridge_outcome',{p_notice:accepted.notice_id}):null;return {...accepted,outcome};
}
export async function prepareBridgeDelivery(db:any,notice:string,config:BridgeConfig,request:typeof fetch=fetch){
 const source=await rpc(db,'communication_bridge_lookup',{p_notice:notice});if(!source)return null;
 if(source.namespace!==config.namespace||source.project!==config.peerProject)throw Error('bridge_mapping_conflict');
 const fresh=await bridgeCall(config,'source',{table:source.table,id:source.id},request);
 if(!fresh?.event)throw Error('bridge_source_review');
 const result=await rpc(db,'communication_bridge_refresh',{p_notice:notice,p_event:fresh.event});if(result.state!=='accepted'||result.notice_id!==notice)throw Error('bridge_source_review');
 return {source,event:fresh.event,message:fresh.message??null};
}
export async function handoffWebsiteCommunications(db:any,config:BridgeConfig,request:typeof fetch=fetch){
 if(!config.enabled)return {state:'bridge_disabled',results:[]};const events=await rpc(db,'marketplace_bridge_pending'),results=[];
 for(const event of events.slice(0,20)){
  try{const result=config.sharedProject?await rpc(db,'communication_shared_source_accept',{p_namespace:config.namespace,p_table:event.table,p_id:event.id}):await bridgeCall(config,'accept',{event},request);
   const outcome=result.outcome;await rpc(db,'marketplace_bridge_ack',{p_table:event.table,p_id:event.id,p_state:outcome?.state??result.state,p_notice:result.notice_id??null,p_provider:outcome?.provider_message_id??null,p_destination:outcome?.destination_hash??null,p_receipt:outcome?.receipt_state??null});results.push({id:event.id,state:outcome?.state??result.state});
  }catch{results.push({id:event.id,state:'bridge_pending'});}
 }return {state:'handover',results};
}
export async function handoffWebsiteOutbox(db:any,table:string,id:string,config:BridgeConfig,request:typeof fetch=fetch){
 if(!config.enabled)return null;const event=await rpc(db,'marketplace_bridge_project',{p_table:table,p_id:id,p_takeover:true});if(!event)return null;
 try{const result=config.sharedProject?await rpc(db,'communication_shared_source_accept',{p_namespace:config.namespace,p_table:event.table,p_id:event.id}):await bridgeCall(config,'accept',{event},request),outcome=result.outcome;
  await rpc(db,'marketplace_bridge_ack',{p_table:table,p_id:id,p_state:outcome?.state??result.state,p_notice:result.notice_id??null,p_provider:outcome?.provider_message_id??null,p_destination:outcome?.destination_hash??null,p_receipt:outcome?.receipt_state??null});return {state:outcome?.state??result.state};
 }catch{return {state:'bridge_pending'};}
}
