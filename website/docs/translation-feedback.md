# Translation feedback

Localized public marketing pages offer a small translation-feedback dialog in the shared footer. The browser sends an allowlisted locale, a canonical public route, a category, optional plain-text feedback, and an optional normalized contact email to the first-party `/api/translation-feedback/` route.

The server verifies same-origin requests, validates every field, rejects private or identifier-bearing paths, uses the existing HMAC-backed Supabase rate limiter, and writes with the server-only service role. A hidden honeypot provides low-cost bot filtering. The `translation_feedback` table has RLS enabled and forced, grants no client access, and is not included in any public query, sitemap, structured data, or analytics payload.

Descriptions and suggested corrections are untrusted plain text and must never be rendered as HTML. Analytics includes only locale, canonical public route, and category. It never includes free text or contact details.

Review feedback records for deletion after 180 days unless a record remains necessary for an active translation review or legal requirement. Infrastructure providers may retain request logs according to their own configured retention periods.
