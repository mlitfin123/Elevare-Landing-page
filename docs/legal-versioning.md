# Legal document versioning

The authoritative Terms and Privacy source files are `website/content/legal/terms-of-service.html` and `website/content/legal/privacy-policy.html`. Their public canonical URLs remain `/terms-of-service/` and `/privacy-policy/`. The archive command generates the clean-route `public/.../index.html` artifacts; those generated files must not be edited directly.

Version identifiers, effective dates, active paths, immutable archive files, and clean archive production routes are defined together in `website/lib/legal.ts`. When legal text intentionally changes:

1. Set a new ISO-date version in `website/lib/legal.ts` and update the displayed date in the corresponding source document.
2. Run `npm run legal:archive` from `website`.
3. Review the generated immutable archive and SHA-256 manifest.
4. Create a new forward-only Supabase migration for the new legal-version metadata. Never rewrite an already-recorded historical seed migration.
5. Commit the source, archive, manifest, and new migration together.

The generator normalizes line endings before hashing so Windows and Linux builds produce the same SHA-256 value. It refuses to overwrite an archive under an existing version. Normal builds run both `legal:verify` and `legal:routes`; they fail if an active document changes without a version bump, if a manifest hash differs, or if a source file and clean production route no longer align.

Archived documents are evidence records. They are not active navigation destinations and must not be deleted or rewritten.
