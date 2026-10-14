-- Terrabar: special buyer access based on registration city.
-- Special buyers do not need an approved member_roles row.
-- Active special listings are visible in the member's city and enabled nearby cities.

DROP POLICY IF EXISTS members_read_own_profile ON public.members;
CREATE POLICY members_read_own_profile ON public.members
FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS loads_special_buyer_city_access ON public.loads;
CREATE POLICY loads_special_buyer_city_access ON public.loads
FOR SELECT TO authenticated
USING (
  status = 'active'
  AND sale_type = 'special'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND (
        public.loads.city = m.city
        OR EXISTS (
          SELECT 1
          FROM public.city_neighbors AS cn
          WHERE cn.city_name = m.city
            AND cn.neighbor_city_name = public.loads.city
            AND cn.is_enabled = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.city_neighbors AS cn
          WHERE cn.city_name = public.loads.city
            AND cn.neighbor_city_name = m.city
            AND cn.is_enabled = true
        )
      )
  )
);

REVOKE SELECT ON TABLE public.loads FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, name, quantity, city, role, product_type, origin, engine, source_market,
  price, price_unit, quality, description, ready_date, status, member_id,
  created_at, updated_at, min_quantity, unit, owner_member_id, seller_type,
  source_region, sale_type, min_order_quantity, count
) ON TABLE public.loads TO authenticated;

GRANT SELECT ON TABLE public.members TO authenticated;
