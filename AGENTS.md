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
> The project's backend is Lovable Cloud, with database, auth, and storage
> managed through it. App-internal server logic goes through server functions;
> incoming webhooks and public HTTP endpoints go through server routes. Do not
> add Supabase Edge Functions or hand-rolled API clients.
>
> Every schema change is applied as a migration that also grants the roles its
> policies rely on and enables row-level security, so access rules are never
> left out of the change that creates a table.
<!-- TERRABAR:END -->
