# Deployment and migration safety

## Production website

Vercel is the authoritative production host for `www.elevarefit.org`. A push to the connected GitHub repository triggers the normal Vercel deployment. The scheduled `vercel-refresh.yml` workflow invokes the Vercel deployment hook so static marketplace and nutrition data can refresh.

The GitHub workflow in `.github/workflows/deploy.yml` validates the website only. It must not publish the production domain through GitHub Pages.

## Marketplace Supabase migrations

Marketplace migrations in `supabase/migrations` must only be applied to the Elevare marketplace project. Before any push:

1. Set the non-secret `ELEVARE_MARKETPLACE_PROJECT_REF` environment variable to the intended marketplace project reference.
2. Link the Supabase CLI to that same project.
3. Run `powershell -File .\supabase\scripts\push-marketplace-migrations.ps1` to verify the target without applying changes.
4. Review pending migrations and backups.
5. Run the same command with `-Apply` only after the verification succeeds.

The script aborts when the expected and linked project references differ. Service-role keys and database passwords must remain in environment variables or approved secret stores and must never be committed.
