# Marketplace notification delivery

The `marketplace-notification-delivery` Supabase Edge Function delivers the existing Concierge templates through Resend. No Resend template IDs are needed. Simple admin alerts go to `mlitfin@elevarefit.org` by default.

## Messages

- Admin: new match request, professional profile submitted for review, new direct consultation inquiry, and professional response to a match invitation.
- Client: match request receipt, shortlist ready, selection received, introduction completed, rematch confirmation, and case closed.
- Professional: match invitation and introduction completed.
- Optional reminders: unanswered professional invitations after 24 hours and within 24 hours of expiry; due client shortlist and post-introduction follow-ups. Both require the recipient to enable reminders.

Admin messages contain a short description and reference, with no inquiry narrative, names, contact information, or health details. Review the source record in the separate admin app. The original professional inquiry and approval email functions remain separate; this worker does not change their delivery or the disabled trust/monthly-summary scaffolding.

## Preferences and safeguards

The account's **Email notifications** panel is available in English, Spanish, and Portuguese. Match updates default on; optional reminders default off. Turning updates off suppresses matching emails, including reminders. These preferences do not control account security, direct consultation emails, or admin alerts.

Recipient identity, verified address, account status, source ownership, current request state, consent, and preferences are resolved from the database immediately before delivery. The payload cannot choose a recipient. The worker requires the service-role bearer token and accepts only an empty POST or `{}`.

Each invocation handles at most 10 messages, leases each row for five minutes, and uses a stable Resend idempotency key. Temporary failures retry with backoff up to five attempts. Automatic retries stop before Resend's 24-hour key retention window. Changed addresses, obsolete requests, expired invitations, completed follow-ups, deleted/inactive accounts, and opted-out recipients are suppressed. Delivery addresses are retained only while an attempt remains retryable and cleared on terminal completion. Email bodies and provider error bodies are not stored or logged.

Migration `20260911120000_marketplace_notification_delivery.sql` queues only subsequent events. Previously disabled rows remain disabled. Reminder source records must also be created after the migration's activation timestamp. There is no historical email backfill.

## Deployment

Target: the committed `Elevare-Prod` project (`cnfqpfynjpwlzdtblzps`). Vercel hosts the account preference UI; the worker, secrets, Vault credential, and scheduler belong in Supabase.

1. Verify the linked project and inspect the production schema and migration ledger. Do not bulk-push historical migrations that were applied manually. Save a schema backup and rehearse the new migration with `powershell -File supabase/scripts/apply-notification-migration.ps1` (it rolls back). This dedicated helper applies only the new forward delta; it never reconciles old versions.
2. Deploy `marketplace-notification-delivery` with JWT verification enabled. It stays disabled unless `MARKETPLACE_EMAIL_DELIVERY_ENABLED=true`.
3. Apply the reviewed migration with `powershell -File supabase/scripts/apply-notification-migration.ps1 -Apply`. The helper records only this exact new version after success.
4. Deploy the website preference UI through the normal GitHub/Vercel pipeline.
5. Reuse Supabase's existing `RESEND_API_KEY`. Optional `RESEND_TRANSACTIONAL_FROM` defaults to `Elevare Professionals <noreply@elevarefit.org>` and Reply-To defaults to `mlitfin@elevarefit.org`. That sender domain must be verified in Resend. `MARKETPLACE_ADMIN_ALERT_EMAIL` defaults to the requested inbox. `MARKETPLACE_ADMIN_URL` optionally adds an HTTPS admin link.
6. Run `powershell -File supabase/scripts/configure-notification-vault.ps1` to store the existing project service-role key under `marketplace_email_service_role_key` in Supabase Vault. The helper verifies the target, suppresses key output, and removes its temporary SQL file. Do not put the literal key in cron SQL, source control, logs, or browser variables. Update this Vault copy whenever the service-role key changes.
7. Set `MARKETPLACE_EMAIL_DELIVERY_ENABLED=true` in Supabase, then run `supabase/scripts/schedule-marketplace-notifications.sql`. It enables `pg_cron` and `pg_net` and creates/updates one named job every minute using the Vault credential.
8. Verify function authentication, cron execution, aggregate queue status, and Resend delivery to the authorized admin inbox. Do not manufacture customer requests or reactivate disabled historical rows for testing.

## Operations

Pause delivery by setting the Edge secret `MARKETPLACE_EMAIL_DELIVERY_ENABLED=false`; disable the named cron job as well to stop invocations. Queued records remain for review. Use the outbox's `status`, `attempt_count`, `next_attempt_at`, `last_error_code`, `provider_message_id`, and `sent_at` for diagnostics; access is service-only.

`sent` means accepted by Resend, not confirmed inbox delivery. Check Resend for bounce/delivery status. A terminal `failed` record needs operator review. Never blindly reset attempts or replace idempotency keys: an ambiguous timeout could already have delivered, and provider deduplication expires after 24 hours. Correct the underlying configuration and inspect the provider record before deciding whether another email is necessary.

The scheduler delivers emails and prepares eligible reminders; it does not select professionals, complete follow-ups, expire cases, or replace human Concierge operations.

## Verification

`npm test` covers rendering, fixed admin routing, locale links, service authentication, request payload rejection, recipient rechecks, bounded batches, retries, idempotency and ambiguous acknowledgements. `npm run test:notifications` uses the disposable Supabase contract fixture and mocked Resend only. `notification-preferences-browser.mjs` checks actual preference persistence in all three locales. See the matching reports under `website/reports/`.

References: [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions) and [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
