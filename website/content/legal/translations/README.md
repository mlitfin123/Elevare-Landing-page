# Legal page translations

The four requested pages are translated in full into Latin American Spanish (`es-419`, `/es/`) and Brazilian Portuguese (`pt-BR`, `/pt-br/`): StageLab support/legal index, StageLab privacy policy, Elevare Terms of Service and Elevare Privacy Policy.

English legal source files and immutable consent archives remain unchanged. Translations preserve their displayed dates, prices, retention periods and terms. This change does not introduce a new policy version or require users to accept the same policies again.

Each locale/document JSON file contains the translated text segments in source order, including titles, metadata and accessible labels. The manifest binds those arrays to the normalized English source SHA-256 and segment count. Missing text or changed source fails verification; English text is never silently substituted into a translated policy.

To update a translation:

1. Follow the existing legal-version/archive process if changing the underlying policy.
2. From `website`, run `npm run legal:translations -- --source terms` (or `privacy`, `support`, `stagePrivacy`) to inspect the ordered source segments.
3. Update both locale arrays. Keep markup out of translations; links and HTML are retained from the source.
4. Review the complete text, then update that document's source hash and segment count in `manifest.json` when the English source changed. Use `legalSourceHash` from the renderer for CRLF-independent hashing.
5. Run `npm run legal:translations`, `npm test`, and the production build. The postbuild check compares all 12 served HTML documents with the verified translations.

Clean URLs use the same language prefixes as the rest of the site. Legacy `.html` links permanently redirect to equivalent clean routes. The existing `.org` domain redirect still preserves paths. Each document includes canonical/hreflang metadata and language links that work without JavaScript. Preference storage is optional. Site footer, privacy consent and purchase/profile legal links use the active locale.

The other StageLab policies linked from the support index remain English and are labeled accordingly on translated pages. They were not among the four requested documents.

Legal translations are available without a generation flag. Existing `ENABLE_LOCALIZED_INDEXING` and `NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES` settings continue controlling localized indexing. No database migration or new secret is required.

Browser checks: start the production test server using `node tests/integration/run-next.mjs start`, then run `node --experimental-strip-types tests/integration/legal-localization.mjs`. These use local pages and cover mobile/desktop layout, original aliases, language switching, denied storage and footer navigation.
