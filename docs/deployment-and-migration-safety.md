# Deployment and migration safety

## Production website

Vercel is the authoritative production host for `www.elevarefit.org`. A push to the connected GitHub repository triggers the normal Vercel deployment. The scheduled `vercel-refresh.yml` workflow invokes the Vercel deployment hook so static marketplace and nutrition data can refresh.

The GitHub workflow in `.github/workflows/deploy.yml` validates the website only. It must not publish the production domain through GitHub Pages.

## Marketplace Supabase migrations

Run every command below from the repository root. Marketplace migrations in `supabase/migrations` must only be applied to the committed `Elevare-Prod` target in `supabase/marketplace-project.json`.

1. Link the Supabase CLI to the intended marketplace project if it is not already linked.
2. Run `powershell -File .\supabase\scripts\push-marketplace-migrations.ps1 -VerifyOnly`.
3. Confirm the helper reports the linked `Elevare-Prod` target and inspect every local/remote ledger row it prints.
4. Resolve any migration-history mismatch using the reconciliation procedure below. Do not continue merely because a schema object already exists.
5. Take the appropriate production backup and run `powershell -File .\supabase\scripts\push-marketplace-migrations.ps1 -Apply` only when every pending migration is known to be safe.
6. Re-run `-VerifyOnly`, inspect the remote ledger, and verify the affected production behavior.

The helper resolves paths relative to its own location, validates the linked project against an independently committed non-secret reference, lists pending migrations, and makes no changes unless `-Apply` is supplied. Apply mode refuses to continue while the known historic remediation versions remain absent from the remote ledger, then performs a Supabase dry run before any real push. A missing link, target mismatch, unresolved historic version, ledger-inspection failure, or dry-run failure aborts before the database push. Service-role keys and database passwords must remain in environment variables or approved secret stores and must never be committed.

## Manual migration ledger reconciliation

`MANUAL MIGRATION LEDGER RECONCILIATION REQUIRED`

The production schema contains security objects from remediation migrations that are not recorded in the remote migration ledger. Rerunning those migrations is unsafe because they include function replacements, triggers, grants, policies, data updates, and immutable legal-version operations. Do not run `migration repair` against a version until every operation in that migration has been compared with production.

For a migration proven to be fully represented and matching, Supabase supports recording the version with:

```powershell
Set-Location .\supabase
npx supabase migration repair --status applied <migration-version>
```

Then return to the repository root and run the helper with `-VerifyOnly`. If any operation is missing or differs, do not mark the historical migration applied wholesale. Create a forward-only migration containing only the required delta, verify it against a production schema dump, and apply it through the guarded helper.

The detailed current classification is in `docs/migration-ledger-reconciliation.md`.
