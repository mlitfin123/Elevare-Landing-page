param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Push-Location $repositoryRoot
try {
  node .\supabase\scripts\verify-marketplace-target.mjs
  if (-not $Apply) {
    Write-Host "Target verified. Re-run with -Apply to execute pending migrations."
    exit 0
  }

  npx supabase db push --workdir supabase
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase migration command failed."
  }
} finally {
  Pop-Location
}
