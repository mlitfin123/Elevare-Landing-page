# Marketplace migration ledger reconciliation

`MANUAL MIGRATION LEDGER RECONCILIATION REQUIRED`

This report compares a read-only production schema dump from the linked `Elevare-Prod` project with the current repository migrations. It does not inspect private production rows and no production migration was executed.

| Migration | Remote ledger | Production schema | Safe action |
| --- | --- | --- | --- |
| `20260820120000_legal_versions_and_professional_attestation.sql` | Absent | `ALREADY PRESENT BUT DIFFERENT`: the signup-acceptance and attested-submission functions exist as later hardened definitions. Historical data backfills cannot be proven from a schema-only dump. | Do not rerun or mark applied wholesale. Compare function bodies and backfill evidence with an authorized operator. |
| `20260820210000_legal_security_entity_separation.sql` | Absent | `ALREADY PRESENT AND MATCHING` for the legal-version tables/FKs, assertion history, regulated-title trigger, v2 public view, report RPC and restrictive report policies, private credential bucket/policies, and profile-photo ownership policy. Data-remediation statements remain `UNKNOWN`. | Do not rerun. Repair history only after an authorized data-state check proves the complete migration is represented. |
| `20260820211000_seed_legal_document_versions.sql` | Absent | Table and immutable relationships are present; the two seed rows are `UNKNOWN` because private production data was not dumped. | Verify only document key, version, effective date, hash, and archive path through an authorized metadata query. Do not expose acceptance rows. |
| `20260820212000_normalize_legal_document_hashes.sql` | Absent | Hash row values are `UNKNOWN` from the schema-only comparison. | Verify the two legal-version metadata rows before considering history repair. |
| `20260820213000_normalize_legal_archive_routes.sql` | Not applied | `MISSING` by design; this is the new forward-only route metadata delta. | Apply only after earlier ledger reconciliation. Its preconditions accept only the known pre-normalization or normalized immutable hashes and fail closed for any unknown state. |

## Material production-schema checks

- Legal-version tables, acceptance relationships, and append-only assertion evidence: present.
- Professional attestation and age-attestation evidence structures: present.
- Regulated-title enforcement and verified-credential dependency: present.
- `marketplace_public_trainer_profiles_v2`: present; unsafe credential document fields remain excluded by repository tests.
- Profile report RPC plus restrictive read/update policies: present.
- Private `credential-documents` bucket and owner-folder select/insert/update/delete policies: present.
- Legal archive/version seed row values: unknown until an authorized metadata-only production query is performed.

## Required operator verification

1. Run the guarded helper with `-VerifyOnly` and capture the current ledger.
2. Query only the two `legal_document_versions` metadata rows; verify the repository key, version, effective date, SHA-256, and archive route.
3. Compare final production function, trigger, grant, view, and policy definitions with each absent migration.
4. Use `npx supabase migration repair --status applied <version>` only for a migration proven fully represented.
5. Use a forward-only migration for any partial or different state.
6. Re-run `-VerifyOnly` and the website legal/build regression suite.
