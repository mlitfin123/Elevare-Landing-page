-- Local draft: retain existing outboxes, templates, source checks and receipts.
begin;
create table marketplace_communication_bridge(singleton boolean primary key default true check(singleton),mode text not null default 'legacy' check(mode in ('legacy','preparing','coordinated','rollback')),namespace text,project_ref text,review_evidence text,verified_at timestamptz);
insert into marketplace_communication_bridge(singleton) values(true);
create table if not exists communication_bridge_nonces(namespace text not null,nonce uuid not null,body_hash text not null,received_at timestamptz not null default now(),primary key(namespace,nonce));
create or replace function communication_bridge_nonce(p_namespace text,p_nonce uuid,p_hash text) returns boolean language plpgsql security definer set search_path=public as $$begin insert into communication_bridge_nonces(namespace,nonce,body_hash) values(p_namespace,p_nonce,p_hash) on conflict do nothing;return found;end;$$;
alter table professional_email_outbox add column delivery_owner text not null default 'legacy' check(delivery_owner in ('legacy','coordinated')),add column bridge_state text,add column bridge_notice_id uuid,add column bridge_checked_at timestamptz,add column bridge_sequence bigint not null default 0;
alter table marketplace_concierge_notification_outbox add column delivery_owner text not null default 'legacy' check(delivery_owner in ('legacy','coordinated')),add column bridge_state text,add column bridge_notice_id uuid,add column bridge_checked_at timestamptz,add column bridge_sequence bigint not null default 0;
create function marketplace_bridge_owner() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_op='INSERT' and coalesce(to_jsonb(new)->>'recipient_role','')<>'operator' and exists(select 1 from marketplace_communication_bridge where mode='coordinated' and verified_at is not null and length(review_evidence)>10 and namespace is not null and project_ref is not null) then new.delivery_owner:='coordinated';new.bridge_state:='pending';end if;
 if tg_op='UPDATE' and old.delivery_owner='coordinated' and new.delivery_owner<>'coordinated' then raise exception 'bridge_owner_pinned';end if;
 return new;end;$$;
create trigger professional_bridge_owner before insert or update on professional_email_outbox for each row execute function marketplace_bridge_owner();
create trigger concierge_bridge_owner before insert or update on marketplace_concierge_notification_outbox for each row execute function marketplace_bridge_owner();
-- Existing workers must not spend legacy leases/retries on transferred work.
do $$declare definition text;begin
 definition:=pg_get_functiondef('marketplace_claim_notification_before_attempt_safety()'::regprocedure);definition:=replace(definition,'where status in (','where delivery_owner=''legacy'' and status in (');execute definition;
end;$$;
do $$declare signature text;definition text;needle text;begin foreach signature in array array['marketplace_claim_professional_approval_email(uuid,boolean)','marketplace_claim_professional_inquiry_email(uuid)'] loop
 definition:=pg_get_functiondef(signature::regprocedure);needle:=case when signature like '%approval%' then 'professional_approved:''||p_professional_id' else 'new_consultation_request:''||p_inquiry_id' end;
 -- Insert the pin check immediately before the existing unknown-attempt check.
 definition:=replace(definition,'if exists(select 1 from professional_email_outbox where event_key=', 'if exists(select 1 from professional_email_outbox where delivery_owner=''coordinated'' and event_key='||quote_literal(split_part(needle,':',1)||':')||'||'||case when signature like '%approval%' then 'p_professional_id' else 'p_inquiry_id' end||') then return (select jsonb_build_object(''claimed'',false,''reason'',''coordinated'',''event_id'',id) from professional_email_outbox where event_key='||quote_literal(split_part(needle,':',1)||':')||'||'||case when signature like '%approval%' then 'p_professional_id' else 'p_inquiry_id' end||');end if; if exists(select 1 from professional_email_outbox where event_key=');execute definition;
