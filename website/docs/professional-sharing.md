# Professional profile sharing

The account overview now has a **Share your profile** panel for publicly listed, live professionals with a public slug. It replaces the previous single share button and adds:

- **Share to Facebook:** opens Facebook's share composer with the canonical public profile URL. The professional chooses whether and where to post.
- **Copy profile link:** copies the same URL. If clipboard access fails, the visible, read-only link is focused and selected for manual copying.
- **More sharing options:** uses the device's native URL share menu, with a copy fallback. Cancelling the share menu does not display an error or copy anything.
- **Create Instagram card:** generates a 1080 × 1920 PNG and shows a preview, download link, and image-sharing button on devices that support file sharing. The professional uploads it to Instagram and adds a Link sticker with their profile URL. The image itself contains no clickable link.

The card includes the professional's public display name (or the existing name fallback), professional title, up to three specialties, profile photo, and Elevare branding. It does not claim verification, availability, or results. A missing, blocked, or unavailable photo uses initials; an unavailable canvas leaves link sharing usable. Long text is fitted within the card. Interface and branding copy support English, Latin American Spanish, and Brazilian Portuguese; user-written names/titles/specialties remain as provided.

## Behavior and scope

The PNG is created in the browser, and the card-rendering module is loaded only after the professional requests a card. Photo loads use anonymous CORS and no referrer; a failed or seven-second timed-out image load falls back instead of preventing the download. Temporary image URLs are released when replaced or unmounted.

Sharing always uses `https://www.elevarefit.com` and a validated localized public profile path, including when the dashboard is viewed on localhost or a deployment preview. Account URLs, query strings, identifiers, and authentication tokens are not shared. The Instagram card is not automatically posted or uploaded to a server. Facebook loads only when its link is selected; no Facebook SDK, pixel, or social login was added.

Existing profile metadata supplies Facebook link previews. Existing analytics receive only the sharing method through the existing event path; no professional name, photo URL, or profile URL is added to that event. Profile editing, consultation requests, publication, view counting, and admin functionality were not changed.

## Release and validation

This feature needs only the website deployment. It introduces no database migration, Edge Function, environment variable, dependency, or admin-repository change. The previously prepared aggregate-view/privacy migrations remain separate prerequisites for the earlier release.

- 357 website unit tests passed.
- TypeScript, changed-file ESLint, production build, localization postbuild, and production-artifact verification passed.
- Eight browser scenario groups passed against the local production dashboard: Facebook/canonical URLs, native sharing/cancellation/fallback, blocked clipboard, deferred PNG creation/download/file sharing, failed photos/long text, unavailable canvas/retry, three mobile locales/keyboard interaction, and unpublished-profile exclusion/no database mutations.
- Exported PNGs were checked at 1080 × 1920 and visually reviewed. Mobile layouts were checked at 320 px and 390 px. No real social post, inquiry, or email was sent.

Browser evidence: `website/reports/professional-sharing-browser.json`. Local example images use a fictional professional and synthetic avatar in `.tmp/professional-sharing/`. The browser tests simulate native sharing and clipboard outcomes in Chromium; available device share destinations are controlled by the browser/OS.
