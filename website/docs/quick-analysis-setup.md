# StageLab Quick Analysis production setup

The application code is complete, but production stays unavailable until Stripe, OpenAI, Supabase, and Vercel are configured. Do not commit any secret values.

## 1. Supabase

Target only the Elevare marketplace project:

- Project: `Elevare-Prod`
- Project ref: `cnfqpfynjpwlzdtblzps`
- Migration: `../supabase/migrations/20260821120000_stage_lab_quick_analysis.sql`

Verify the linked target before applying the migration. The migration creates `quick_analyses`, `quick_analysis_rate_limits`, and two server-only functions. It creates no storage bucket and no image or photo columns.

```powershell
npx supabase link --project-ref cnfqpfynjpwlzdtblzps
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Confirm that the existing Vercel variables `SECOND_SUPABASE_URL` and `SECOND_SUPABASE_SERVICE_ROLE_KEY` point to this same project. The service-role key must remain server-only.

## 2. Stripe

1. In Stripe, start in **Test mode**.
2. Create a product named `StageLab Quick Analysis`.
3. Add one active, one-time price for exactly **$0.99 USD**. Do not create a recurring price.
4. Copy the resulting `price_...` identifier into `STRIPE_QUICK_ANALYSIS_PRICE_ID`.
5. Add a webhook endpoint at `https://www.elevarefit.com/api/quick-analysis/webhook/`.
6. Subscribe it to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
7. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.
8. Put the matching test secret key in `STRIPE_SECRET_KEY`.
9. Complete the test matrix before replacing all three Stripe values with their matching live-mode values.

Never mix a test secret key, live price, or webhook secret from different Stripe modes.

## 3. OpenAI

1. Create a dedicated OpenAI API project for ElevareFit Quick Analysis so usage and spending are isolated from the StageLab mobile app.
2. Set a conservative project budget and usage alerts.
3. Create a project-scoped API key and store it as `OPENAI_API_KEY` in Vercel.
4. Choose a current multimodal model that supports the Responses API and strict structured outputs, then store its exact model ID as `OPENAI_QUICK_ANALYSIS_MODEL`.
5. Do not add the API key or model configuration to any `NEXT_PUBLIC_...` variable.

## 4. Vercel environment variables

Add these to Preview first, then Production after the test flow succeeds:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_QUICK_ANALYSIS_PRICE_ID
OPENAI_API_KEY
OPENAI_QUICK_ANALYSIS_MODEL
QUICK_ANALYSIS_TOKEN_PEPPER
CRON_SECRET
SECOND_SUPABASE_URL
SECOND_SUPABASE_SERVICE_ROLE_KEY
```

Generate independent high-entropy values for `QUICK_ANALYSIS_TOKEN_PEPPER` and `CRON_SECRET`; do not reuse an API key. Vercel sends `CRON_SECRET` as a bearer token to the daily cleanup route. The token pepper must remain stable or existing 72-hour result cookies will stop working.

## 5. Test-mode acceptance checks

Use Stripe test cards and a mocked or tightly budgeted OpenAI project. Verify:

1. Successful checkout returns to the clean result route and activates one entitlement.
2. Canceled and failed payments do not activate an entitlement.
3. Duplicate webhooks and a replayed Stripe success return do not create another purchase or another entitlement.
4. Three and five valid JPEG, PNG, or WebP photos work.
5. Invalid images, timeouts, provider rate limits, refusals, and malformed output show sanitized retry messaging.
6. A failed analysis keeps the paid entitlement and requires a fresh upload without another charge.
7. A completed entitlement cannot invoke OpenAI again.
8. Database records contain structured results and operational metadata only, with no photo data.
9. The result route returns `noindex, nofollow` and is absent from all sitemaps.
10. App Store and Google Play buttons open the official StageLab listings.

## 6. Live release

After test acceptance, switch Stripe to a live one-time price and matching live secret/webhook values, confirm the OpenAI budget, redeploy Vercel, complete one controlled live purchase, and issue a refund from Stripe after confirming delivery. Do not describe the feature as live until that production purchase, webhook, analysis, cleanup, and result retrieval have all been verified.
