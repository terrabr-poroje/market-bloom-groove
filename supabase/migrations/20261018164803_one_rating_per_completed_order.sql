drop index if exists public.ratings_unique_member_target;
drop index if exists public.ratings_unique_load_target;
alter table public.ratings alter column order_id set not null;
