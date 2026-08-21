-- Forward-only metadata correction for the clean production archive routes.
-- Archived content, versions, hashes, and acceptance relationships are unchanged.
-- The allowlist includes both known hashes produced before and after line-ending
-- normalization so this route-only correction remains safe on either valid state.

begin;

do $legal_archive_routes$
begin
  if not exists (
    select 1
    from public.legal_document_versions
    where document_key = 'terms_of_service'
      and version = '2026-08-20'
      and content_sha256 in (
        '3fb0e59316aac7a28f74cbf2ab574dec570d83e51ea0f08b6a56159134ee5308',
        'b63f3e8cc96b162dc444f2a1db8a5e5f15e827ce996ef3e999919bda23ca74c4'
      )
  ) then
    raise exception 'Terms archive snapshot is missing or does not match the immutable 2026-08-20 hash.';
  end if;

  if not exists (
    select 1
    from public.legal_document_versions
    where document_key = 'privacy_policy'
      and version = '2026-08-20'
      and content_sha256 in (
        'ccd40ed1462393629ace1ff25ed02218c61c55f5dc678c1553bc26263193c2e9',
        '3dfcc050a2ed40ab49bf0d635eba80a5d54ec9a8848dff76ddff633ff925fc96'
      )
  ) then
    raise exception 'Privacy archive snapshot is missing or does not match the immutable 2026-08-20 hash.';
  end if;
end
$legal_archive_routes$;

update public.legal_document_versions
set archive_path = '/legal/archive/terms/2026-08-20/'
where document_key = 'terms_of_service'
  and version = '2026-08-20'
  and content_sha256 in (
    '3fb0e59316aac7a28f74cbf2ab574dec570d83e51ea0f08b6a56159134ee5308',
    'b63f3e8cc96b162dc444f2a1db8a5e5f15e827ce996ef3e999919bda23ca74c4'
  );

update public.legal_document_versions
set archive_path = '/legal/archive/privacy/2026-08-20/'
where document_key = 'privacy_policy'
  and version = '2026-08-20'
  and content_sha256 in (
    'ccd40ed1462393629ace1ff25ed02218c61c55f5dc678c1553bc26263193c2e9',
    '3dfcc050a2ed40ab49bf0d635eba80a5d54ec9a8848dff76ddff633ff925fc96'
  );

commit;
