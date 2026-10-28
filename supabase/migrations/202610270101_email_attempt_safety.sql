-- Extend existing Resend outboxes. No sender, schedule or activation.
begin;
-- The supplied installed definition matches this historical recipient function,
-- but users has no deleted_at column. Preserve all consent, active-account,
-- verified-address and relevance checks while making only that field optional.
-- Abort on an unfamiliar installed body instead of overwriting live changes.
do $compatibility$
declare definition text;
begin
 definition:=pg_get_functiondef('public.marketplace_notification_recipient(uuid)'::regprocedure);
 if md5(replace(definition,E'\r\n',E'\n'))<>'feb8d6a1ac94a1bd667cc685fd8bf065' then
  raise exception 'Website notification recipient differs from reviewed inventory; reconcile before applying.';
 end if;
 definition:=replace(definition,'and deleted_at is null',
  'and nullif(to_jsonb(users)->>''deleted_at'','''') is null and coalesce((to_jsonb(users)->>''is_deleted'')::boolean,false)=false');
 definition:=replace(definition,'owner_user.deleted_at is null',
  'nullif(to_jsonb(owner_user)->>''deleted_at'','''') is null and coalesce((to_jsonb(owner_user)->>''is_deleted'')::boolean,false)=false');
 definition:=replace(definition,'client_user.deleted_at is null',
  'nullif(to_jsonb(client_user)->>''deleted_at'','''') is null and coalesce((to_jsonb(client_user)->>''is_deleted'')::boolean,false)=false');
 execute definition;
end $compatibility$;
alter table professional_email_outbox add column provider_started_at timestamptz,add column delivery_outcome text,add column destination_hash text;
alter table marketplace_concierge_notification_outbox add column provider_started_at timestamptz,add column delivery_outcome text,add column destination_hash text;
do $$declare r record;begin for r in select conrelid::regclass relation,conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid in ('professional_email_outbox'::regclass,'marketplace_concierge_notification_outbox'::regclass) and contype='c' and pg_get_constraintdef(oid) like '%status%' and pg_get_constraintdef(oid) not like '%sent_at%' loop execute format('alter table %s drop constraint %I',r.relation,r.conname);execute format('alter table %s add constraint %I check (status=''ambiguous'' or (%s))',r.relation,r.conname,substring(r.definition from 7));end loop;end;$$;
create table if not exists communication_email_suppressions(address_hash text primary key,reason text not null check(reason in ('bounce','complaint','suppressed')),created_at timestamptz not null default now());
create table if not exists communication_provider_events(event_id text primary key,provider_message_id text not null,event_type text not null,received_at timestamptz not null default now());
alter table communication_provider_events add column if not exists matched_at timestamptz;
create function marketplace_email_start(p_table text,p_id uuid,p_lock uuid,p_email text default null) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare e jsonb;address text;coordinated boolean;recipient jsonb;
begin
 if auth.role() is distinct from 'service_role' or p_table not in ('professional_email_outbox','marketplace_concierge_notification_outbox') then raise exception 'email_attempt_unauthorized';end if;
 if to_regclass('public.communication_policy') is not null then execute 'select delivery_enabled from communication_policy where singleton' into coordinated;if coordinated then return false;end if;end if;
 execute format('select to_jsonb(e) from %I e where id=$1 for update',p_table) into e using p_id;
 if e is null or e->>'status'<>'processing' or e->>'lock_token' is distinct from p_lock::text or (e->>'locked_until')::timestamptz<=now() or e->>'provider_started_at' is not null or e->>'delivery_outcome'='ambiguous' then return false;end if;
 if p_table='marketplace_concierge_notification_outbox' then
  recipient:=marketplace_notification_recipient(p_id);if recipient is null then return false;end if;address:=lower(trim(recipient->>'email'));if e->>'recipient_role'='operator' then address:=lower(trim(p_email));elsif address is null or address is distinct from lower(trim(e->>'delivery_email')) then return false;end if;
 else
  select lower(trim(u.email)) into address from trainer_profiles p join users u on u.id=p.user_id join auth.users a on a.id=u.auth_id and a.email_confirmed_at is not null and lower(a.email)=lower(u.email) where p.id=(e->>'trainer_profile_id')::uuid and p.deleted_at is null and to_jsonb(u)->>'deleted_at' is null and u.is_active;
  if address is null then return false;end if;
  if e->>'event_type'='new_consultation_request' and not exists(select 1 from trainer_profile_inquiries where id=(e->>'inquiry_id')::uuid and status::text not in ('closed','declined')) then return false;end if;
 end if;
 if p_email is not null and lower(trim(p_email)) is distinct from address then return false;end if;
 if address is not null and exists(select 1 from communication_email_suppressions where address_hash=encode(sha256(convert_to(address,'UTF8')),'hex')) then return false;end if;
 execute format('update %I set provider_started_at=clock_timestamp(),delivery_outcome=''started'',destination_hash=$2 where id=$1',p_table) using p_id,case when address is not null then encode(sha256(convert_to(address,'UTF8')),'hex') end;return true;
end;$$;
create function marketplace_email_hold(p_table text,p_id uuid,p_lock uuid) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare affected integer;begin
 if auth.role() is distinct from 'service_role' or p_table not in ('professional_email_outbox','marketplace_concierge_notification_outbox') then raise exception 'email_attempt_unauthorized';end if;
 execute format('update %I set delivery_outcome=''readiness_hold'',status=$3,attempt_count=greatest(0,attempt_count-1),locked_until=null,lock_token=null,next_attempt_at=now()+interval ''1 hour'' where id=$1 and lock_token=$2 and status=''processing'' and provider_started_at is null',p_table) using p_id,p_lock,case when p_table='professional_email_outbox' then 'pending' else 'queued' end;get diagnostics affected=row_count;return affected>0;
end;$$;
revoke all on function marketplace_email_hold(text,uuid,uuid) from public,anon,authenticated;grant execute on function marketplace_email_hold(text,uuid,uuid) to service_role;
create function marketplace_email_outcome(p_table text,p_id uuid,p_lock uuid,p_outcome text) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare affected integer;begin
 if auth.role() is distinct from 'service_role' or p_table not in ('professional_email_outbox','marketplace_concierge_notification_outbox') or p_outcome not in ('ambiguous','rejected') then raise exception 'email_attempt_unauthorized';end if;
 execute format('update %I set delivery_outcome=$3,status=case when $3=''ambiguous'' then ''ambiguous'' else status end,provider_started_at=case when $3=''rejected'' then null else provider_started_at end where id=$1 and lock_token=$2 and status=''processing'' and provider_started_at is not null',p_table) using p_id,p_lock,p_outcome;get diagnostics affected=row_count;return affected>0;
end;$$;
do $$declare sig text;definition text;begin foreach sig in array array['marketplace_claim_professional_approval_email(uuid,boolean)','marketplace_claim_professional_inquiry_email(uuid)','marketplace_claim_notification()'] loop
 definition:=pg_get_functiondef(('public.'||sig)::regprocedure);definition:=regexp_replace(definition,'\mcurrent_time\M','v_event_time','gi');execute replace(definition,split_part(sig,'(',1)||'(',split_part(sig,'(',1)||'_before_attempt_safety(');execute format('revoke all on function public.%s from public,anon,authenticated,service_role',replace(sig,'(', '_before_attempt_safety('));end loop;end;$$;
create or replace function marketplace_claim_professional_approval_email(p_professional_id uuid,p_allow_failed_retry boolean default false) returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin if auth.role() is distinct from 'service_role' then raise exception 'Service role required';end if;
 if exists(select 1 from professional_email_outbox where event_key='professional_approved:'||p_professional_id and provider_started_at is not null and status<>'sent') then return jsonb_build_object('claimed',false,'reason','unknown_outcome','retry_available',false);end if;return marketplace_claim_professional_approval_email_before_attempt_safety(p_professional_id,p_allow_failed_retry);end;$$;
create or replace function marketplace_claim_professional_inquiry_email(p_inquiry_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin if auth.role() is distinct from 'service_role' then raise exception 'Service role required';end if;
 if exists(select 1 from professional_email_outbox where event_key='new_consultation_request:'||p_inquiry_id and provider_started_at is not null and status<>'sent') then return jsonb_build_object('claimed',false,'reason','unknown_outcome','retry_available',false);end if;return marketplace_claim_professional_inquiry_email_before_attempt_safety(p_inquiry_id);end;$$;
create or replace function marketplace_claim_notification() returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin if auth.role() is distinct from 'service_role' then raise exception 'Service role required';end if;
 update marketplace_concierge_notification_outbox set status='ambiguous',delivery_outcome='ambiguous' where status='processing' and provider_started_at is not null and locked_until<=now();return marketplace_claim_notification_before_attempt_safety();end;$$;
create function marketplace_email_operations() returns jsonb language sql stable security definer set search_path=public as $$select jsonb_build_object('professional',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select status,delivery_outcome,count(*) records from professional_email_outbox group by status,delivery_outcome)t),'concierge',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select status,delivery_outcome,count(*) records from marketplace_concierge_notification_outbox group by status,delivery_outcome)t),'unmatched_provider_events',(select count(*) from communication_provider_events where matched_at is null),'suppressions',(select count(*) from communication_email_suppressions),'provider_acceptance_is_user_receipt',false);$$;
revoke all on function marketplace_email_start(text,uuid,uuid,text),marketplace_email_outcome(text,uuid,uuid,text),marketplace_email_operations() from public,anon,authenticated;grant execute on function marketplace_email_start(text,uuid,uuid,text),marketplace_email_outcome(text,uuid,uuid,text),marketplace_email_operations() to service_role;
alter table communication_email_suppressions enable row level security;alter table communication_provider_events enable row level security;revoke all on communication_email_suppressions,communication_provider_events from public,anon,authenticated;grant select on communication_email_suppressions,communication_provider_events to service_role;
create function marketplace_email_acceptance_state() returns trigger language plpgsql as $$begin if new.status='sent' and old.status='processing' then new.delivery_outcome:='provider_accepted';end if;return new;end;$$;
create trigger professional_email_acceptance before update on professional_email_outbox for each row execute function marketplace_email_acceptance_state();
create trigger concierge_email_acceptance before update on marketplace_concierge_notification_outbox for each row execute function marketplace_email_acceptance_state();
create function marketplace_email_event(p_event text,p_message text,p_type text) returns boolean language plpgsql security definer set search_path=public as $$
declare table_name text;destination text;old_outcome text;
begin
 if p_type not in ('email.sent','email.delivered','email.bounced','email.complained','email.suppressed','email.failed','email.delivery_delayed') or coalesce(length(p_event),0) not between 1 and 200 or coalesce(length(p_message),0) not between 1 and 200 then raise exception 'email_provider_event_invalid';end if;
 insert into communication_provider_events(event_id,provider_message_id,event_type) values(p_event,p_message,p_type) on conflict(event_id) do nothing;if not found then if exists(select 1 from communication_provider_events where event_id=p_event and (provider_message_id,event_type) is distinct from (p_message,p_type)) then raise exception 'email_provider_event_conflict';end if;if exists(select 1 from communication_provider_events where event_id=p_event and matched_at is not null) then return false;end if;end if;
 if exists(select 1 from professional_email_outbox where provider_message_id=p_message) then table_name:='professional_email_outbox';elsif exists(select 1 from marketplace_concierge_notification_outbox where provider_message_id=p_message) then table_name:='marketplace_concierge_notification_outbox';else return false;end if;
 execute format('select destination_hash,delivery_outcome from %I where provider_message_id=$1 for update',table_name) into destination,old_outcome using p_message;
 if p_type in ('email.bounced','email.complained','email.suppressed') and destination is not null then insert into communication_email_suppressions(address_hash,reason) values(destination,case p_type when 'email.bounced' then 'bounce' when 'email.complained' then 'complaint' else 'suppressed' end) on conflict(address_hash) do nothing;end if;
 execute format('update %I set delivery_outcome=$2 where provider_message_id=$1',table_name) using p_message,case when old_outcome in ('email.bounced','email.complained','email.suppressed') then old_outcome when p_type='email.delivered' then 'mail_server_accepted' when p_type='email.sent' then old_outcome else p_type end;
 update communication_provider_events set matched_at=clock_timestamp() where event_id=p_event;
 return true;
end;$$;
revoke all on function marketplace_email_event(text,text,text),marketplace_email_acceptance_state() from public,anon,authenticated;grant execute on function marketplace_email_event(text,text,text) to service_role;
commit;
