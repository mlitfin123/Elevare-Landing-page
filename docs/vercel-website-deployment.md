# Vercel website deployment

The production Vercel project must use `website` as its Root Directory. The repository contains one authoritative Vercel configuration at `website/vercel.json`.

Expected project settings:

- Framework preset: Next.js
- Root Directory: `website`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `out`

The build refreshes source data, canonicalizes workouts, generates sitemaps, exports the static application, and validates the final `out` artifact. `config/redirects.json` is generated from `lib/legacy-routes.ts` and must remain committed so Vercel can load redirects before serving the deployment.

Production training refreshes require `SUPABASE_SERVICE_ROLE_KEY` and the corresponding Supabase URL. A Vercel build fails rather than publishing stale training data when the configured production refresh cannot complete.

Use a clean Vercel redeployment after routing or generated-data remediation. The build does not depend on `.next` or `.generated` files from a previous deployment.
