# Terrabar Cloudflare D1 migration status

Last checked: 2026-11-07

## Scope approved by the project owner
- Cloudflare Workers + D1 own all application runtime logic and application data.
- ParsPack remains the file/image storage provider.
- SMS.ir remains the OTP/SMS provider.
- Supabase is retained as a read-only rollback/source reference until the full app cutover is verified.
- GitHub remains the source-control and backup repository. No production DNS or Worker deployment is performed by this branch.

## Current Cloudflare production mapping
- Production hostname: `terrabar.ir`
- Worker custom domain: `terraba-arash`
- D1 binding: `DB`
- D1 database: `traabar-db`
- Database ID: `9da7735b-e4c9-4f7f-9abe-53ba1545c60e`
- The production Worker already has the D1 binding. The production Worker bundle still contains Supabase client/data access code; this is not a completed Cloudflare-only cutover.

## Schema migration
- Live Supabase public schema inventory: 28 tables.
- Authoritative D1 schema migration: `cloudflare/migrations/0001_authoritative_schema.sql`.
- Additive auth support migration: `cloudflare/migrations/0002_cloudflare_auth_support.sql` (adds the fields used by OTP, sessions, admin login throttling and the visit summary view).
- Migration was tested against a clean temporary D1 after cloning the 13 pre-existing inferred tables. All 117 SQL statements succeeded; `PRAGMA foreign_key_check` returned no violations.
- On production D1, the 13 prior inferred tables were retained with `_legacy_inferred_` prefixes. No old table was dropped.
- Production D1 currently has 28 authoritative public application tables, Cloudflare auth/session/OTP tables, sequence/migration tables, plus retained legacy tables.

## Initial data transfer verification
Counts below were independently read from live Supabase and Cloudflare D1 after transfer. Counts match:

| Table | Supabase | D1 |
|---|---:|---:|
| auth.users -> auth_users | 2 | 2 |
| members | 1 | 1 |
| member_roles | 2 | 2 |
| admin_users | 1 | 1 |
| admin_user_cities | 0 | 0 |
| cities | 155 | 155 |
| city_neighbors | 258 | 258 |
| loads | 3 | 3 |
| load_images | 1 | 1 |
| load_price_tiers | 9 | 9 |
| orders | 7 | 7 |
| purchase_requests | 0 | 0 |
| ratings | 0 | 0 |
| rating_messages | 0 | 0 |
| seller_bank_accounts | 0 | 0 |
| seller_financial_transactions | 0 | 0 |
| seller_payout_requests | 0 | 0 |
| platform_financial_ledger | 0 | 0 |
| audit_logs | 1 | 1 |
| site_visits | 87 | 87 |
| social_connections | 0 | 0 |
| social_contacts | 0 | 0 |
| social_messages | 0 | 0 |
| social_posts | 0 | 0 |
| webhook_events | 0 | 0 |
| message_templates | 0 | 0 |
| outgoing_messages | 0 | 0 |
| sms_hook_events | 9 | 9 |

The three existing admin recovery-code rows were already present in D1 and their count matches Supabase; their secret hashes were not re-exported. The two Supabase Auth user IDs were compared with D1 and match exactly. The source Supabase tables were not changed or deleted. Auth user IDs were compared and match exactly. Counts and foreign-key checks are verification checkpoints, not a substitute for application-level testing.

## Current code/runtime gap
The production custom domain is attached to Worker `terraba-arash`, which has D1 binding `DB` pointing to `traabar-db`. However, the deployed Worker bundle and the GitHub source still contain Supabase client/auth/data calls. The D1 schema and initial data transfer do not by themselves switch the running application to D1. No Cloudflare production Worker deployment or DNS change has been made.

