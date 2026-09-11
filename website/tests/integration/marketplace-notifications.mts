import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { token, testEnvironment as env } from './local-environment.mjs';
import { deliverMarketplaceNotifications, handleMarketplaceNotificationRequest } from '../../../supabase/functions/_shared/marketplace-notification-delivery.ts';

const admin = createClient(env.SECOND_SUPABASE_URL, env.SECOND_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const client = createClient(env.SECOND_SUPABASE_URL, env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token('authenticated', '88888888-8888-4888-8888-888888888888')}` } } });
const outsider = createClient(env.SECOND_SUPABASE_URL, env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token('authenticated', '33333333-3333-4333-8333-333333333333')}` } } });
const profileId = '11111111-1111-4111-8111-111111111111';
const clientId = '77777777-7777-4777-8777-777777777777';
const professionalId = '22222222-2222-4222-8222-222222222222';
const queue = 'marketplace_concierge_notification_outbox';
const config = { resendApiKey: 'synthetic-never-sent', from: 'noreply@example.invalid', replyTo: 'support@example.invalid' };
const results: string[] = [];
const ok = <T extends {error: unknown}>(response: T): T => { assert.ifError(response.error); return response; };
const rpc = async (name: string, args?: Record<string, unknown>) => ok(await admin.rpc(name, args)).data;
const check = async (name: string, fn: () => Promise<void>) => { await fn(); results.push(name); console.log(`PASS ${name}`); };
async function newCase() {
  const demand = ok(await admin.from('marketplace_search_demand').insert({ user_id: clientId }).select('id').single()).data!;
  return ok(await admin.from('marketplace_concierge_cases').insert({ client_user_id: clientId, source_request_id: demand.id, sharing_consent_at: new Date().toISOString() }).select('*').single()).data!;
}
async function event(caseId: string, eventType = 'client_request_received', extra: Record<string, unknown> = {}) {
  return ok(await admin.from(queue).insert({ case_id: caseId, event_type: eventType, recipient_user_id: clientId,
    recipient_role: 'client', idempotency_key: crypto.randomUUID(), ...extra }).select('id').single()).data!.id;
}
async function cancelPending() {
  ok(await admin.from(queue).update({ status: 'cancelled', lock_token: null, locked_until: null }).in('status', ['queued','processing','failed']));
}
const initial = await newCase();

await check('alternate service JWTs authenticate through PostgREST while anonymous, user and forged tokens fail', async () => {
  let deliveries = 0;
  for (const [key, expected] of [[env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,401], [token('authenticated','88888888-8888-4888-8888-888888888888'),401],
    ['forged.service.token',401], [env.SECOND_SUPABASE_SERVICE_ROLE_KEY,200]] as const) {
    const response = await handleMarketplaceNotificationRequest(new Request('https://example.invalid/function', {
      method:'POST',headers:{Authorization:`Bearer ${key}`},body:'{}',
    }), 'different-injected-service-key', true, async () => { deliveries++; return {sent:0,failed:0,cancelled:0}; }, async authorization => {
      const caller = createClient(env.SECOND_SUPABASE_URL,env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY, {
        auth:{persistSession:false},global:{headers:{Authorization:authorization}},
      });
      const {error} = await caller.rpc('marketplace_notification_recipient',{p_id:'00000000-0000-0000-0000-000000000000'});
      return !error;
    });
    assert.equal(response.status,expected);
  }
  assert.equal(deliveries,1);
});

