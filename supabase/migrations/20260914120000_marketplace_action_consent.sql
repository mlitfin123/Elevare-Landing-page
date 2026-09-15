-- Target: Elevare-Prod. Gate new marketplace requests, not sign-in or recovery.
begin;
set local lock_timeout = '5s';

create or replace function public.marketplace_current_legal_versions()
returns jsonb language sql immutable as $$
  select jsonb_build_object('termsVersion','2026-09-14','privacyVersion','2026-09-14','ageVersion','2026-08-20');
$$;

create or replace function public.marketplace_get_consent_status()
returns jsonb language sql stable security definer set search_path = public, auth, pg_temp as $$
  select public.marketplace_current_legal_versions() || jsonb_build_object('accepted', exists (
    select 1 from public.users u where u.auth_id = auth.uid() and u.is_active is true
      and exists(select 1 from public.user_legal_acceptances a
        join public.legal_document_versions d on d.id = a.legal_document_version_id
        where a.user_id = u.id and a.document_key = 'terms_of_service'
          and a.document_version = public.marketplace_current_legal_versions()->>'termsVersion'
          and d.document_key = a.document_key and d.version = a.document_version)
      and exists(select 1 from public.user_legal_acceptances a
        join public.legal_document_versions d on d.id = a.legal_document_version_id
        where a.user_id = u.id and a.document_key = 'privacy_policy'
          and a.document_version = public.marketplace_current_legal_versions()->>'privacyVersion'
          and d.document_key = a.document_key and d.version = a.document_version)
      and exists(select 1 from public.user_assertion_history a where a.auth_user_id = auth.uid()
        and a.marketplace_user_id = u.id and a.assertion_key = 'age_18_plus' and a.assertion_value is true
        and a.assertion_version = public.marketplace_current_legal_versions()->>'ageVersion')
  ));
$$;

-- No caller-supplied identity or timestamp; no direct writes to the evidence tables.
create or replace function public.marketplace_acknowledge_legal(
  p_terms_version text, p_privacy_version text, p_age_version text,
  p_terms_accepted boolean, p_privacy_acknowledged boolean, p_age_18_plus boolean
)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare account public.users%rowtype; versions jsonb := public.marketplace_current_legal_versions();
begin
  select * into account from public.users where auth_id = auth.uid() and is_active is true for update;
  if not found then raise exception using errcode='42501', message='Authentication required.'; end if;
  if p_terms_accepted is distinct from true or p_privacy_acknowledged is distinct from true or p_age_18_plus is distinct from true
    or p_terms_version is distinct from versions->>'termsVersion'
    or p_privacy_version is distinct from versions->>'privacyVersion'
    or p_age_version is distinct from versions->>'ageVersion' then
    raise exception using errcode='22023', message='MARKETPLACE_ACKNOWLEDGEMENT_REQUIRED';
  end if;
  if (select count(*) from public.legal_document_versions where
      (document_key='terms_of_service' and version=p_terms_version) or
      (document_key='privacy_policy' and version=p_privacy_version)) <> 2 then
    raise exception 'Legal document versions have not been registered.';
  end if;
  insert into public.user_legal_acceptances(user_id,document_key,document_version,accepted_role,
    accepted_at,acceptance_source,acceptance_method,legal_document_version_id)
  select account.id,d.document_key,d.version,case when account.role::text='trainer' then 'trainer' else 'client' end,
    now(),'marketplace_action','checkbox',d.id from public.legal_document_versions d
  where ((d.document_key='terms_of_service' and d.version=p_terms_version) or
    (d.document_key='privacy_policy' and d.version=p_privacy_version))
    and not exists(select 1 from public.user_legal_acceptances a
      where a.user_id=account.id and a.document_key=d.document_key and a.document_version=d.version);
  insert into public.user_assertion_history(auth_user_id,marketplace_user_id,assertion_key,assertion_value,
    assertion_version,asserted_at,assertion_method,assertion_source)
  values(auth.uid(),account.id,'age_18_plus',true,p_age_version,now(),'checkbox','marketplace_action') on conflict do nothing;
  return public.marketplace_get_consent_status();
end;
$$;

-- Preserve other shared-app legal documents. Terms/Privacy evidence is written
-- only by the authenticated acknowledgement RPC or trusted signup trigger.
drop policy if exists marketplace_legal_insert_server_only on public.user_legal_acceptances;
create policy marketplace_legal_insert_server_only on public.user_legal_acceptances as restrictive for insert to anon, authenticated
  with check (document_key not in ('terms_of_service','privacy_policy'));
drop policy if exists marketplace_legal_update_server_only on public.user_legal_acceptances;
create policy marketplace_legal_update_server_only on public.user_legal_acceptances as restrictive for update to anon, authenticated
  using (document_key not in ('terms_of_service','privacy_policy'))
  with check (document_key not in ('terms_of_service','privacy_policy'));
