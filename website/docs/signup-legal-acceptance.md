# Website signup acceptance records

Website signup already requires the Terms/Privacy checkbox and the age checkbox. It sends the exact displayed document versions through Supabase signup metadata. The backend had continued recognizing only `2026-08-20`, while the website progressed to `2026-08-21` and `2026-09-07`; newer confirmations were silently skipped.

Migration `20260911190000_website_signup_legal_acceptance.sql` registers the missing immutable archive versions and replaces the recorder's fixed date comparison with a lookup of the supplied versions. The existing Auth-user creation trigger creates the application user and records both documents in the same transaction. A website signup with missing/unchecked consent, unknown versions, missing age confirmation, or a document dated after signup fails instead of succeeding without its records. Unrelated signup flows keep their existing behavior.

## Backend records

`public.user_legal_acceptances` contains one record per confirmed document/version for that user, including `accepted_at`, `document_version`, `acceptance_source`, `acceptance_method`, and the matching `legal_document_version_id`. These records appear through the existing `public.user_legal_acceptance_admin_records` view. `public.user_legal_acceptance_history` preserves the version pair and archive references; `public.user_assertion_history` records the separate 18+ assertion.

These are account-level Terms and Privacy confirmations. A coach's later profile approval does not change them or imply acceptance of a Coach Agreement or any other unchecked document. `accepted_role` preserves the signup role assertion, which can be `client` for someone who subsequently becomes a coach.

## Existing signups

The migration recovers missing rows only from active accounts with explicit, versioned website signup metadata, age confirmation, known archive versions, and a signup date on or after those versions' effective dates. It preserves the exact versions and original Auth signup timestamp. Recovery uses `acceptance_method = 'signup_metadata_recovery'`; `created_at` records when the evidence was recovered. This distinguishes reconstruction from a newly observed checkbox event. Existing rows and earlier acceptance history are not rewritten. Accounts without this evidence remain unconfirmed.

Later edits to user-controlled Auth metadata do not automatically create or alter acceptance records. The recovery helper is executable only by the service role; browser users cannot invoke it for themselves or another account.

## Release and validation

Verify the committed Elevare-Prod target and save a schema backup. Run `powershell -File supabase/scripts/apply-signup-legal-migration.ps1` to rehearse the exact new migration and the real Auth-to-acceptance trigger chain in a rolled-back transaction. Add `-Apply` to apply only this forward delta and record only its migration version. Never bulk-replay historical manually applied migrations.

The local database test is `node website/tests/integration/signup-legal-acceptance.mjs`, using the named disposable Docker database container. It covers both document records, history links, recovery, invalid or unchecked signup data, timestamps, retries, later metadata edits, and helper permissions. The unit suite also verifies that the versions sent by signup are registered with the actual immutable archive hashes. See `website/reports/signup-legal-acceptance.json`.

When publishing a new Terms or Privacy version, register that exact immutable version through a new forward migration before the frontend sends it. Do not edit old archive bytes, overwrite old version rows, or mark existing users as having accepted the new text automatically.

Production verification on September 11: migration `20260911190000` is applied and recorded. Two existing accounts recovered four document rows for their original `2026-08-21` versions, all visible through the admin records view. No checked website signups remained without both matching records. The real signup trigger rehearsal passed and left no synthetic account behind. All 343 unit tests, type checking, and the five PostgreSQL integration scenarios passed; lint had only the four existing image warnings.
