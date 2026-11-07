<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- TERRABAR:BEGIN -->
> [!IMPORTANT]
> **Approved target architecture:** Cloudflare Workers + D1 own application runtime logic, authentication, authorization, and application data. ParsPack remains the file/image storage provider. SMS.ir remains the OTP/SMS provider. Supabase is retained as a read-only rollback/reference source until the owner explicitly approves cutover and all acceptance tests pass.
>
> **Production safety:** Work on Cloudflare migration only in `migration/cloudflare-d1-completion` and isolated staging resources. Do not deploy to the production Worker/domain, change DNS, alter production secrets, disable Supabase, or mutate production business data without the owner's separate explicit approval. Never copy secrets into source control or logs.
>
> **Migration rules:** Do not add an unrestricted Supabase/PostgREST compatibility proxy. Move application operations to authenticated server-side Worker/server functions backed by D1. Enforce role, approval, city visibility, seller announcement, admin scope, and financial permissions on the server. Preserve existing identifiers, relationships, business meanings, user/order/load history, and financial ledger integrity.
>
> **External integrations:** Preserve the existing SMS.ir and ParsPack contracts and configuration. Do not replace them with FreeSMS or another provider without approval.
>
> **Completion gate:** Schema installation and row-count parity are not application verification. Before cutover, run successful build/lint/tests and isolated preview tests for OTP/session lifecycle, authorization, marketplace/load CRUD, cart/order/invoice/payment, seller finance/payouts, media, ratings, audit logs, webhooks, mobile/RTL, and rollback. Record evidence. Keep Supabase available until the owner approves cutover.
<!-- TERRABAR:END -->

- Stage-one marketplace data and package calculations live in a browser-safe mock module, with no backend imports, so preview interactions cannot affect real records.
- Shared marketplace navigation surrounds the root Outlet; shareable information pages use separate leaf routes with their own metadata.
