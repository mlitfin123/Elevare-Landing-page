-- Elevare-Prod: register new immutable versions before deploying the website.
begin;
insert into public.legal_document_versions(document_key,version,effective_date,content_sha256,archive_path)
values ('terms_of_service', '2026-09-14', '2026-09-14', '0fc9a02e2eb7e5f1a39e7a79ef047266d1a7f9201a473eb8d0e6c7bb5b182b2a', '/legal/archive/terms/2026-09-14/'),
('privacy_policy', '2026-09-14', '2026-09-14', '676740c227829353138b3d955133cc2521db579cef7f72963173b6c553e6b754', '/legal/archive/privacy/2026-09-14/')
on conflict (document_key,version) do nothing;
do $$ begin
  if exists(select 1 from (values ('terms_of_service', '2026-09-14', '2026-09-14', '0fc9a02e2eb7e5f1a39e7a79ef047266d1a7f9201a473eb8d0e6c7bb5b182b2a', '/legal/archive/terms/2026-09-14/'),
('privacy_policy', '2026-09-14', '2026-09-14', '676740c227829353138b3d955133cc2521db579cef7f72963173b6c553e6b754', '/legal/archive/privacy/2026-09-14/')) expected(document_key,version,effective_date,hash,path)
    join public.legal_document_versions actual using(document_key,version)
    where actual.content_sha256 is distinct from expected.hash or actual.archive_path is distinct from expected.path
      or actual.effective_date is distinct from expected.effective_date::date) then
    raise exception 'Existing legal version differs; do not overwrite historical evidence.';
  end if;
end; $$;
commit;
