-- Record the exact legal versions checked during website signup. The existing
-- acceptance tables, history and admin view remain the source of truth.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Hashes use the immutable archive bytes with CRLF normalized to LF, matching
-- website/scripts/generate-legal-archive.ts. Existing versions are never edited.
insert into public.legal_document_versions(document_key, version, effective_date, content_sha256, archive_path)
values
  ('terms_of_service', '2026-08-21', '2026-08-21', 'e0d41bff58e658f6a569ccbe21529bee70d814fb6ad69c4834c21e39f1d88a58', '/legal/archive/terms/2026-08-21/'),
  ('privacy_policy', '2026-08-21', '2026-08-21', '957eb2293fc5ae02e8c7d0592686f52876db8862fdf092edf4431c81abab503e', '/legal/archive/privacy/2026-08-21/'),
  ('terms_of_service', '2026-09-07', '2026-09-07', 'ad792377892d9b7c7118011caa91c04de73c8a1f7834ee14cc0065b0a71fad4b', '/legal/archive/terms/2026-09-07/'),
  ('privacy_policy', '2026-09-07', '2026-09-07', '2a57e4dbb104265d589855de3120877632a3a7c8e0c29db1f1ed45f5d8d6f718', '/legal/archive/privacy/2026-09-07/')
on conflict (document_key, version) do nothing;

do $$
begin
  if exists (
    select 1 from (values
      ('terms_of_service', '2026-08-21', 'e0d41bff58e658f6a569ccbe21529bee70d814fb6ad69c4834c21e39f1d88a58', '/legal/archive/terms/2026-08-21/'),
      ('privacy_policy', '2026-08-21', '957eb2293fc5ae02e8c7d0592686f52876db8862fdf092edf4431c81abab503e', '/legal/archive/privacy/2026-08-21/'),
      ('terms_of_service', '2026-09-07', 'ad792377892d9b7c7118011caa91c04de73c8a1f7834ee14cc0065b0a71fad4b', '/legal/archive/terms/2026-09-07/'),
      ('privacy_policy', '2026-09-07', '2a57e4dbb104265d589855de3120877632a3a7c8e0c29db1f1ed45f5d8d6f718', '/legal/archive/privacy/2026-09-07/')
    ) expected(document_key, version, hash, path)
    join public.legal_document_versions actual using(document_key, version)
    where actual.content_sha256 is distinct from expected.hash
      or actual.archive_path is distinct from expected.path
      or actual.effective_date is distinct from expected.version::date
  ) then raise exception 'An existing legal archive version differs. Review it without overwriting evidence.'; end if;
end;
$$;

create or replace function public.marketplace_record_signup_legal_acceptance(p_user_id uuid, p_recovery boolean default false)
returns integer language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  signup_metadata jsonb; signup_at timestamptz; auth_user_id_value uuid;
  supplied_country text; accepted_role_value text; method_value text;
  terms public.legal_document_versions%rowtype; privacy public.legal_document_versions%rowtype;
  inserted_count integer;
begin
  -- Lock the account so retries cannot duplicate its acceptance evidence.
  select a.raw_user_meta_data, a.created_at, a.id into signup_metadata, signup_at, auth_user_id_value
    from public.users u join auth.users a on a.id = u.auth_id
    where u.id = p_user_id and u.is_active is true for update of u;
  if not found or signup_metadata->>'legal_acceptance_source' is distinct from 'website_signup' then return 0; end if;

  select * into terms from public.legal_document_versions
    where document_key = 'terms_of_service' and version = signup_metadata->>'terms_version';
  select * into privacy from public.legal_document_versions
    where document_key = 'privacy_policy' and version = signup_metadata->>'privacy_version';
  if signup_metadata->>'legal_acceptance' is distinct from 'true'
    or signup_metadata->>'age_18_plus' is distinct from 'true'
    or signup_metadata->>'age_attestation_version' is distinct from '2026-08-20'
    or terms.id is null or privacy.id is null or signup_at is null
    or terms.effective_date > (signup_at at time zone 'UTC')::date
    or privacy.effective_date > (signup_at at time zone 'UTC')::date then
    if p_recovery then return 0; end if;
    raise exception 'Confirm the Terms of Service, Privacy Policy, and age requirement using recognized document versions.';
  end if;

  supplied_country := upper(nullif(btrim(signup_metadata->>'country_code'), ''));
  if supplied_country is not null and supplied_country !~ '^[A-Z]{2}$' then supplied_country := null; end if;
  -- This is the role declared at signup, not a later profile approval or role
  -- change. Account-level Terms/Privacy records remain valid for that same user.
  accepted_role_value := case when lower(coalesce(signup_metadata->>'accepted_role', signup_metadata->>'role', ''))
    in ('trainer', 'coach', 'professional') then 'trainer' else 'client' end;
  method_value := case when p_recovery then 'signup_metadata_recovery' else 'checkbox' end;

  insert into public.user_legal_acceptances (
    user_id, document_key, document_version, accepted_role, accepted_at,
    acceptance_source, acceptance_method, acceptance_country_code, legal_document_version_id
  )
  select p_user_id, d.document_key, d.version, accepted_role_value, signup_at,
    'website_signup', method_value, supplied_country, d.id
  from public.legal_document_versions d where d.id in (terms.id, privacy.id)
    and not exists(select 1 from public.user_legal_acceptances existing
      where existing.user_id = p_user_id and existing.document_key = d.document_key and existing.document_version = d.version);
  get diagnostics inserted_count = row_count;

  insert into public.user_assertion_history (
    auth_user_id, marketplace_user_id, assertion_key, assertion_value, assertion_version,
    asserted_at, assertion_method, assertion_source
  ) values (auth_user_id_value, p_user_id, 'age_18_plus', true, '2026-08-20', signup_at, method_value, 'website_signup')
  on conflict do nothing;
  return inserted_count;
end;
$$;
revoke all on function public.marketplace_record_signup_legal_acceptance(uuid, boolean) from public, anon, authenticated;
grant execute on function public.marketplace_record_signup_legal_acceptance(uuid, boolean) to service_role;

create or replace function public.record_website_signup_legal_acceptance()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.marketplace_record_signup_legal_acceptance(new.id, false);
  return new;
end;
$$;
revoke all on function public.record_website_signup_legal_acceptance() from public, anon, authenticated;
grant execute on function public.record_website_signup_legal_acceptance() to service_role;

-- Ensure creation is covered without reacting to later user-editable Auth
-- metadata updates. Existing history is never replaced by a later assertion.
drop trigger if exists users_record_website_legal_acceptance on public.users;
create trigger users_record_website_legal_acceptance after insert on public.users
  for each row execute function public.record_website_signup_legal_acceptance();

-- Recover only explicit, versioned website signup assertions. The helper also
-- validates age/version evidence and release dates. Recovery is distinguished
-- from a newly observed checkbox action; created_at records the recovery time.
do $$
declare candidate uuid;
begin
  for candidate in select u.id from public.users u join auth.users a on a.id = u.auth_id
    where u.is_active is true and a.raw_user_meta_data->>'legal_acceptance_source' = 'website_signup'
      and a.raw_user_meta_data->>'legal_acceptance' = 'true'
      and a.raw_user_meta_data->>'age_18_plus' = 'true'
  loop
    perform public.marketplace_record_signup_legal_acceptance(candidate, true);
  end loop;
end;
$$;
commit;
