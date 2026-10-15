alter table public.loads add column if not exists package_weight numeric not null default 10;
drop policy if exists orders_insert_buyer_pending_request on public.orders;
create policy orders_insert_buyer_pending_request on public.orders
for insert to authenticated
with check (
  status = 'pending'
  and buyer_member_id is not null
  and seller_member_id is not null
  and unit = 'package'
  and quantity > 0
  and price > 0
  and total_price > 0
  and sale_type in ('retail','wholesale','special','professional','regular','pro')
  and delivery_type in ('terrabar','pickup','buyer_carrier')
  and (delivery_type = 'pickup' or nullif(btrim(delivery_address), '') is not null)
  and exists (
    select 1 from public.members buyer
    where buyer.id = orders.buyer_member_id
      and buyer.auth_user_id = (select auth.uid())
      and orders.customer_name = buyer.full_name
      and orders.customer_phone is not distinct from buyer.phone
      and orders.customer_email is not distinct from buyer.email
      and orders.customer_city = buyer.city
      and (
        buyer.role = 'buyer'
        or exists (
          select 1 from public.member_roles mr
          where mr.member_id = buyer.id
            and mr.role_code in ('buyer','special_buyer','professional_buyer')
            and (mr.role_code = 'buyer' or mr.approval_status = 'approved')
        )
      )
  )
  and exists (
    select 1
    from public.loads l
    where l.id = orders.load_id
      and l.status = 'active'
      and l.member_id = orders.seller_member_id
      and orders.quantity >= coalesce(
        (select t.minimum_packages from public.load_price_tiers t where t.load_id = l.id and t.sale_type = orders.sale_type),
        l.min_order_quantity, 1
      )
      and orders.quantity <= coalesce(l.count, 0)
      and orders.price = coalesce(
        (select t.unit_price from public.load_price_tiers t where t.load_id = l.id and t.sale_type = orders.sale_type),
        l.price
      )
      and orders.total_price = (
        orders.quantity * coalesce(l.package_weight, greatest(1, round(l.quantity / nullif(l.count, 0))))
        * coalesce((select t.unit_price from public.load_price_tiers t where t.load_id = l.id and t.sale_type = orders.sale_type), l.price)
      )
  )
);
