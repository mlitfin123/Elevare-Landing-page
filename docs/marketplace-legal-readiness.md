# Marketplace Legal and Privacy Readiness

This document records implementation facts and review triggers. It is not legal advice and does not replace review by qualified counsel.

## Current Product Boundary

Elevare is currently a U.S.-based discovery marketplace. The website supports account creation, private client preferences, public approved Professional profiles, saved profiles, and consultation inquiries. A consultation request is not a booking, paid contract, or guaranteed appointment. International marketplace payments, payouts, and platform service contracts are outside the current website flow.

Professionals are independent providers. Marketplace profile review, identity review, and credential review remain separate. Approval or credential verification does not establish authorization to provide a service in every jurisdiction.

## Acceptance Architecture

The existing `public.user_legal_acceptances` table remains the current acceptance record used by the Elevare application. The marketplace migration extends it with source, method, and optional country fields. An append-only `public.user_legal_acceptance_history` table preserves each recorded Terms and Privacy version. Existing rows are copied into history without forcing users to re-accept.

Website signup records the current Terms and Privacy versions through Auth metadata. An Auth trigger writes that acceptance to the existing table, whose write-history trigger then creates the immutable audit record.

Professional profile submission uses `submit_current_trainer_profile_for_review_attested`. The RPC calls the existing review-submission function, then records the canonical attestation version, exact text, user, profile, review request, acceptance time, source, and user-supplied country when known. The separate admin project remains the only approval and verification interface.

## Data and Access Audit

### Client preferences

- Anonymous access is revoked by `20260818150000_private_client_preferences.sql`.
- Clients can read and edit their own preference record.
- Professionals cannot broadly query client preferences merely because an inquiry was sent.
- The existing matched-professional policy permits access only through an existing match relationship with an allowed relationship status.
- The preference model remains discovery-oriented and does not add medical or clinical fields.

### Professional and credential data

- Draft and administrative profile fields remain subject to existing owner/admin policies and protected-field triggers.
- Credential country and jurisdiction are supported without changing credential verification status.
- Supporting document and reference URLs are removed from the anonymous public-profile view.
- Raw credential rows are restricted to the owning Professional; other users receive only public-safe credential details through the approved-profile view.
- No dedicated credential-document Storage bucket or upload flow was found in this website. The current field accepts an external URL. The form now tells Professionals to use a private, access-controlled link for review.
- Profile photos intentionally use the public `profile-photos` bucket because approved marketplace profile photos are public content.

### Legal acceptance history

- History rows are readable only by the accepting authenticated user and service-role/admin workflows.
- Authenticated users receive no insert, update, or delete grant on acceptance history.
- Professional attestation history is created only by the security-definer submission RPC.

### Consultation requests

- Clients can insert and read their own requests.
- The selected Professional can read and manage requests directed to their profile.
- The request form sends only the fields entered for that inquiry and warns against submitting medical records or other highly sensitive information.

## Account Controls and Deletion Findings

Users can edit account-facing data, client preferences, and permitted Professional profile fields. They can submit an account deletion request from the dashboard. That request is stored in `reports` with an `account_deletion` type and remains pending for the separate operational/admin process.

The request does not immediately delete Auth or relational records. When an Auth user is deleted, the existing `archive_deleted_auth_user` trigger deactivates and anonymizes the retained marketplace user record, which removes an associated Professional from approved/public queries. Related marketplace history may remain according to existing foreign keys and operational retention decisions. The current repository does not contain an automated process that removes external credential URLs, profile-photo objects, all saved profiles, all inquiries, or every retained related record when a request is completed. Elevare should maintain an operational deletion runbook that identifies what is deleted, anonymized, or retained and the approved reason for each retained category.

## Processor and Transfer Audit

The repository confirms these services or integration categories:

- Supabase for marketplace authentication, database, and profile-photo storage.
- GitHub Actions and GitHub Pages for static website build and hosting.
- Google Analytics for website analytics.
- Resend through a Supabase Edge Function for waitlist email/contact handling.
- Stripe references and payment records exist elsewhere in Elevare Services, but the current website marketplace consultation flow does not perform checkout.

