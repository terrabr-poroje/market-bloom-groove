-- Store an independent price per kilogram and minimum package count for each enabled sales section.
alter table public.load_price_tiers
  add column if not exists sale_type text not null default 'regular',
  add column if not exists minimum_packages numeric not null default 1;

create unique index if not exists load_price_tiers_load_sale_type_uidx
  on public.load_price_tiers(load_id, sale_type);

alter table public.load_price_tiers drop constraint if exists load_price_tiers_sale_type_check;
alter table public.load_price_tiers add constraint load_price_tiers_sale_type_check
  check (sale_type in ('retail','wholesale','special','professional','regular','pro'));
alter table public.load_price_tiers drop constraint if exists load_price_tiers_minimum_packages_check;
alter table public.load_price_tiers add constraint load_price_tiers_minimum_packages_check
  check (minimum_packages >= 1);