drop policy if exists marketplace_legal_delete_server_only on public.user_legal_acceptances;
create policy marketplace_legal_delete_server_only on public.user_legal_acceptances as restrictive for delete to anon, authenticated
  using (document_key not in ('terms_of_service','privacy_policy'));
revoke all on function public.marketplace_current_legal_versions() from public, anon;
revoke all on function public.marketplace_get_consent_status() from public, anon;
revoke all on function public.marketplace_acknowledge_legal(text,text,text,boolean,boolean,boolean) from public, anon;
grant execute on function public.marketplace_current_legal_versions(), public.marketplace_get_consent_status(),
  public.marketplace_acknowledge_legal(text,text,text,boolean,boolean,boolean) to authenticated, service_role;

create or replace function public.marketplace_require_action_consent()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  -- Preserve service automation and authorized moderation. Do not trust Auth metadata.
  if auth.role() = 'service_role' or public.marketplace_is_trust_reviewer() then return new; end if;
  if auth.uid() is null or not coalesce((public.marketplace_get_consent_status()->>'accepted')::boolean,false) then
    raise exception using errcode='42501', message='MARKETPLACE_ACKNOWLEDGEMENT_REQUIRED';
  end if;
  return new;
end;
$$;
revoke all on function public.marketplace_require_action_consent() from public, anon, authenticated;

-- Triggers also run inside security-definer RPCs, preventing direct API bypass.
drop trigger if exists marketplace_inquiry_consent on public.trainer_profile_inquiries;
create trigger marketplace_inquiry_consent before insert on public.trainer_profile_inquiries
  for each row execute function public.marketplace_require_action_consent();
drop trigger if exists marketplace_saved_consent on public.saved_trainer_profiles;
create trigger marketplace_saved_consent before insert on public.saved_trainer_profiles
  for each row execute function public.marketplace_require_action_consent();
drop trigger if exists marketplace_review_request_consent on public.trainer_verification_requests;
create trigger marketplace_review_request_consent before insert or update on public.trainer_verification_requests
  for each row execute function public.marketplace_require_action_consent();
drop trigger if exists marketplace_concierge_consent on public.marketplace_concierge_cases;
create trigger marketplace_concierge_consent before insert on public.marketplace_concierge_cases
  for each row execute function public.marketplace_require_action_consent();
drop trigger if exists marketplace_legacy_demand_consent on public.marketplace_search_demand;
create trigger marketplace_legacy_demand_consent before insert on public.marketplace_search_demand
  for each row execute function public.marketplace_require_action_consent();

-- New website signups must use the current server-controlled versions. Shared
-- Auth paths remain available; their first protected marketplace action asks.
create or replace function public.record_website_signup_legal_acceptance()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare metadata jsonb; versions jsonb := public.marketplace_current_legal_versions();
begin
  select raw_user_meta_data into metadata from auth.users where id = new.auth_id;
  if metadata->>'legal_acceptance_source' = 'website_signup' and (
      metadata->>'terms_version' is distinct from versions->>'termsVersion' or
      metadata->>'privacy_version' is distinct from versions->>'privacyVersion') then
    raise exception 'Use the current Terms of Service and Privacy Policy.';
  end if;
  perform public.marketplace_record_signup_legal_acceptance(new.id, false);
  return new;
end;
$$;

-- A proposed match is not permission to expose the client's private profile.
-- Preserve accepted coaching relationships used by shared-app messaging/RLS.
create or replace function public.marketplace_has_accepted_client_relationship(p_client_profile_id uuid)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.matches m join public.trainer_profiles t on t.id=m.trainer_profile_id
    join public.users u on u.id=t.user_id
    where m.client_profile_id=p_client_profile_id and u.auth_id=auth.uid() and u.is_active is true
      and m.status in ('accepted','active','completed')
  );
$$;
revoke all on function public.marketplace_has_accepted_client_relationship(uuid) from public, anon;
grant execute on function public.marketplace_has_accepted_client_relationship(uuid) to authenticated, service_role;
drop policy if exists "Matched professionals can read active client profiles" on public.client_profiles;
create policy "Matched professionals can read active client profiles" on public.client_profiles for select to authenticated
  using (public.marketplace_has_accepted_client_relationship(id));
drop policy if exists client_preferences_private on public.client_profiles;
create policy client_preferences_private on public.client_profiles as restrictive for select to authenticated
  using (user_id = public.marketplace_current_user_id() or public.marketplace_is_trust_reviewer()
    or public.marketplace_has_accepted_client_relationship(id));

-- Evidence cannot be replaced in place while retaining its review status.
-- New uploads use new paths; changing the record resets its review.
drop policy if exists trust_evidence_no_overwrite on storage.objects;
create policy trust_evidence_no_overwrite on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('credential-documents','professional-trust-evidence'))
  with check (bucket_id not in ('credential-documents','professional-trust-evidence'));

notify pgrst, 'reload schema';
commit;
