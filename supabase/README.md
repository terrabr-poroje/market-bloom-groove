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
