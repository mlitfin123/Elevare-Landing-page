# Professional approval email

The public website does not approve professionals or send this email. Approval remains in the separate Elevare admin application.

## Architecture

1. The admin server invokes the protected `professional-approval-email` Supabase Edge Function with a professional profile ID.
2. The function calls `marketplace_approve_professional_and_enqueue`, which locks the profile, preserves the existing `verified` plus `profile_live` approval model, and updates the profile.
3. A database trigger creates the unique `professional_approved:{profile_id}` outbox event only on a real transition into the approved/live state.
4. The function atomically claims that event with a five-minute lease, reads the recipient name, email, and explicit locale preference from `public.users`, then falls back to normalized professional/account signup locale metadata before sending the matching published English, LATAM Spanish, or Brazilian Portuguese Resend template.
5. A confirmed provider response stores the Resend message ID and sets `approval_email_sent_at`. Delivery failures leave the profile approved and the outbox event available for no more than three total attempts.

Existing approved profiles are not backfilled by the migration.

## Required manual deployment

Use the Elevare-Prod Supabase project (`cnfqpfynjpwlzdtblzps`). Do not add these objects to the Logbook or StageLab projects.

1. Apply `supabase/migrations/20260908120000_professional_approval_email.sql`, `supabase/migrations/20260908150000_users_preferred_locale.sql`, and `supabase/migrations/20260908170000_professional_email_locale_fallback.sql` in timestamp order through the established migration process.
2. Set these Supabase Edge Function secrets:
   - `RESEND_API_KEY`
   - `RESEND_TRANSACTIONAL_FROM` (the configured address is sent with the display name `Elevare Professionals`; defaults to `Elevare Professionals <noreply@elevarefit.org>`)
   - `RESEND_TRANSACTIONAL_REPLY_TO` (defaults to `mlitfin@elevarefit.org`)
3. Deploy `professional-approval-email` with JWT verification enabled.
4. Deploy the accompanying admin application change.

The published approval templates are selected by normalized locale. Their IDs are defined in `supabase/functions/professional-approval-email/email.ts`, and unsupported or missing locales use the English template. The templates contain no runtime variables; each template must retain the correct locale-aware professional profile link.

The endpoint accepts only a Supabase-verified `service_role` JWT. It does not accept a recipient email, recipient name, sent status, or approval timestamp from the browser.