await check('historical notifications remain disabled and public callers cannot drain or inspect the queue', async () => {
  assert.equal(ok(await admin.from(queue).select('status').eq('idempotency_key', 'historical-disabled').single()).data!.status, 'disabled');
  assert.ok((await client.from(queue).select('*')).error);
  assert.ok((await client.rpc('marketplace_claim_notification')).error);
  assert.ok((await client.rpc('marketplace_prepare_notification_reminders')).error);
});
await check('all three admin events queue once and contain no request narrative', async () => {
  const verification = ok(await admin.from('trainer_verification_requests').insert({ trainer_profile_id: profileId, request_status: 'pending' }).select('id').single()).data!;
  ok(await admin.from('trainer_verification_requests').update({ request_status: 'pending' }).eq('id', verification.id));
  ok(await admin.from('trainer_profile_inquiries').insert({ trainer_profile_id: profileId, client_user_id: clientId }));
  const rows = ok(await admin.from(queue).select('event_type,safe_payload').eq('recipient_role','operator')).data!;
  assert.equal(rows.filter(r=>r.event_type==='admin_match_requested').length,1);
  assert.equal(rows.filter(r=>r.event_type==='admin_professional_submitted').length,1);
  assert.equal(rows.filter(r=>r.event_type==='admin_consultation_requested').length,1);
  for (const row of rows) assert.deepEqual(row.safe_payload, {});
  const destinations: string[] = [];
  const result = await deliverMarketplaceNotifications(admin, config, async (_url, init) => {
    const message = JSON.parse(String(init?.body)); destinations.push(...message.to);
    assert.ok(!message.text.includes('notification-client@example.invalid'));
    return Response.json({ id: crypto.randomUUID() });
  });
  assert.equal(result.sent,3); assert.deepEqual(destinations,Array(3).fill('mlitfin@elevarefit.org'));
});
await check('preferences are owner-scoped and stop matching emails before sending', async () => {
  assert.deepEqual(ok(await client.rpc('marketplace_my_notification_preferences')).data,{match_updates:true,match_reminders:false});
  assert.ifError((await client.rpc('marketplace_my_notification_preferences',{p_match_updates:false,p_match_reminders:false})).error);
  assert.deepEqual(ok(await outsider.rpc('marketplace_my_notification_preferences')).data,{match_updates:true,match_reminders:false});
  const id = await event(initial.id);
  assert.equal(await rpc('marketplace_claim_notification'),null);
  assert.equal(ok(await admin.from(queue).select('status').eq('id',id).single()).data!.status,'cancelled');
  ok(await client.rpc('marketplace_my_notification_preferences',{p_match_updates:true,p_match_reminders:false}));
});
await check('concurrent claims lease each notification to only one worker and reject stale acknowledgements', async () => {
  const id = await event(initial.id);
  const claims = await Promise.all([rpc('marketplace_claim_notification'),rpc('marketplace_claim_notification')]);
  assert.equal(claims.filter(Boolean).length,1);
  const claim = claims.find(Boolean);
  assert.equal(claim.id,id);
  assert.equal(await rpc('marketplace_finish_notification',{p_id:id,p_lock_token:crypto.randomUUID(),p_result:'sent',p_provider_message_id:'wrong'}),false);
  assert.equal(await rpc('marketplace_finish_notification',{p_id:id,p_lock_token:claim.lock_token,p_result:'sent',p_provider_message_id:'accepted'}),true);
  assert.equal(await rpc('marketplace_claim_notification'),null);
});
await check('send-time validation cancels an event when preferences change after claiming', async () => {
  await event(initial.id); const claim = await rpc('marketplace_claim_notification');
  ok(await client.rpc('marketplace_my_notification_preferences',{p_match_updates:false,p_match_reminders:false}));
  assert.equal(await rpc('marketplace_notification_delivery_context',{p_id:claim.id,p_lock_token:claim.lock_token}),null);
  await cancelPending(); ok(await client.rpc('marketplace_my_notification_preferences',{p_match_updates:true,p_match_reminders:false}));
});
await check('retry backoff and provider idempotency survive a transient failure', async () => {
  const id = await event(initial.id); const keys: string[] = [];
  const request: typeof fetch = async (_url, init) => { keys.push(new Headers(init?.headers).get('idempotency-key')!); return keys.length === 1 ? new Response('',{status:503}) : Response.json({id:'retried-successfully'}); };
  assert.equal((await deliverMarketplaceNotifications(admin,config,request)).failed,1);
  assert.equal(await rpc('marketplace_claim_notification'),null);
  ok(await admin.from(queue).update({next_attempt_at:new Date(Date.now()-1000).toISOString()}).eq('id',id));
  assert.equal((await deliverMarketplaceNotifications(admin,config,request)).sent,1);
  assert.equal(keys[0],keys[1]);
});
await check('ambiguous deliveries older than the provider key window are never automatically resent', async () => {
  const id = await event(initial.id); const claim = await rpc('marketplace_claim_notification');
  ok(await admin.from(queue).update({first_attempt_at:new Date(Date.now()-24*3600_000).toISOString(),locked_until:new Date(0).toISOString()}).eq('id',id));
  assert.equal(await rpc('marketplace_claim_notification'),null);
  assert.equal(ok(await admin.from(queue).select('status').eq('id',id).single()).data!.status,'cancelled');
  assert.equal(await rpc('marketplace_finish_notification',{p_id:id,p_lock_token:claim.lock_token,p_result:'sent',p_provider_message_id:'late'}),false);
});
await check('case transitions enqueue client selection, rematch and closure messages', async () => {
  for (const status of ['introduction_ready','rematch_requested','closed']) ok(await admin.from('marketplace_concierge_cases').update({status}).eq('id',initial.id));
  const events = ok(await admin.from(queue).select('event_type').eq('case_id',initial.id)).data!.map(e=>e.event_type);
  for (const name of ['client_selection_received','rematch_confirmation','case_closed']) assert.ok(events.includes(name));
  await cancelPending();
});
await check('professional invitations require the actual owner and a still-eligible unexpired invitation', async () => {
  const c = await newCase(); await cancelPending();
  const r = ok(await admin.from('marketplace_concierge_recommendations').insert({case_id:c.id,trainer_profile_id:profileId,status:'awaiting_professional_response',response_deadline_at:new Date(Date.now()+3600_000).toISOString()}).select('id').single()).data!;
  const wrong = await event(c.id,'professional_invited',{recommendation_id:r.id,recipient_role:'professional'});
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:wrong}),null);
  const valid = await event(c.id,'professional_invited',{recommendation_id:r.id,recipient_role:'professional',recipient_user_id:professionalId});
  assert.equal((await rpc('marketplace_notification_recipient',{p_id:valid})).email,'runtime-test@example.invalid');
  ok(await admin.from('marketplace_concierge_recommendations').update({response_deadline_at:new Date(0).toISOString()}).eq('id',r.id));
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:valid}),null);
  await cancelPending();
});
await check('inactive recipients and closed requests are suppressed', async () => {
  const c = await newCase(); await cancelPending(); const id = await event(c.id);
  ok(await admin.from('users').update({is_active:false}).eq('id',clientId));
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:id}),null);
  ok(await admin.from('users').update({is_active:true}).eq('id',clientId));
  ok(await admin.from('marketplace_concierge_cases').update({status:'closed'}).eq('id',c.id));
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:id}),null);
  await cancelPending();
});
await check('optional reminders require opt-in, respect activation time and enqueue only once', async () => {
  const c = await newCase(); await cancelPending();
  const r = ok(await admin.from('marketplace_concierge_recommendations').insert({case_id:c.id,trainer_profile_id:profileId,status:'awaiting_professional_response',
    created_at:new Date(Date.now()-36*3600_000).toISOString(),response_deadline_at:new Date(Date.now()+6*3600_000).toISOString()}).select('id').single()).data!;
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),0);
  ok(await outsider.rpc('marketplace_my_notification_preferences',{p_match_updates:true,p_match_reminders:true}));
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),1);
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),0);
  const reminder = ok(await admin.from(queue).select('id').eq('idempotency_key',`recommendation:${r.id}:email-reminder`).single()).data!;
  assert.equal((await rpc('marketplace_notification_recipient',{p_id:reminder.id})).role,'professional');
  ok(await admin.from('marketplace_concierge_recommendations').update({status:'declined'}).eq('id',r.id));
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:reminder.id}),null);
  const historical = await newCase(); await cancelPending();
  ok(await admin.from('marketplace_concierge_recommendations').insert({case_id:historical.id,trainer_profile_id:profileId,status:'awaiting_professional_response',
    created_at:new Date(Date.now()-4*86400_000).toISOString(),response_deadline_at:new Date(Date.now()+6*3600_000).toISOString()}));
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),0);
});
await check('follow-up messages are deduplicated and stop when completed or the case closes', async () => {
  const c = await newCase(); await cancelPending();
  ok(await admin.from('marketplace_concierge_cases').update({status:'introduced'}).eq('id',c.id));
  const f = ok(await admin.from('marketplace_concierge_follow_ups').insert({case_id:c.id,follow_up_kind:'post_introduction',due_at:new Date(Date.now()-1000).toISOString(),dedupe_key:crypto.randomUUID()}).select('id').single()).data!;
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),0);
  ok(await client.rpc('marketplace_my_notification_preferences',{p_match_updates:true,p_match_reminders:true}));
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),1);
  assert.equal(await rpc('marketplace_prepare_notification_reminders'),0);
  const id = ok(await admin.from(queue).select('id').eq('idempotency_key',`follow-up:${f.id}:email`).single()).data!.id;
  assert.equal((await rpc('marketplace_notification_recipient',{p_id:id})).role,'client');
  ok(await admin.from('marketplace_concierge_follow_ups').update({status:'completed'}).eq('id',f.id));
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:id}),null);
  ok(await admin.from('marketplace_concierge_follow_ups').update({status:'pending'}).eq('id',f.id));
  ok(await admin.from('marketplace_concierge_cases').update({status:'closed'}).eq('id',c.id));
  assert.equal(await rpc('marketplace_notification_recipient',{p_id:id}),null);
  await cancelPending();
});
fs.writeFileSync('reports/marketplace-notification-integration.json',JSON.stringify({result:'PASS',database:'disposable Supabase contract fixture',realEmailsSent:0,results},null,2)+'\n');
