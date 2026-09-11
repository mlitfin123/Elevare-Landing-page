param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$notificationRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$notificationSupabase = Join-Path $notificationRepo 'supabase'
$notificationVersion = '20260911120000'
$notificationMigration = Join-Path $notificationSupabase "migrations/${notificationVersion}_marketplace_notification_delivery.sql"
$notificationTemp = Join-Path $notificationRepo '.tmp/notification-migration-rehearsal.sql'
node (Join-Path $PSScriptRoot 'verify-marketplace-target.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Marketplace target verification failed.' }
$notificationSql = [IO.File]::ReadAllText($notificationMigration)
if (-not [regex]::IsMatch($notificationSql, '(?i)commit;\s*$')) { throw 'Expected a transaction-wrapped notification migration.' }
# This dedicated forward migration is independent of the unreconciled historical
# ledger. Never execute other pending migrations or repair historical versions.
$notificationRehearsal = [regex]::Replace($notificationSql, '(?i)commit;\s*$', "rollback;`n")
New-Item -ItemType Directory -Path (Split-Path $notificationTemp) -Force | Out-Null
[IO.File]::WriteAllText($notificationTemp, $notificationRehearsal)
Push-Location $notificationSupabase
try {
  & npx.cmd supabase db query --linked --file $notificationTemp
  if ($LASTEXITCODE -ne 0) { throw 'Notification migration rehearsal failed; nothing was applied.' }
  if (-not $Apply) { Write-Output 'Notification migration validated and rolled back. Use -Apply only for the reviewed rollout.'; return }
  & npx.cmd supabase db query --linked --file $notificationMigration
  if ($LASTEXITCODE -ne 0) { throw 'Notification migration failed.' }
  # This records only the exact new migration that just completed successfully.
  & npx.cmd supabase migration repair --linked --status applied $notificationVersion
  if ($LASTEXITCODE -ne 0) { throw 'Migration applied, but its new ledger row must still be recorded.' }
  Write-Output 'Applied and recorded only the notification delivery migration.'
} finally {
  Pop-Location
  if (Test-Path -LiteralPath $notificationTemp) { Remove-Item -LiteralPath $notificationTemp }
}
