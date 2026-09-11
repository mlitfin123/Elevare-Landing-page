$ErrorActionPreference = 'Stop'
$notificationRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$notificationSupabase = Join-Path $notificationRepo 'supabase'
node (Join-Path $PSScriptRoot 'verify-marketplace-target.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Marketplace target verification failed.' }
$notificationProject = Get-Content -LiteralPath (Join-Path $notificationSupabase 'marketplace-project.json') -Raw | ConvertFrom-Json
$notificationSecretFile = Join-Path ([IO.Path]::GetTempPath()) ('elevare-notification-vault-' + [guid]::NewGuid().ToString('N') + '.sql')
Push-Location $notificationSupabase
try {
  # Capture credentials in memory. Never print CLI output from this command.
  $notificationKeysRaw = & npx.cmd supabase projects api-keys --project-ref $notificationProject.projectRef --output json
  if ($LASTEXITCODE -ne 0) { throw 'Could not obtain the existing scheduler credential.' }
  $notificationKeys = $notificationKeysRaw | ConvertFrom-Json
  $notificationServiceKey = ($notificationKeys | Where-Object { $_.name -eq 'service_role' }).api_key
  if ($notificationServiceKey -notmatch '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    throw 'A full legacy service-role JWT is required for the verified function.'
  }
  $notificationVaultSql = @'
do $vault$
declare existing_id uuid;
begin
  select id into existing_id from vault.secrets where name = 'marketplace_email_service_role_key';
  if existing_id is null then
    perform vault.create_secret('__SERVICE_KEY__', 'marketplace_email_service_role_key', 'Private marketplace notification scheduler');
  else
    perform vault.update_secret(existing_id, '__SERVICE_KEY__', 'marketplace_email_service_role_key', 'Private marketplace notification scheduler');
  end if;
end;
$vault$;
'@
  [IO.File]::WriteAllText($notificationSecretFile, $notificationVaultSql.Replace('__SERVICE_KEY__', $notificationServiceKey))
  # Capture all output: a provider error could echo the SQL. Only a fixed success
  # or failure message is allowed into the console. Always remove the temp file.
  try {
    $ErrorActionPreference = 'Continue'
    $notificationVaultOutput = & npx.cmd supabase db query --linked --file $notificationSecretFile 2>&1
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw 'Vault setup failed.' }
  } catch { throw 'Could not configure the notification Vault credential; sensitive output was suppressed.' }
  finally { $ErrorActionPreference = 'Stop' }
  Write-Output 'Configured the private notification scheduler credential in Supabase Vault. No key values were printed.'
} finally {
  Pop-Location
  if (Test-Path -LiteralPath $notificationSecretFile) { Remove-Item -LiteralPath $notificationSecretFile }
  $notificationKeysRaw = $null; $notificationKeys = $null; $notificationServiceKey = $null; $notificationVaultOutput = $null
}
