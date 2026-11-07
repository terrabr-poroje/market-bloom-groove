# Terrabar: move all app behavior to Cloudflare Workers + D1 (planning only)

Supabase stays fully intact as the rollback until a separate production cutover is approved. In this step nothing was edited, deployed or changed. The only exception is this plan file.

## 1. What the project does today (checked)
- **No server functions exist.** Every page talks to Supabase straight from the browser. The rules are enforced only by Supabase row security, triggers and functions. Moving to D1 means rebuilding each of those rules as server code. This is the main risk.
- Browser access from 17 files: `lib/auth.ts`, `components/{marketplace-shell,load-card,rating-form,rating-summary}.tsx`, `routes/{auth,admin-login,admin-reset-password,reset-password,admin,announce,manage-loads,requests,cart,account,member-home,membership,store.$memberId,seller-accounting-preview}.tsx`, `start.ts`.
- Tables the app uses: members, member_roles, admin_users, admin_user_cities, cities, city_neighbors, loads, load_images, load_price_tiers, orders, purchase_requests, ratings, rating_messages, site_visits, seller_bank_accounts, seller_financial_transactions, seller_payout_requests.
- Database logic to port (from 52 migrations): get_storefront_member, terrabar_is_main_admin, terrabar_is_city_manager, terrabar_order_pricing_valid, terrabar_enforce_professional_{market,load,order,price_tier}_access, terrabar_credit_completed_seller_sale (trigger), terrabar_prevent_financial_ledger_core_edits (immutable ledger), terrabar_request_seller_payout, terrabar_admin_{archive,restore}_{member,load}, terrabar_admin_create_payout, terrabar_admin_update_payout_status, plus invoice and purchase-request number sequences.
- Supabase edge functions in use: `admin-login` (called by admin-login and reset-password) and `admin-manage-city-manager`.
- Auth today is Supabase phone OTP (`signInWithOtp`/`verifyOtp`), email OTP, admin password login with `setSession`, and password reset through `updateUser`.
- Hosting: `.github/workflows/deploy-terrabar-cloudflare.yml` already builds and deploys the Worker with the generated `.output/server/wrangler.json`. It fails unless the Supabase URL is the approved one. The repo has no wrangler config of its own and no D1 binding.
- No SMS.ir or ParsPack code exists yet. Images are referenced in `load_images`. Where they are stored now has to be confirmed.
- Tests: `src/test/app-routing.test.tsx` and `marketplace.test.ts`. Other workflows: verify-app, verify-supabase, capture-supabase-schema, deploy-supabase-migrations, deploy-production, seed-city-directory, configure-email-otp, validate-auth-fix-preview, deploy-oct18-preview.
- `liara.json` (Iran build location) exists. Whether it is still used needs your answer.

## 2. Target architecture
```text
Browser -> TanStack server functions (Worker) -> D1 (env.DB)
                                   |-> SMS.ir (OTP and notices)
                                   |-> ParsPack (S3-compatible files/images)
```
- All reads and writes go through `createServerFn` handlers that check the session first. The browser never reaches the database directly.
- Sessions use an HttpOnly, Secure, SameSite=Lax cookie. It holds a random token whose SHA-256 hash is stored in D1 `sessions`, with expiry, rotation and logout-everywhere.
- OTP: the server makes a 6-digit code and stores only its hash in D1 `otp_codes`, with a 2-minute expiry, a limit of 5 tries, and send limits per phone and per IP. The code is sent through the SMS.ir template (verify) API. Codes are never logged.
- Authorization lives in one module, `src/server/authz.ts`. It covers main admin, city manager (own cities only), approved supplier, bar seller, buyer, the four buyer groups and city-neighbor rules. It replaces the row security checks one by one.
- Money and orders: D1 `batch()` transactions, an append-only ledger (the server never updates or deletes a ledger row), and an `order_events`/`audit_log` row for every change. Payment status, shipped/received status, delivery-code confirmation and settlement stay as separate fields. The rule against paying at in-person delivery is enforced on the server.

## 3. File-by-file work (on a separate branch `migration/cloudflare-d1`)
**Config and bindings**
- `wrangler.jsonc` (new): binds the existing production D1 by its id, adds non-secret vars and a separate preview/staging D1. Also check how `@lovable.dev/vite-tanstack-config`/nitro merges bindings into `.output/server/wrangler.json`.
- `src/server/env.ts`: typed access to `DB`, `SMSIR_API_KEY`, `SMSIR_TEMPLATE_ID`, `SMSIR_LINE`, `PARSPACK_*`, `SESSION_PEPPER`.
- `src/server/db.ts`: a thin, typed D1 query helper (prepared statements only).

