alter table public.ratings
  add column if not exists order_id uuid references public.orders(id) on delete cascade;

alter table public.ratings
  alter column is_visible set default false;

create unique index if not exists ratings_one_review_per_order_target
  on public.ratings (order_id, reviewer_member_id, target_type);

drop policy if exists ratings_insert_verified_order on public.ratings;
create policy ratings_insert_verified_order
  on public.ratings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.members reviewer
      where reviewer.id = ratings.reviewer_member_id
        and reviewer.auth_user_id = (select auth.uid())
    )
    and ratings.order_id is not null
    and (
      (
        ratings.target_type = 'load'
        and ratings.target_load_id is not null
        and ratings.target_member_id is null
        and exists (
          select 1
          from public.orders o
          join public.loads l on l.id = o.load_id
          where o.id = ratings.order_id
            and o.load_id = ratings.target_load_id
            and o.buyer_member_id = ratings.reviewer_member_id
            and (o.status in ('delivered', 'received', 'completed') or o.delivery_status = 'delivered')
            and l.member_id = o.seller_member_id
            and l.member_id <> ratings.reviewer_member_id
        )
      )
      or
      (
        ratings.target_type = 'member'
        and ratings.target_member_id is not null
        and ratings.target_load_id is null
        and exists (
          select 1
          from public.orders o
          where o.id = ratings.order_id
            and o.buyer_member_id = ratings.reviewer_member_id
            and o.seller_member_id = ratings.target_member_id
            and (o.status in ('delivered', 'received', 'completed') or o.delivery_status = 'delivered')
            and o.seller_member_id <> o.buyer_member_id
        )
      )
    )
  );

drop policy if exists ratings_read_visible on public.ratings;
drop policy if exists ratings_read_own on public.ratings;
create policy ratings_read_own
  on public.ratings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.members reviewer
      where reviewer.id = ratings.reviewer_member_id
        and reviewer.auth_user_id = (select auth.uid())
    )
    or public.terrabar_is_main_admin()
  );
