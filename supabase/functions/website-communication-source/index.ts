import {createClient} from 'npm:@supabase/supabase-js@2';
import {bridgeEnvironment,handleBridgeRequest} from '../_shared/communicationBridge.ts';
import {websiteCommunicationSource} from '../_shared/websiteCommunicationSource.ts';
Deno.serve(async req=>{const config=bridgeEnvironment(k=>Deno.env.get(k)),db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');return handleBridgeRequest(req,db,config,(operation,payload)=>websiteCommunicationSource(db,operation,payload,{from:Deno.env.get('RESEND_TRANSACTIONAL_FROM'),replyTo:Deno.env.get('RESEND_TRANSACTIONAL_REPLY_TO'),resendApiKey:''}));});
