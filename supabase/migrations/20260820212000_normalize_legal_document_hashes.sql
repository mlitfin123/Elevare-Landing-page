-- Normalize legal document hashes so they are stable across Git checkouts.

begin;

update public.legal_document_versions
set content_sha256 = case document_key
  when 'terms_of_service' then 'b63f3e8cc96b162dc444f2a1db8a5e5f15e827ce996ef3e999919bda23ca74c4'
  when 'privacy_policy' then '3dfcc050a2ed40ab49bf0d635eba80a5d54ec9a8848dff76ddff633ff925fc96'
  else content_sha256
end
where version = '2026-08-20'
  and document_key in ('terms_of_service', 'privacy_policy');

commit;
