param(
  [switch]$VerifyOnly,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$supabaseRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($VerifyOnly -and $Apply) {
  throw "Choose either -VerifyOnly or -Apply, not both."
}

Push-Location $supabaseRoot
try {
  node .\scripts\verify-marketplace-target.mjs
  if ($LASTEXITCODE -ne 0) {
    throw "Marketplace target verification failed. No migration command was run."
  }

  Write-Host "Inspecting the local and remote migration ledger without making database changes..."
  $migrationOutput = @(& npx.cmd supabase migration list)
  $migrationOutput | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase could not inspect the migration ledger. No migration was applied."
  }

  if (-not $Apply) {
    Write-Host "Verification complete. No database changes were made."
    exit 0
  }

  $ledgerText = $migrationOutput -join "`n"
  $unreconciledVersions = @(
    "20260820120000",
    "20260820210000",
    "20260820211000",
    "20260820212000"
  ) | Where-Object {
    $ledgerText -match ('"local":"' + $_ + '","remote":""') -or
    $ledgerText -match ('(?m)^\s*' + $_ + '\s*\|\s*\|')
  }
  if ($unreconciledVersions.Count -gt 0) {
    throw "MANUAL MIGRATION LEDGER RECONCILIATION REQUIRED. Historic remediation versions are absent remotely: $($unreconciledVersions -join ', '). No migration was applied."
  }

  Write-Host "Running the Supabase migration dry run..."
  & npx.cmd supabase db push --dry-run
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase migration dry run failed. No migration was applied."
  }

  Write-Host "Applying pending migrations to the verified Elevare marketplace project..."
  & npx.cmd supabase db push
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase migration command failed."
  }
} finally {
  Pop-Location
}
