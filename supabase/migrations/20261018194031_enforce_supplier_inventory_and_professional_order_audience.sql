-- Keep supplier-origin loads private to approved professional marketplace roles.
DROP POLICY IF EXISTS loads_select_authorized ON public.loads;
CREATE POLICY loads_select_authorized
ON public.loads
FOR SELECT
TO authenticated
USING (
  terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1
    FROM public.admin_users au
    LEFT JOIN public.admin_user_cities auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = loads.city OR au.city = loads.city)
  )
  OR EXISTS (
    SELECT 1 FROM public.members owner
    WHERE owner.auth_user_id = (SELECT auth.uid())
      AND (owner.id = loads.member_id OR owner.id = loads.owner_member_id)
  )
  OR (
    loads.status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.auth_user_id = (SELECT auth.uid())
        AND (
          (
            (
              lower(COALESCE(loads.seller_type, loads.role, '')) = 'supplier'
              OR lower(COALESCE(loads.sale_type, '')) IN ('professional', 'pro')
            )
            AND EXISTS (
              SELECT 1 FROM public.member_roles mr
              WHERE mr.member_id = m.id
                AND mr.approval_status = 'approved'
                AND lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller')
            )
          )
          OR (
            lower(COALESCE(loads.seller_type, loads.role, '')) <> 'supplier'
            AND lower(COALESCE(loads.sale_type, 'regular')) IN ('regular', 'retail', 'wholesale', 'special')
            AND m.city = loads.city
          )
        )
    )
  )
);

DROP POLICY IF EXISTS orders_insert_buyer_pending_request ON public.orders;
CREATE POLICY orders_insert_buyer_pending_request
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND buyer_member_id IS NOT NULL
  AND seller_member_id IS NOT NULL
  AND unit = 'package'
  AND quantity > 0
  AND price > 0
  AND total_price > 0
  AND sale_type IN ('retail', 'wholesale', 'special', 'professional', 'regular', 'pro')
  AND (
    sale_type NOT IN ('professional', 'pro')
    OR EXISTS (
      SELECT 1
      FROM public.member_roles mr
      WHERE mr.member_id = orders.buyer_member_id
        AND mr.approval_status = 'approved'
        AND lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller')
    )
  )
  AND delivery_type IN ('terrabar', 'pickup', 'buyer_carrier')
  AND (delivery_type = 'pickup' OR NULLIF(btrim(delivery_address), '') IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM public.members buyer
    WHERE buyer.id = orders.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
      AND orders.customer_name = buyer.full_name
      AND orders.customer_phone IS NOT DISTINCT FROM buyer.phone
      AND orders.customer_email IS NOT DISTINCT FROM buyer.email
      AND orders.customer_city = buyer.city
      AND (
        buyer.role = 'buyer'
        OR EXISTS (
          SELECT 1
          FROM public.member_roles mr
          WHERE mr.member_id = buyer.id
            AND (
              (mr.role_code = 'buyer')
              OR (mr.role_code IN ('special_buyer', 'professional_buyer') AND mr.approval_status = 'approved')
              OR (lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller') AND mr.approval_status = 'approved')
            )
        )
      )
  )
  AND EXISTS (
    SELECT 1
    FROM public.loads l
    WHERE l.id = orders.load_id
      AND l.status = 'active'
      AND l.member_id = orders.seller_member_id
      AND orders.quantity >= COALESCE(
        (SELECT t.minimum_packages FROM public.load_price_tiers t WHERE t.load_id = l.id AND t.sale_type = orders.sale_type),
        l.min_order_quantity,
        1
      )
      AND orders.quantity <= COALESCE(l.count, 0)
      AND orders.price = COALESCE(
        (SELECT t.unit_price FROM public.load_price_tiers t WHERE t.load_id = l.id AND t.sale_type = orders.sale_type),
        l.price
      )
      AND orders.total_price = (
        orders.quantity
        * COALESCE(l.package_weight, GREATEST(1, round(l.quantity / NULLIF(l.count, 0))))
        * COALESCE(
          (SELECT t.unit_price FROM public.load_price_tiers t WHERE t.load_id = l.id AND t.sale_type = orders.sale_type),
          l.price
        )
      )
  )
);
