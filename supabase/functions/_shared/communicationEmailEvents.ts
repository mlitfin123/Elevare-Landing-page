// Resend/Svix verification over the raw payload; no open/click attendance evidence.
export async function verifyEmailEvent(raw:string,headers:Headers,secret:string,now=Date.now()){
 const id=headers.get('svix-id')??'',timestamp=headers.get('svix-timestamp')??'',signature=headers.get('svix-signature')??'';
 if(!secret.startsWith('whsec_')||!id||id.length>200||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||raw.length>65536||signature.length>2048)throw Error('invalid_signature');
 const bytes=Uint8Array.from(atob(secret.slice(6)),c=>c.charCodeAt(0));const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const expected=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id+'.'+timestamp+'.'+raw)));
 let valid=false;for(const part of signature.split(' ')){if(!part.startsWith('v1,'))continue;let actual;try{actual=Uint8Array.from(atob(part.slice(3)),c=>c.charCodeAt(0));}catch{continue;}let difference=actual.length^expected.length;for(let i=0;i<expected.length;i++)difference|=expected[i]^(actual[i]??0);valid=valid||difference===0;}
 if(!valid)throw Error('invalid_signature');return {id,payload:JSON.parse(raw)};
}
export async function handleCommunicationEmailEvent(req:Request,db:any,secret:string|undefined,enabled:boolean,now=Date.now(),eventRpc='communication_email_event'){
 if(req.method!=='POST')return new Response(null,{status:405});if(!enabled||!secret)return new Response(null,{status:503});
 if(Number(req.headers.get('content-length')??0)>65536)return new Response(null,{status:413});
 let verified;try{const reader=req.body?.getReader();const chunks:Uint8Array[]=[];let length=0;if(reader)while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>65536){await reader.cancel();return new Response(null,{status:413});}chunks.push(part.value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}verified=await verifyEmailEvent(new TextDecoder().decode(bytes),req.headers,secret,now);}catch{return new Response(null,{status:401});}
 const {id,payload}=verified;
 if(!['email.sent','email.delivered','email.bounced','email.complained','email.suppressed','email.failed','email.delivery_delayed'].includes(payload.type))return new Response(null,{status:200});
 if(typeof payload.data?.email_id!=='string'||payload.data.email_id.length>200)return new Response(null,{status:400});
 const r=await db.rpc(eventRpc,{p_event:id,p_message:payload.data.email_id,p_type:payload.type});return new Response(null,{status:r.error?409:200});
}
