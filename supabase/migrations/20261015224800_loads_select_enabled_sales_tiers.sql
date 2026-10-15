drop policy if exists loads_select_enabled_sales_tiers on public.loads;
create policy loads_select_enabled_sales_tiers on public.loads
for select to authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.members m
    where m.auth_user_id = (select auth.uid())
      and (
        (
          exists (select 1 from public.member_roles mr where mr.member_id=m.id and mr.role_code='professional_buyer' and mr.approval_status='approved')
          and exists (select 1 from public.load_price_tiers t where t.load_id=loads.id and t.sale_type in ('professional','pro'))
        )
        or
        (
          exists (select 1 from public.member_roles mr where mr.member_id=m.id and mr.role_code='special_buyer' and mr.approval_status='approved')
          and (
            loads.city = m.city
            or exists (
              select 1 from public.city_neighbors cn
              where cn.is_enabled=true
                and ((cn.city_name=m.city and cn.neighbor_city_name=loads.city)
                  or (cn.neighbor_city_name=m.city and cn.city_name=loads.city))
            )
          )
          and exists (select 1 from public.load_price_tiers t where t.load_id=loads.id and t.sale_type='special')
        )
        or
        (
          loads.city = m.city
          and (m.role='buyer' or exists (select 1 from public.member_roles mr where mr.member_id=m.id and mr.role_code='buyer'))
          and exists (select 1 from public.load_price_tiers t where t.load_id=loads.id and t.sale_type in ('retail','wholesale','regular'))
        )
      )
  )
);
