param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$legalRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$legalSupabase = Join-Path $legalRepo 'supabase'
$legalVersion = '20260911190000'
$legalMigration = Join-Path $legalSupabase "migrations/${legalVersion}_website_signup_legal_acceptance.sql"
$legalTemp = Join-Path $legalRepo '.tmp/signup-legal-rehearsal.sql'
node (Join-Path $PSScriptRoot 'verify-marketplace-target.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Marketplace target verification failed.' }
$legalSql = [IO.File]::ReadAllText($legalMigration)
if (-not [regex]::IsMatch($legalSql, '(?i)commit;\s*$')) { throw 'Expected a transaction-wrapped legal migration.' }
# Exercise the actual Auth -> application-user -> acceptance trigger chain.
# This synthetic record and the entire rehearsal migration are rolled back.
$legalAssertions = @'
do $smoke$
declare test_auth_id uuid := gen_random_uuid(); test_user_id uuid;
begin
  insert into auth.users(id,email,aud,role,created_at,updated_at,raw_user_meta_data)
  values(test_auth_id,'consent-test-' || test_auth_id || '@example.invalid','authenticated','authenticated',now(),now(),
    jsonb_build_object('role','trainer','legal_acceptance_source','website_signup','legal_acceptance',true,
      'terms_version','2026-09-07','privacy_version','2026-09-07','age_18_plus',true,'age_attestation_version','2026-08-20'));
  select id into test_user_id from public.users where auth_id=test_auth_id;
  if (select count(*) from public.user_legal_acceptances where user_id=test_user_id
      and document_key in ('terms_of_service','privacy_policy') and document_version='2026-09-07'
      and legal_document_version_id is not null and accepted_role='trainer' and acceptance_method='checkbox') <> 2 then
    raise exception 'Synthetic signup did not record both exact legal versions.';
  end if;
  if (select count(*) from public.user_legal_acceptance_history where auth_user_id=test_auth_id
      and terms_version='2026-09-07' and privacy_version='2026-09-07'
      and terms_document_version_id is not null and privacy_document_version_id is not null) <> 1 then
    raise exception 'Synthetic signup did not record its immutable legal history.';
  end if;
end;
$smoke$;
rollback;
'@
$legalRehearsal = [regex]::Replace($legalSql, '(?i)commit;\s*$', [Text.RegularExpressions.MatchEvaluator]{ param($match) $legalAssertions })
New-Item -ItemType Directory -Path (Split-Path $legalTemp) -Force | Out-Null
[IO.File]::WriteAllText($legalTemp, $legalRehearsal)
Push-Location $legalSupabase
try {
  & npx.cmd supabase db query --linked --file $legalTemp
  if ($LASTEXITCODE -ne 0) { throw 'Legal migration/signup rehearsal failed; nothing was applied.' }
  if (-not $Apply) { Write-Output 'Validated the actual signup trigger chain and rolled back every rehearsal change.'; return }
  & npx.cmd supabase db query --linked --file $legalMigration
  if ($LASTEXITCODE -ne 0) { throw 'Legal acceptance migration failed.' }
  & npx.cmd supabase migration repair --linked --status applied $legalVersion
  if ($LASTEXITCODE -ne 0) { throw 'Migration applied; its new ledger row still needs recording.' }
  Write-Output 'Applied and recorded only the signup legal acceptance migration.'
} finally {
  Pop-Location
  if (Test-Path -LiteralPath $legalTemp) { Remove-Item -LiteralPath $legalTemp }
}
