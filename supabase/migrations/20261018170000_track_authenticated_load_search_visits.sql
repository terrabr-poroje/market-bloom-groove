-- Track authenticated visits to the load-search area without collecting IP addresses or device fingerprints.
create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  route text not null check (route in ('/requests')),
  visited_at timestamptz not null default now()
);

create index if not exists site_visits_visited_at_idx on public.site_visits (visited_at desc);
create index if not exists site_visits_user_id_idx on public.site_visits (user_id);

alter table public.site_visits enable row level security;

drop policy if exists site_visits_insert_own on public.site_visits;
create policy site_visits_insert_own on public.site_visits
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      member_id is null
      or exists (
        select 1 from public.members m
        where m.id = member_id
          and m.auth_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists site_visits_read_main_admin on public.site_visits;
create policy site_visits_read_main_admin on public.site_visits
  for select to authenticated
  using (public.terrabar_is_main_admin());

grant insert on public.site_visits to authenticated;
grant select on public.site_visits to authenticated;

create or replace view public.site_visit_summary
with (security_invoker = true)
as
select
  count(*)::bigint as total_visits,
  count(distinct user_id)::bigint as unique_visitors,
  count(*) filter (where visited_at >= now() - interval '24 hours')::bigint as visits_last_24_hours,
  count(distinct user_id) filter (where visited_at >= now() - interval '24 hours')::bigint as visitors_last_24_hours
from public.site_visits;

grant select on public.site_visit_summary to authenticated;
