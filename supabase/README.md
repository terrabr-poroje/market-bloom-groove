# Terrabar database workflow (Supabase + GitHub)

Production Supabase project: `gznsxqeyhnuzglliijzz`

## Source-of-truth rules

- The live Supabase project is the current state of production.
- Every schema/security change must be represented by a versioned SQL migration committed in `supabase/migrations/`.
- Never rerun an already-applied production migration to "sync" it. Supabase records migration versions separately from the SQL files.
- Keep `supabase/config.toml` pointing at the production project ID above.
- Regenerate `supabase/database.types.ts` from the live project after schema/function signature changes and commit it.
- `supabase/SCHEMA_BASELINE.md` is an inventory for review, not an executable dump or a substitute for migrations.
- No destructive schema changes, production resets, or broad grants without explicit review.

## Current verified state (2026-10-15)

- Four migration versions are recorded in the live Supabase project and corresponding SQL files exist in GitHub.
- The generated TypeScript database types were regenerated from the live project and byte-for-byte compared with `supabase/database.types.ts`.
- The two Terrabar admin helper functions now use `SECURITY INVOKER`; the `admin_users` RLS policy only exposes the signed-in user's own active admin row.
- The security advisor still reports 12 tables with RLS enabled but no policies. These must be handled one group at a time according to the Terrabar access rules, not by applying a blanket policy.
- Storage currently has no policies; image upload/read rules still need an explicit design.
- Leaked-password protection remains disabled in Supabase Auth and should be enabled in Auth settings if password login is used.

## Safe sync checklist

1. Inspect current migration history in Supabase.
2. Inspect the current schema/policies/functions and compare with GitHub files.
3. Apply a change only after its migration SQL has been reviewed.
4. Record the exact migration version/name that Supabase reports.
5. Keep the corresponding SQL file in GitHub under that exact version.
6. Regenerate and compare `database.types.ts` if schema signatures changed.
7. Run security advisors and test the affected access paths with appropriate test accounts.
8. Refresh `SCHEMA_BASELINE.md` after schema changes.

This is a manual, reviewed workflow. GitHub and Supabase do not automatically synchronize both ways simply because they are connected to ChatGPT.


## Automated GitHub Actions sync

Three workflows have been added:

- `.github/workflows/verify-supabase.yml`: validates the project reference and migration filenames on pushes and pull requests.
- `.github/workflows/deploy-supabase-migrations.yml`: on changes to migrations on `main`, previews pending migrations and then applies them to the linked production project. This changes the production database only through new, versioned migrations; never use it for destructive resets.
- `.github/workflows/capture-supabase-schema.yml`: nightly (and manually) exports the current `public` schema without row data, regenerates TypeScript types, and opens/updates a review PR. Dashboard-made schema changes are therefore captured for review rather than silently merged into production history.

### One-time GitHub setup required

In the private repository's **Settings → Secrets and variables → Actions → New repository secret**, add:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token.
- `SUPABASE_DB_PASSWORD`: the database password for the existing project `gznsxqeyhnuzglliijzz`.

Never put either value in source files, commit messages, chat messages, or client-side app variables. Once these secrets are configured, the workflows can authenticate. The GitHub connector cannot read or create repository secrets, so this setup must be completed by the repository owner.

### Rebuild and restore limits

- `supabase/snapshots/production-public-schema.sql` is a schema-only snapshot; it contains no table rows and is not a replacement for versioned migrations.
- The original Terrabar schema predates the current set of five migrations. A safe fresh-environment rebuild still needs a reviewed baseline migration/restore procedure and a clean, separate test project. Do **not** run `supabase db reset --linked` against production.
- Auth provider settings, secrets, SMS credentials, and Storage objects are not included in the public-schema snapshot. They must be configured or restored separately.
