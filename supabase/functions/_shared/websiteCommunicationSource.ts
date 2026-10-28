import {buildMarketplaceNotification} from './marketplace-notification-delivery.ts';
import {buildProfessionalApprovalEmail} from '../professional-approval-email/email.ts';
import {buildProfessionalInquiryEmail} from '../professional-inquiry-email/email.ts';
export async function websiteCommunicationSource(db:any,operation:string,payload:any,config:any){
 if(operation!=='source'||!payload||Object.keys(payload).sort().join(',')!=='id,table'||!['professional_email_outbox','marketplace_concierge_notification_outbox'].includes(payload.table)||!/^[0-9a-f-]{36}$/i.test(payload.id))throw Error('bridge_operation_invalid');
 const result=await db.rpc('marketplace_bridge_project',{p_table:payload.table,p_id:payload.id,p_takeover:false});if(result.error)throw result.error;const event=result.data;if(!event)return {event:null};
 if(!event.current||!event.consent)return {event};
 const row=await db.from(payload.table).select(payload.table==='professional_email_outbox'?'trainer_profile_id':'id').eq('id',payload.id).single();if(row.error)throw row.error;
 let message:any;
 if(payload.table==='professional_email_outbox'){
  const profile=await db.from('trainer_profiles').select('user_id').eq('id',row.data.trainer_profile_id).single();if(profile.error)throw profile.error;
  const user=await db.from('users').select('preferred_locale').eq('id',profile.data.user_id).single();if(user.error)throw user.error;
  const input={locale:user.data.preferred_locale,supportEmail:config.replyTo};message=event.kind==='professional_approved'?buildProfessionalApprovalEmail(input):buildProfessionalInquiryEmail(input);
 }else{
  const context=await db.rpc('marketplace_notification_recipient',{p_id:payload.id});if(context.error||!context.data)throw Error('bridge_source_changed');message=buildMarketplaceNotification(context.data,config);
 }
 // Only existing, server-rendered minimal templates cross this transient response.
 // Destination, headers, keys and provider delivery remain coordinator-controlled.
 return {event,message:{subject:message.subject,text:message.text,html:message.html}};
}