end loop;end;$$;
-- Replace the global hold with a per-event owner gate, retaining all existing
-- verified-address, consent, suppression, source, lease and attempt checks.
do $$declare definition text;begin
 definition:=pg_get_functiondef('marketplace_email_start(text,uuid,uuid,text)'::regprocedure);
 definition:=replace(definition,'if to_regclass(''public.communication_policy'') is not null then execute ''select delivery_enabled from communication_policy where singleton'' into coordinated;if coordinated then return false;end if;end if;','');
 if position('into e using p_id;' in definition)=0 then raise exception 'bridge_schema_review_required';end if;
 definition:=replace(definition,'into e using p_id;','into e using p_id; if e->>''delivery_owner''<>''legacy'' or exists(select 1 from marketplace_communication_bridge where mode=''rollback'' or mode=''coordinated'' and coalesce(e->>''recipient_role'','''')<>''operator'') then return false;end if;');execute definition;
end;$$;
create function marketplace_bridge_project(p_table text,p_id uuid,p_takeover boolean default false) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare e jsonb;c jsonb;u users;cfg marketplace_communication_bridge;kind text;email text;current_source boolean:=false;consent boolean:=false;deadline timestamptz;sequence_value bigint;handled boolean:=false;begin
 if auth.role() is distinct from 'service_role' or p_table not in ('professional_email_outbox','marketplace_concierge_notification_outbox') then raise exception 'bridge_unauthorized' using errcode='42501';end if;
 select * into cfg from marketplace_communication_bridge where singleton;
 execute format('select to_jsonb(e) from %I e where id=$1 for update',p_table) into e using p_id;
 if e is null then return null;end if;
 if p_takeover and cfg.mode='coordinated' and cfg.verified_at is not null and length(cfg.review_evidence)>10 and cfg.namespace is not null and cfg.project_ref is not null and e->>'status' not in ('sent','cancelled','disabled','ambiguous') and e->>'provider_started_at' is null and coalesce(e->>'recipient_role','')<>'operator' then
  execute format('update %I set delivery_owner=''coordinated'',bridge_state=coalesce(bridge_state,''pending'') where id=$1',p_table) using p_id;e:=e||'{"delivery_owner":"coordinated"}';
 end if;
 if e->>'delivery_owner'<>'coordinated' then return null;end if;
 execute format('update %I set bridge_checked_at=clock_timestamp() where id=$1',p_table) using p_id;
 if p_table='professional_email_outbox' and (e->>'event_key') is distinct from ((e->>'event_type')||':'||case when e->>'event_type'='professional_approved' then e->>'trainer_profile_id' else e->>'inquiry_id' end) then execute format('update %I set bridge_state=''source_key_review'' where id=$1',p_table) using p_id;return null;end if;
 kind:=e->>'event_type';
 if p_table='professional_email_outbox' then
  select a.* into u from users a join trainer_profiles t on t.user_id=a.id where t.id=(e->>'trainer_profile_id')::uuid and t.deleted_at is null and t.verification_status::text='verified' and to_jsonb(t)->>'service_departed_at' is null and a.is_active and to_jsonb(a)->>'deleted_at' is null;
  if kind='professional_approved' then select exists(select 1 from trainer_profiles where id=(e->>'trainer_profile_id')::uuid and profile_live and verification_status::text='verified') into current_source;
  elsif kind='new_consultation_request' then select exists(select 1 from trainer_profile_inquiries i join users client on client.id=i.client_user_id where i.id=(e->>'inquiry_id')::uuid and i.status::text='new' and client.is_active and to_jsonb(client)->>'deleted_at' is null) into current_source;end if;
  consent:=current_source;if kind='new_consultation_request' then select exists(select 1 from trainer_profile_inquiries where id=(e->>'inquiry_id')::uuid and status::text in ('viewed','contacted','accepted','declined','closed')) into handled;end if;
 else
  if e->>'recipient_role'='operator' then return null;end if;
  c:=marketplace_notification_recipient(p_id);select * into u from users where id=(e->>'recipient_user_id')::uuid and is_active and to_jsonb(users)->>'deleted_at' is null;current_source:=c is not null;consent:=current_source;
  if e->>'recommendation_id' is not null and kind in ('professional_invited','professional_response_reminder') then select response_deadline_at into deadline from marketplace_concierge_recommendations where id=(e->>'recommendation_id')::uuid;end if;
 end if;
 select lower(trim(a.email)) into email from auth.users a where a.id=u.auth_id and a.email_confirmed_at is not null and lower(trim(a.email))=lower(trim(u.email));
 if email is null then execute format('update %I set bridge_state=''verified_destination_review'' where id=$1',p_table) using p_id;return null;end if;
 if exists(select 1 from communication_email_suppressions where address_hash=encode(sha256(convert_to(email,'UTF8')),'hex')) then consent:=false;end if;
 execute format('update %I set bridge_sequence=bridge_sequence+1 where id=$1 returning bridge_sequence',p_table) into sequence_value using p_id;
 return jsonb_build_object('sequence',sequence_value,'handled',handled,'table',p_table,'id',p_id,'version',encode(sha256(convert_to(coalesce(e->>'event_key',e->>'idempotency_key'),'UTF8')),'hex'),'user_id',u.id,'auth_id',u.auth_id,'destination_hash',encode(sha256(convert_to(email,'UTF8')),'hex'),'kind',kind,'created_at',e->>'created_at','deadline',deadline,'consent',consent,'current',current_source);
end;$$;
create function marketplace_bridge_pending() returns jsonb language plpgsql security definer set search_path=public as $$declare result jsonb:='[]';t text;e record;p jsonb;begin
 if auth.role() is distinct from 'service_role' then raise exception 'bridge_unauthorized';end if;
 foreach t in array array['professional_email_outbox','marketplace_concierge_notification_outbox'] loop
  for e in execute format('select id from %I e where coalesce(to_jsonb(e)->>''recipient_role'','''')<>''operator'' and (status not in (''sent'',''disabled'',''cancelled'',''ambiguous'') and provider_started_at is null and coalesce(bridge_state,'''')<>''handled'' or delivery_owner=''coordinated'' and status=''sent'') order by bridge_checked_at nulls first,created_at,id limit 10',t) loop
   p:=marketplace_bridge_project(t,e.id,true);if p is not null then result:=result||jsonb_build_array(p);end if;
  end loop;
 end loop;return result;
end;$$;
create function marketplace_bridge_ack(p_table text,p_id uuid,p_state text,p_notice uuid,p_provider text default null,p_destination text default null,p_receipt text default null) returns boolean language plpgsql security definer set search_path=public as $$declare changed integer;begin
 if auth.role() is distinct from 'service_role' or p_table not in ('professional_email_outbox','marketplace_concierge_notification_outbox') or p_state not in ('accepted','pending_review','source_hold','handled','ambiguous','provider_accepted') then raise exception 'bridge_ack_invalid';end if;
 execute format('update %I set bridge_checked_at=clock_timestamp() where id=$1 and delivery_owner=''coordinated''',p_table) using p_id;
 if p_receipt in ('email.bounced','email.complained','email.suppressed') and p_destination ~ '^[a-f0-9]{64}$' then insert into communication_email_suppressions(address_hash,reason) values(p_destination,case p_receipt when 'email.bounced' then 'bounce' when 'email.complained' then 'complaint' else 'suppressed' end) on conflict do nothing;end if;
 if p_state='provider_accepted' and coalesce(length(p_provider),0) not between 1 and 200 then raise exception 'bridge_provider_evidence_required';end if;
 execute format('update %I set bridge_notice_id=coalesce(bridge_notice_id,$2),bridge_state=$3,provider_message_id=case when $3=''provider_accepted'' then $4 else provider_message_id end,destination_hash=case when $3=''provider_accepted'' then $5 else destination_hash end,sent_at=case when $3=''provider_accepted'' then coalesce(sent_at,now()) else sent_at end,status=case when $3=''provider_accepted'' then ''sent'' else status end,delivery_outcome=case when $3=''provider_accepted'' then ''provider_accepted'' else delivery_outcome end where id=$1 and delivery_owner=''coordinated'' and (bridge_notice_id is null or bridge_notice_id=$2) and bridge_state is distinct from ''provider_accepted''',p_table) using p_id,p_notice,p_state,p_provider,p_destination;get diagnostics changed=row_count;return changed>0;
