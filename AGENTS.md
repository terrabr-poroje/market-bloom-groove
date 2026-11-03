# Terrabar repository operating rules

## Source of truth and project boundaries

- This repository is the existing Terrabar application. Preserve its current architecture, Supabase project, schema, user records, loads, orders, and uploaded media.
- Do not rebuild the application, create a replacement database, or migrate hosting.
- The existing Supabase project reference is `gznsxqeyhnuzglliijzz`. Never point tooling at a different project.
- The current hosting decision is to retain Render. Do not migrate to Liara or another host without separate explicit approval.
- The public domain is `terrabar.ir`; Cloudflare is part of the published-domain path. Inspect the actual deployment workflows and DNS configuration before proposing changes. Do not assume that a service named “preview” is isolated from production.

## Mandatory change control

- Work on a dedicated feature/automation branch and open a pull request. Never push directly to `main`.
- Keep production deployment, DNS, Cloudflare Workers, Render settings, Supabase schema/data/RLS, authentication, secrets, and billing unchanged unless the owner explicitly approves that specific change.
- A pull request is for review, not permission to merge or deploy. Merging to `main` may trigger production workflows; require a separate explicit approval.
- Do not rewrite published Git history, force-push shared branches, or amend/rebase pushed commits.
- Do not expose, print, commit, or request secrets in chat or logs. Use repository/hosting secret stores.

## Verification requirements

- Before changing application code, inspect the affected routes, components, data access, migrations, and relevant workflows.
- Run the repository's available install, lint, test, and production-build checks. Report checks that could not be run; never claim an unrun test passed.
- Prefer read-only inspection and isolated tests. Do not run destructive SQL or mutate production records as a test.
- Review the full diff for unrelated changes and regressions before requesting approval.
- Do not disable security controls or weaken RLS to make a test pass.

## Terrabar product constraints

- The approved main product specification and its approved supplement/screenshots are the source of truth for product behavior.
- Preserve the RTL Persian-first experience and the existing modern green/white design direction.
- Keep ordinary buyers, bar sellers, and suppliers' permissions distinct. Pending sellers/suppliers retain buyer features; seller-only publishing remains approval-gated.
- Never alter user, load, order, payment, invoice, or financial records while implementing UI or test workflows.
- Where requirements are unclear or conflict with the approved specification, document the conflict and ask the owner before implementation.

## Working style

- Make the smallest change that solves the approved task.
- Prefer a preview or test environment only after verifying its isolation and deployment behavior.
- Report: what was inspected, what changed, exact test results, remaining risks, and whether any owner action is required.
