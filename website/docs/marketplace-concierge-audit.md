# Elevare marketplace concierge audit

Date: 2026-09-10

## Authoritative systems

- Public website, client account, professional account, marketplace UI, analytics, localization, and website-owned Supabase migrations: `C:\Users\markl\Desktop\Elevare_Landing_Page`.
- Administrative review and moderation interface: `C:\Users\markl\Desktop\Admin_Elevare`.
- Marketplace data and authentication: the second Elevare Supabase project configured by the website's `NEXT_PUBLIC_SECOND_SUPABASE_*` variables and by the admin server's private Elevare Supabase configuration.
- The planned mobile application is a compatibility consumer, not an authority for the concierge workflow.

## Capability audit

| Capability | Classification | Evidence and decision |
| --- | --- | --- |
| Public browsing and search | Complete and connected | `MarketplaceDirectory.tsx` reads the generated public marketplace catalog. Browsing remains anonymous. |
| Direct consultation request to a chosen professional | Complete and connected | `InquiryForm.tsx`, `trainer_profile_inquiries`, client and professional request panels, guarded professional transition RPC, and inquiry outbox. Preserve unchanged. |
| Broad “Tell Us What You Need” request | Partially implemented | `MarketplaceDemandForm.tsx` inserts `marketplace_search_demand`, including current filters and optional contact context. It permits anonymous submission and has no concierge case. |
| Private client preferences | Complete and connected | `ClientProfileEditor.tsx` and `client_profiles` store private goals, budget, timing, service, radius, experience, and language preferences. Professionals do not receive table access. |
| Professional response workflow | Partially implemented | Direct inquiries support guarded accept/decline/contact/close actions. No response model exists for a human-selected concierge invitation. |
| Internal search-request review | Partially implemented | `Admin_Elevare/marketplace-review-admin.js` displays search-demand records and supports a four-state review field plus private notes. It cannot create a shortlist, invite professionals, introduce parties, rematch, or record outcomes. |
| Professional review and moderation | Complete and connected | The separate admin project and trust/review migrations remain the sole authority. Concierge work must not duplicate them. |
| Notifications | Partially implemented | Direct professional inquiries use an idempotent outbox and Resend edge function. No concierge templates or sender exist. Concierge notification records should be queued with delivery disabled. |
| Follow-ups | Missing | No due-work model exists for invitations, shortlists, introductions, or outcomes. |
| Outcome tracking | Missing | Existing request statuses do not distinguish introduction, consultation, self-reported hire, no inventory, or unknown outcome. |
| Rematching | Present but disconnected | Legacy app `matches` concepts exist but belong to a different booking/package flow and must not be reused. Concierge needs its own history-preserving cycle. |
| Analytics | Partially implemented | Search-demand and direct-inquiry events exist. No privacy-safe concierge funnel events exist. |
| Localization | Complete foundation, missing concierge copy | Account and marketplace routes support `en`, `es-419`, and `pt-BR` through the existing catch-all route and `marketplaceText`. New surfaces must extend that architecture. |
| Authorization | Unsafe for concierge use as-is | The current broad-demand table accepts anonymous inserts and direct table writes. A concierge request needs authenticated, validated, idempotent server-side submission and private per-role projections. |

## Minimal implementation

1. Keep `marketplace_search_demand` as the original request record and extend it only with concise structured matching fields, consent, locale, and an idempotency key.
2. Add a private `marketplace_concierge_cases` record with a non-enumerable case code and a constrained lifecycle separate from request, recommendation, response, and outcome status.
3. Add separate recommendations, introductions, follow-up due work, internal notes, audit history, and disabled notification-outbox tables.
4. Expose narrowly scoped RPCs for authenticated client submission/actions, professional invitation response, and authorized operator actions. Revoke direct client mutations and enforce RLS.
5. Add a private client concierge page and a private professional opportunities page. Both remain `noindex`; direct consultation pages remain unchanged.
6. Upgrade the existing marketplace request form rather than adding a duplicate public form. Preserve a short flow and safe local draft storage.
7. Add a focused concierge queue to the existing separate admin review interface. Do not alter profile review or moderation authority.
8. Add deterministic candidate filtering only as operator assistance. It uses approved/live/accepting public professional records and never presents an automated choice as personalized or “best.”
9. Represent reminders as idempotent due work. No scheduler or sender is enabled by this implementation.

## Expected changes

Website repository:

- `supabase/migrations/20260909500000_marketplace_concierge.sql`
- `website/components/marketplace/MarketplaceDemandForm.tsx`
- `website/components/marketplace/ConciergeCasesPanel.tsx`
- `website/components/marketplace/ProfessionalOpportunitiesPanel.tsx`
- `website/components/marketplace/MarketplaceAccountShell.tsx`
- `website/app/account/matches/page.tsx`
- `website/app/account/opportunities/page.tsx`
- `website/app/[locale]/[[...slug]]/page.tsx`
- `website/lib/i18n/config.ts`
- `website/lib/i18n/marketplace-content.ts`
- `website/app/globals.css`
- concierge tests and operating documentation

Admin repository:

- `marketplace-review-admin.js`
- focused admin regression tests if the existing test harness can cover the added queue

No production migration, deployment, push, notification delivery, or user contact is part of this work.
