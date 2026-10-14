# Terrabar rebuild and recovery procedure

## Important: current state

The existing production project is `gznsxqeyhnuzglliijzz`. Its first application schema predates the five migrations currently recorded in `supabase/migrations/`. Therefore, the five incremental migrations alone are **not** a complete fresh-install history.

Do not run `supabase db reset --linked` against production. Supabase documents that a linked reset drops user-created entities in the remote database.

## Automated capture

After the repository owner adds the GitHub Actions secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`, the scheduled/manual workflow `Capture Supabase schema drift for review` will:

1. Dump the current `public` schema without table row data to `supabase/snapshots/production-public-schema.sql`.
2. Regenerate `supabase/database.types.ts`.
3. Open/update a pull request for review. It does not apply the snapshot to any database.

Review the first generated snapshot carefully before using it for recovery.

## Rebuild a separate test project

1. Create or select a **separate, empty Supabase test project**. Do not use the production project.
2. Install the Supabase CLI and download this repository.
3. Temporarily link the CLI to the test project only; verify its project reference before every command that can write.
4. Restore `supabase/snapshots/production-public-schema.sql` into that test project using a suitable PostgreSQL restore client and the test project's connection details.
5. Run smoke tests for tables, constraints, indexes, functions, RLS policies, and app authentication.
6. Configure Auth providers, redirect URLs, SMS provider credentials, Storage buckets/policies, Edge Functions, secrets, and any required extensions separately. These settings/secrets are not fully represented by a `public` schema dump.
7. Keep the snapshot as a recovery artifact; continue normal development with reviewed, timestamped incremental migrations.

## Data and user accounts

The schema snapshot contains no production table rows. It does not recreate users, orders, inventory, Storage objects, SMS credentials, or other private data. Those require a separately approved backup/restore plan and must not be copied into a test environment without considering privacy.

## What counts as complete

A rebuild is complete only after the snapshot has been generated, restored to a separate test project, and the smoke tests pass. Creating workflows or a snapshot file alone does not prove that a clean rebuild works.
