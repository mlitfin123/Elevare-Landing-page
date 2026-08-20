# Legal document versioning

The authoritative Terms and Privacy source files are `website/content/legal/terms-of-service.html` and `website/content/legal/privacy-policy.html`. Their public canonical URLs remain `/terms-of-service/` and `/privacy-policy/`. The archive command generates the clean-route `public/.../index.html` artifacts; those generated files must not be edited directly.

Version identifiers, effective dates, active paths, and archive paths are defined together in `website/lib/legal.ts`. When legal text intentionally changes:

1. Set a new ISO-date version in `website/lib/legal.ts` and update the displayed date in the corresponding source document.
2. Run `npm run legal:archive` from `website`.
3. Review the generated immutable archive, SHA-256 manifest, and forward-only seed migration.
4. Commit the source, archive, manifest, and migration together.

The generator computes hashes from the exact archived bytes. It refuses to overwrite an archive under an existing version or to generate a migration that silently changes metadata already stored for that version. Normal builds run `legal:verify` and fail if an active document changes without a version bump.

Archived documents are evidence records. They are not active navigation destinations and must not be deleted or rewritten.
