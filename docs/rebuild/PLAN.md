# Terrabar clean rebuild plan

Status: planning only. This branch must not be merged into `main` or deployed to production without Amir's explicit approval.

## Non-negotiable safeguards
- Keep the existing repository, Supabase project `gznsxqeyhnuzglliijzz`, domain `terrabar.ir`, Cloudflare Worker `terrabar-market`, current data, and admin accounts intact.
- Do not create a Supabase project/database, change Supabase schema/RLS/auth settings, create paid resources, modify DNS/Worker routes, or deploy production without explicit approval.
- No secrets, tokens, service-role keys, passwords, or personal data belong in this repository.
- Keep rebuild work on `rebuild/terrabar-clean-rebuild`. Production deployment workflow is restricted to pushes to `main`; never merge this branch without approval.

## Current known inventory (read-only inspection)
- Existing GitHub repository: `terrabr-poroje/market-bloom-groove`, default branch `main`.
- Existing public Supabase tables observed: 24.
- Observed rows include 155 cities, 258 city-neighbor relations, 2 member records, 2 admin-user records, 3 member-role records, and 1 admin-user-city assignment. These counts are a point-in-time snapshot, not a backup.
- 40 database migrations are registered. They cover city access, membership and roles, load submission, orders/payment/delivery lifecycle, storage policies, pricing tiers, admin access, ratings, and seller finance.
- Current production worker and domain routing must remain unchanged during rebuild.
- Existing production HTTP smoke checks verify only HTTP 200 and the presence of Terrabar text; they do not prove browser hydration or interactive functionality.

## Rebuild approach
1. Audit and document current route map, auth flow, role rules, database relationships, RLS policies, storage policies, environment variable names, and production build/deploy triggers. Use read-only operations.
2. Define a minimal, testable front-end architecture and UI contract based on the approved Terrabar design: RTL, green/white styling, home, auth, announce load, requests, member storefront, account, and admin views.
3. Implement the clean application only on this branch. Do not point it at production data during local/CI tests. Use mocks or isolated test fixtures until a separately approved sandbox exists.
4. Add automated checks for build/type/lint/unit tests and real-browser tests for hydration, console/page errors, navigation, forms, province/city search, button actions, loading states, and access control.
5. Compare the new app's data contract with the current schema. Produce a migration mapping and rollback plan before proposing any schema change.
6. Request approval before creating a separate database/project, copying any data, changing auth providers, changing production secrets, deploying to production, or merging to `main`.

## Acceptance tests
- All key routes load without uncaught JavaScript exceptions.
- Buttons, menus, links, and forms respond in a real browser; no infinite loading.
- Province and city search/selection work and selected values persist correctly.
- Authentication success, failure, expired/invalid code, and sign-out states are tested without using real user credentials in automated tests.
- Role tests cover regular buyer, special buyer, professional buyer/supplier, approved/unapproved seller, city manager, and global admin.
- Data-access tests verify city boundaries, owner-only operations, admin scope, and RLS; never rely on hidden UI controls as security.
- Marketplace tests cover create/edit/publish load, list/filter loads, request/order lifecycle, price validation, and empty/error states.
- Production smoke tests remain separate from browser E2E tests.
- Deployment rollback steps and evidence are documented before release.

## Cost and risk controls
- No new paid service or resource is approved by this plan.
- Estimate exact sandbox costs and project limits from the connected provider before requesting approval.
- Primary risks: losing admin access, auth behavior mismatch, incorrect RLS, city-boundary leaks, unintended production deployment, and irreversible data/schema changes.
- Mitigations: isolated branch, read-only inventory, backup/restore validation, mock fixtures first, browser E2E, explicit approvals, and release/rollback checklist.

## Current status
- Branch created from `main`.
- This planning document is the first commit on the rebuild branch.
- No new database/project created.
- No production domain, Worker, production database, auth configuration, or existing data changed.
- Implementation and browser verification have not yet been completed.