**Server modules (new, `src/server/*`)**
- `session.ts` (cookie, create/rotate/revoke) and `otp.ts` (generate, hash, verify, rate limits)
- `sms/smsir.ts` behind a `SmsProvider` interface so providers can be swapped
- `storage/parspack.ts`: signed upload/download URLs, type and size checks
- `authz.ts` and `audit.ts`
- Domain modules: `members.ts`, `loads.ts`, `pricing.ts` (ports terrabar_order_pricing_valid), `orders.ts`, `purchase-requests.ts`, `ratings.ts`, `finance.ts` (ledger, payout, bank accounts), `admin.ts` (archive/restore, city managers, approvals), `storefront.ts`, `visits.ts`
- `*.functions.ts` for each domain, exposing `createServerFn` endpoints with zod input checks

**Client files**
- `src/lib/auth.ts`: same hook interface, now backed by `getSession`/`signOut` server functions
- `routes/auth.tsx`: same UI, now calls `requestOtp`/`verifyOtp`. Login, signup and role selection keep working the same way.
- `admin-login.tsx`, `admin-reset-password.tsx`, `reset-password.tsx`: admin password login with a server-side password hash (needs a decision, see §5)
- Each of `admin, announce, manage-loads, requests, cart, account, member-home, membership, store.$memberId, seller-accounting-preview` and the 4 components: swap `supabase.from/rpc` calls for the matching server function. No UI changes.
- `src/start.ts`: remove the Supabase bearer middleware only at cutover.
- Keep `src/integrations/supabase/*` in place, unused, until cutover is approved.

**Feature switch for rollback**
- `BACKEND_MODE=supabase|d1` env var read on the server. The rollback is flipping it back.

**CI**
- New `verify-d1-branch.yml`: lint, typecheck, vitest, build, `wrangler deploy --dry-run`, and smoke tests against the staging Worker and staging D1.
- `deploy-terrabar-cloudflare.yml`: replace the Supabase URL guard with a D1 binding guard only at cutover. Until then it stays unchanged.
- Supabase workflows stay, with a note that they are retired once cutover is approved.

**Tests (vitest, new files next to the existing ones)**
- OTP: expiry, max tries, rate limit, hash-only storage
- Sessions: rotation, revoke
- Authorization: city manager limited to own city; supplier blocked from retail/wholesale; buyer blocked from professional loads; neighbor-city rule
- Pricing tiers and minimum order quantity
- Shared stock pool decreases correctly
- Ledger cannot be changed; payout only after confirmed delivery
- Pay-at-delivery is rejected
- Smoke script: each public route returns 200 and protected routes reject anonymous visitors.

## 4. Order of work
0. Gate: no changes or commits on main. Start only after the project is switched to `migration/cloudflare-d1-completion`. Then confirm the current branch name, check that the latest main snapshot and the Cloudflare migration assets are present, and report back.
1. On that branch, add a "D1 migration" task to roadmap.md. Reuse the existing SMS.ir, ParsPack and content-provider settings as they are, and don't change any secrets.
2. Read-only check that D1 tables and columns match what the code uses. Compare against `supabase/SCHEMA_BASELINE.md` and report differences. Nothing is altered.
3. Config, db helper, session, OTP and SMS.ir, tested on staging with one test phone number.
4. Authorization module and tests.
5. Domains in order of risk: storefront and loads (read) -> announce and manage-loads -> orders, cart and purchase requests -> ratings -> finance and payouts -> admin and city managers.
6. ParsPack uploads and images.
7. Full staging run of the main flows, signed in as each role.
8. Separate cutover approval: production switch, keep Supabase read-only, retire it later.

## 5. Blockers and what I need from you (no secret values in chat)
- Production D1 database name and id. A separate staging D1 copy for testing, since I won't test against production data.
- Confirmation that D1 already has the session and OTP tables, or approval to add new empty tables. Adding tables is a schema change and needs your OK.
- SMS.ir: API key, template id, the template's parameter name (for example `Code`), and line number. Plus one test phone number.
- ParsPack: endpoint, bucket, access key, secret key, region, and the public base URL for images.
- Where current images live, and whether they are already copied to ParsPack.
- Admin sign-in (decided): existing admin accounts are kept, and their first sign-in on Cloudflare/D1 uses the SMS.ir one-time code that is already set up. No password reset. SMS.ir settings stay unchanged.
- Users' existing Supabase sessions will end, so everyone signs in again at cutover. Please confirm that's acceptable.
- Cloudflare: an API token with Workers and D1 edit rights, stored as a GitHub secret. Also whether the workflow's `LOUDFLARE_API_TOKEN` fallback typo should be removed.
- Whether `liara.json` is still in use.
- Payment gateway: no real gateway is connected yet. Order and payment events will be tracked, but I won't claim a live payment connection.

## 6. Safe to build now on the branch, with no production effect
Everything in §3 except the cutover edits to `start.ts`, the production deploy workflow, and the removal of Supabase code. Supabase stays the live backend until you approve cutover.

## 7. Planned removals (only after full replacement and your approval)
The Supabase edge functions `admin-login` and `admin-manage-city-manager`, the `src/integrations/supabase/*` client code, and the Supabase-only workflows. No data is deleted.