end;$$;
create function marketplace_bridge_open(p_table text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare e jsonb;actor uuid;begin
 select id into actor from users where auth_id=auth.uid() and is_active and to_jsonb(users)->>'deleted_at' is null;
 if actor is null or p_table not in ('professional_email_outbox','marketplace_concierge_notification_outbox') then raise exception 'bridge_notice_unavailable' using errcode='42501';end if;
 execute format('select to_jsonb(e) from %I e where id=$1',p_table) into e using p_id;
 if e is null or (p_table='professional_email_outbox' and not exists(select 1 from trainer_profiles where id=(e->>'trainer_profile_id')::uuid and user_id=actor and deleted_at is null)) or (p_table='marketplace_concierge_notification_outbox' and e->>'recipient_user_id' is distinct from actor::text) then raise exception 'bridge_notice_unavailable' using errcode='42501';end if;
 -- Existing dashboards requery their own authorized current source and actions.
 return jsonb_build_object('available',true,'section',case when p_table='professional_email_outbox' then 'professional' else 'concierge' end,'provider_accepted',e->>'bridge_state'='provider_accepted','event',e->>'event_type');
end;$$;
create function marketplace_bridge_operations() returns jsonb language sql stable security definer set search_path=public as $$select jsonb_build_object('configuration',(select to_jsonb(c) from marketplace_communication_bridge c where singleton),'obligations',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select delivery_owner,bridge_state,status,count(*) records,min(created_at) oldest from(select delivery_owner,bridge_state,status,created_at from professional_email_outbox union all select delivery_owner,bridge_state,status,created_at from marketplace_concierge_notification_outbox)s group by delivery_owner,bridge_state,status)t));$$;
alter table marketplace_communication_bridge enable row level security;revoke all on marketplace_communication_bridge from public,anon,authenticated;
alter table communication_bridge_nonces enable row level security;revoke all on communication_bridge_nonces from public,anon,authenticated;
revoke all on function communication_bridge_nonce(text,uuid,text) from public,anon,authenticated;grant execute on function communication_bridge_nonce(text,uuid,text) to service_role;
revoke all on function marketplace_bridge_owner(),marketplace_bridge_project(text,uuid,boolean),marketplace_bridge_pending(),marketplace_bridge_ack(text,uuid,text,uuid,text,text,text),marketplace_bridge_open(text,uuid),marketplace_bridge_operations() from public,anon,authenticated;
grant execute on function marketplace_bridge_project(text,uuid,boolean),marketplace_bridge_pending(),marketplace_bridge_ack(text,uuid,text,uuid,text,text,text),marketplace_bridge_operations() to service_role;
grant execute on function marketplace_bridge_open(text,uuid) to authenticated;
commit;
