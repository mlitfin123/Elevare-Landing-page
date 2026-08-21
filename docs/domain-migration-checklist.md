# ElevareFit `.com` domain migration checklist

The canonical website origin is `https://www.elevarefit.com`. Existing `@elevarefit.org` email addresses remain operational and must not be renamed as part of this migration. Historical legal archives also retain their original bytes and hashes.

## Before deployment

1. In Vercel, add `www.elevarefit.com` and `elevarefit.com` to the existing website project.
2. Configure the registrar DNS records exactly as Vercel specifies. Prefer the `www` hostname as primary and verify TLS on both `.com` hosts.
3. Keep `www.elevarefit.org` and `elevarefit.org` attached to the same project. Do not remove or block either old hostname.
4. In the Elevare Supabase project, set the Auth Site URL to `https://www.elevarefit.com`.
5. Add `https://www.elevarefit.com/**` and, during the transition, both `.org` variants to Supabase Auth Redirect URLs. Confirm the exact wildcard syntax shown by the Supabase dashboard before saving.
6. If Google or Apple OAuth is enabled, add the `.com` JavaScript origin and the Supabase callback URI required by that provider before removing any `.org` entries.
7. Deploy the updated `resend-waitlist` Edge Function to the existing waitlist Supabase project so browser requests from both `.com` hosts pass its explicit CORS allowlist. A website deployment alone does not publish that function.
8. Deploy a preview and run the full local validation suite. Confirm generated canonicals, Open Graph URLs, JSON-LD, robots, and every sitemap use `.com`.
9. Test signup confirmation, sign-in, sign-out, session restoration, and the waitlist form using the `.com` preview/production host. No password-reset or OAuth UI is currently implemented in this repository.

## Cutover

1. Confirm `https://www.elevarefit.com/` and representative deep links return `200` with valid TLS.
2. Make `www.elevarefit.com` the primary Vercel domain.
3. Keep `elevarefit.com`, `www.elevarefit.org`, and `elevarefit.org` assigned to the same Vercel project so the repository host rules can return path-preserving `308` responses. If Vercel's Domains dashboard is also configured with a cross-domain redirect, verify its actual status code; do not leave a `307` redirect in front of the project-level permanent rule.
4. Verify that homepage, StageLab, Logbook, calculators, exercises, workouts, nutrition, blog, marketplace, active legal pages, and legal archive paths redirect or resolve as expected.
5. Confirm old-domain requests preserve paths and query strings. Canonical old paths should redirect in one hop. A retired route may require a second route-canonicalization hop; monitor and reduce those only if they become material crawl paths.
6. Confirm `.org` never serves an independent `200` copy and is not blocked by robots.txt or `noindex` before the redirect is processed.

## Search and measurement

1. Add and verify the `.com` property in Google Search Console while retaining the `.org` property.
2. Submit `https://www.elevarefit.com/sitemap.xml`.
3. After redirects are live and verified, use Search Console Change of Address from `.org` to `.com`.
4. Monitor both properties for indexing, canonical selection, redirect errors, and crawl changes for at least several months.
5. Add and verify the `.com` site in Bing Webmaster Tools, submit the `.com` sitemap, and retain the old property during migration.
6. Keep the existing Google Analytics property and measurement ID. Confirm consent remains denied before opt-in, then check page views, source/medium, and unexpected self-referrals after cutover.

## External links and integrations

1. Update website, privacy, terms, and support URLs in Apple App Store Connect and Google Play Console for Logbook and StageLab. The app store download destinations themselves do not change.
2. Audit released mobile-app builds for hard-coded `.org` website links. Mobile app source is not present in this repository, so any required change needs a separate app release.
3. Update controlled links on Google Business Profile, Instagram, Facebook, LinkedIn, GitHub, forums, and other owned profiles.
4. Use `ElevareFit.com` on new packaging, marketplace listings, printed material, and QR codes. Existing `.org` QR codes remain usable through permanent redirects.
5. Update any external Stripe checkout return URLs, webhooks, transactional email links, or other callbacks if those integrations are added outside this repository. No Stripe or Quick Analysis implementation is present here today.

## Post-cutover spot checks

- `https://www.elevarefit.com/` returns `200`.
- The apex `.com` and both `.org` hostnames permanently redirect to the exact `www.elevarefit.com` path.
- `/robots.txt` references only the `.com` sitemap.
- `/sitemap.xml` and all segmented sitemaps contain only `.com` URLs.
- Current page canonicals, Open Graph URLs, structured data, and internal absolute links use `.com`.
- `@elevarefit.org` emails and `mailto:` links remain unchanged.
- Historical legal archive hashes still pass `npm run legal:verify`.