The repository does not establish every processor's physical data location. The Privacy Policy therefore states only that data may be processed in the United States and other jurisdictions where providers operate. Data residency, transfer mechanisms, and processor contract terms require a separate operational/legal review before intentional international targeting.

## Expansion Review Triggers

Run a new legal, privacy, tax, and product review before any of the following:

- Active foreign-country marketing, including paid UK advertising, a Canadian campaign, country-specific app listings, or a country-specific marketplace launch.
- Country-specific SEO expansion, including large location campaigns such as `Personal Trainers in London`.
- Charging international clients, processing international service payments, or paying Professionals internationally.
- Platform-facilitated booking, checkout, service contracts, credits, cancellations, or refunds.
- Expansion into additional licensed or regulated healthcare professions.
- Collection of diagnoses, medications, injury history, treatment records, pregnancy information, mental-health history, medical records, or other clinical data.
- A material Terms, Privacy, marketplace-role, data-processing, or verification-process change.

Do not add country-specific representatives, tax systems, credential-equivalency claims, licensing determinations, or a broad global cookie-consent system without that review.

## Legal Copy Review Needed

Counsel should review the existing provisions governing arbitration, governing law, liability limitations, waivers, indemnification, assumption of risk, retention, legal bases, privacy rights, cookie/analytics consent, and international transfer language. Counsel should also confirm whether current booking/payment language is appropriate across the combined Elevare mobile and website Services while marketplace website checkout remains unavailable.

Operational review is also needed for credential-link handling, deletion completion, retention decisions, processor agreements, and whether analytics consent behavior should change if Elevare intentionally targets additional jurisdictions.

## Audit Matrix

| Area | Status | Finding |
| --- | --- | --- |
| International account availability | Already implemented | Signup has no U.S.-residency restriction; service and profile availability may still vary. |
| Terms international wording | Implemented in this task | Added cautious jurisdiction-access language without claiming worldwide operation. |
| Privacy Policy accuracy | Implemented in this task / legal review | Marketplace data categories and processing purposes were aligned; substantive privacy provisions still need counsel. |
| Terms version tracking | Implemented in this task | Existing current-acceptance table now feeds immutable version history. |
| Privacy version tracking | Implemented in this task | Signup records the acknowledged Privacy version with the Terms version. |
| Professional attestation | Partially implemented, completed in this task | Existing checkbox was expanded and is now required by the attested submission RPC. |
| Attestation version tracking | Implemented in this task | Version, exact text, time, user, profile, request, source, and known country are stored. |
| Credential jurisdiction | Already implemented in pending marketplace migration | Country and jurisdiction are separate from verification status. |
| Profile approval wording | Already implemented | Profile review is separate from identity and credential review and is not an endorsement. |
| Credential verification wording | Already implemented / clarified | Explicit credential labels remain; Terms now state that review is not worldwide authorization. |
| Account deletion | Partially implemented | Dashboard request and Auth deactivation exist; completion and retention remain an operational process. |
| Data access and correction | Already implemented / partially implemented | Users can edit account-facing records; privacy requests also use the published contact email. |
| Client preference privacy | Already implemented | Anonymous and broad Professional access are blocked by existing RLS. |
| Credential document privacy | Implemented in this task | Raw rows are owner-only and document/reference URLs are excluded from the public view. |
| International processor and transfer disclosure | Implemented in this task / legal review | Policy describes possible U.S./other-jurisdiction processing without unsupported residency promises. |
| Consultation-request wording | Implemented in this task | The form now states that the request is not a booking, contract, or guaranteed appointment. |
| Independent-provider language | Already implemented | Terms already establish independent-business responsibility and no employment or agency. |
| Foreign-market expansion triggers | Implemented in this task | Marketing, SEO, payments, contracting, and regulated-provider triggers are documented above. |
| Country-specific privacy UI | Deferred until active international expansion | No GDPR representative or country-by-country interface was added. |
