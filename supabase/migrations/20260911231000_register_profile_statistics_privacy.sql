-- Register the exact privacy version used by new website signup checkboxes.
-- Existing acceptances and archived versions remain unchanged.
begin;
insert into public.legal_document_versions (document_key, version, effective_date, content_sha256, archive_path)
values ('privacy_policy', '2026-09-11', '2026-09-11', '213092cd05f461e9551bfb32608479fd717782db73dcc2a26ef18a13c22f8104', '/legal/archive/privacy/2026-09-11/')
on conflict (document_key, version) do nothing;
do $$
begin
  if exists (select 1 from public.legal_document_versions
    where document_key = 'privacy_policy' and version = '2026-09-11'
      and (content_sha256 is distinct from '213092cd05f461e9551bfb32608479fd717782db73dcc2a26ef18a13c22f8104'
        or archive_path is distinct from '/legal/archive/privacy/2026-09-11/'
        or effective_date is distinct from '2026-09-11'::date))
  then raise exception 'Existing privacy version differs; preserve and review the archive.'; end if;
end;
$$;
commit;
