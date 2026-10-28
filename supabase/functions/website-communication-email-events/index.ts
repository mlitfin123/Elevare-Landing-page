import {createClient} from 'npm:@supabase/supabase-js@2';
import {handleCommunicationEmailEvent} from '../_shared/communicationEmailEvents.ts';
Deno.serve(req=>handleCommunicationEmailEvent(req,createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''),Deno.env.get('ELEVARE_WEBSITE_RESEND_WEBHOOK_SECRET')??Deno.env.get('RESEND_WEBHOOK_SECRET'),Deno.env.get('ELEVARE_COORDINATED_EMAIL_EVENTS_ENABLED')==='true',Date.now(),'marketplace_email_event'));
