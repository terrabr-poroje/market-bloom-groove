-- Verified ratings for Terrabar members and individual loads.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_member_id uuid not null references public.members(id) on delete cascade,
  target_type text not null check (target_type in ('member', 'load')),
  target_member_id uuid references public.members(id) on delete cascade,
  target_load_id uuid references public.loads(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  review_text text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ratings_target_matches_type check (
    (target_type = 'member' and target_member_id is not null and target_load_id is null)
    or (target_type = 'load' and target_load_id is not null and target_member_id is null)
  )
);

create unique index if not exists ratings_unique_member_target
  on public.ratings (reviewer_member_id, target_type, target_member_id)
  where target_type = 'member';
create unique index if not exists ratings_unique_load_target
  on public.ratings (reviewer_member_id, target_type, target_load_id)
  where target_type = 'load';

alter table public.ratings enable row level security;
drop policy if exists ratings_read_visible on public.ratings;
create policy ratings_read_visible on public.ratings
  for select to anon, authenticated using (is_visible = true);
drop policy if exists ratings_insert_verified_order on public.ratings;
create policy ratings_insert_verified_order on public.ratings
  for insert to authenticated
  with check (
    exists (
      select 1 from public.members reviewer
      where reviewer.id = reviewer_member_id
        and reviewer.auth_user_id = (select auth.uid())
    )
    and (
      (target_type = 'load' and exists (
        select 1 from public.orders o
        join public.loads l on l.id = o.load_id
        where o.load_id = target_load_id
          and o.buyer_member_id = reviewer_member_id
          and o.status in ('delivered', 'received', 'completed')
          and l.member_id <> reviewer_member_id
      ))
      or
      (target_type = 'member' and exists (
        select 1 from public.orders o
        where o.buyer_member_id = reviewer_member_id
          and o.seller_member_id = target_member_id
          and o.status in ('delivered', 'received', 'completed')
          and target_member_id <> reviewer_member_id
      ))
    )
  );
grant select on public.ratings to anon, authenticated;
grant insert on public.ratings to authenticated;