## Not complete — blocking items before cutover
1. Migrate all remaining browser and server Supabase data calls to Cloudflare server functions/D1. The source still imports `@supabase/supabase-js`; routes/components use `supabase.from(...)` and `supabase.auth.*`.
2. Complete and verify authorization rules server-side: buyer/seller/supplier roles, pending approvals, city visibility, special/professional purchase visibility, seller announcement permissions, admin/city-manager scopes, and financial permissions.
3. Finish OTP/session flows against SMS.ir, including sign-up profile creation, login/logout, refresh, rate limits, expiry, one-time consumption, and admin recovery. Email login/recovery remains unavailable unless a separate email provider is approved.
4. Keep ParsPack upload/read/delete integration intact and move any remaining Supabase Storage calls to the existing ParsPack contract.
5. Implement and verify all CRUD/workflows for loads, price tiers, images, purchase requests, orders, invoices, payments, seller finance, payouts, ratings, audit logs, and webhooks.
6. Add D1 binding/configuration and secrets to the actual build/deploy config; make preview build and test run successfully.
7. Run complete route, permission, data-integrity, mobile/RTL, and production smoke tests on an isolated preview Worker.
8. Only after approval and successful comparison, switch the production Worker. Do not disable or delete Supabase before this cutover is proven.


## Independent live audit — 2026-11-07 (after owner authorized completion)

- The completion branch is `migration/cloudflare-d1-completion`; it was advanced to the current reviewed source snapshot and the verified D1 migration/auth-support files were restored on this branch. The project agent is still connected to `main`, so no Lovable edits were attempted there.
- Live Cloudflare Worker settings were read: Worker `terraba-arash` has the production custom domain `terrabar.ir` and D1 binding `DB` to the production database ID above. The Worker also has an `ASSETS` binding. This verifies the binding, not that application routes use D1.
- The currently deployed Worker bundle was inspected and contains imports of the Supabase client and runtime calls such as `supabase.from("members")`. Therefore the live app remains Supabase-dependent.
- Live production D1 currently reports 48 tables. Read-only spot checks returned: auth_users=2, auth_sessions=0, otp_challenges=0, members=1, member_roles=2, cities=155, loads=3, orders=7, audit_logs=1, sms_hook_events=9. These match the previously transferred source counts for the corresponding business tables. `PRAGMA foreign_key_check` returned no violations.
- Current GitHub Cloudflare deployment workflow is still configured to trigger on `main`, requires the Supabase URL and publishable key, and rewrites the generated Worker name/routes to `terrabar-market`. This is not yet a safe Cloudflare-only deployment workflow for the live custom-domain Worker `terraba-arash`; do not trigger it.
- Existing SMS.ir, ParsPack and content-provider settings were not read out, changed, reset, or replaced. Their values must be preserved through the eventual app migration.

## Remaining cutover blockers confirmed by the live audit

1. The production Worker is still executing a Supabase-dependent bundle.
2. The app source must be migrated route-by-route to authenticated server-side D1 operations. A generic unrestricted Supabase/PostgREST compatibility proxy is not an acceptable substitute.
3. Existing OTP/session support tables are empty in production D1; the login/session lifecycle must be implemented and tested before routing real users to it. Existing SMS.ir settings must be reused, not recreated.
4. The deployment workflow must target the actual approved Worker and preserve its existing D1 binding and integration secrets; its current Supabase validation and alternate Worker name make it unsuitable for cutover.
5. No isolated migrated preview Worker has yet passed the full auth, role, city-scope, order, finance, media, and admin smoke-test suite.

**No production deployment, DNS change, secret change, Supabase shutdown, or production data mutation was performed during this audit.** The migration remains incomplete until the blockers above are resolved and verified.

## Change control
- Work is isolated to `migration/cloudflare-d1-completion` for the completion effort. Do not commit further changes to `main` during migration.
- No production Worker script, DNS, ParsPack settings, SMS.ir settings, or Supabase tables were changed by this audit.
- Do not deploy the branch to the production domain or disable Supabase before the blockers above are resolved and the isolated preview passes.
