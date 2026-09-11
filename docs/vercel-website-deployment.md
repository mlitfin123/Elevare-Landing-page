# Vercel website deployment

The production Vercel project must use `website` as its Root Directory. The repository contains one authoritative Vercel configuration at `website/vercel.json`.

Expected project settings:

- Framework preset: Next.js
- Root Directory: `website`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: framework default, with the Output Directory override disabled. Remove any old `out` override.

The application uses normal Next.js server rendering, route handlers and cached public professional data alongside static catalog pages. It is not a static export. The build refreshes nutrition/training source data, canonicalizes workouts, generates the remaining static sitemaps and validates compiled Next.js artifacts. Professional content and the professional sitemap are read at runtime. Routing configuration is generated from `lib/legacy-routes.ts`; keep the generated `website/vercel.json` configuration committed.

Vercel automatically configures output for its detected framework; see [Vercel build settings](https://vercel.com/docs/builds/configure-a-build). Do not publish an old `out` folder as the updated application.

Production training refreshes require `SUPABASE_SERVICE_ROLE_KEY` and the corresponding Supabase URL. A Vercel build fails rather than publishing stale training data when the configured production refresh cannot complete.

Professional runtime reads require the marketplace project's matching `SECOND_SUPABASE_URL` / `NEXT_PUBLIC_SECOND_SUPABASE_URL`, `NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY` and server-only `SECOND_SUPABASE_SERVICE_ROLE_KEY`. Configure server-only `PROFESSIONAL_REVALIDATION_SECRET` for publication delivery. See `website/docs/professional-runtime-operations.md` for Edge Function secrets, scheduling and release verification. These marketplace settings are separate from the primary training project. Environment changes take effect on a new deployment; see [Vercel environment variables](https://vercel.com/docs/environment-variables).

Use a clean Vercel redeployment after routing or generated-data remediation. The build does not depend on `.next` or `.generated` files from a previous deployment.
