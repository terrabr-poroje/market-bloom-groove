alter table public.orders add column if not exists sale_type text not null default 'regular';
alter table public.orders drop constraint if exists orders_sale_type_check;
alter table public.orders add constraint orders_sale_type_check check (sale_type in ('retail','wholesale','special','professional','regular','pro'));