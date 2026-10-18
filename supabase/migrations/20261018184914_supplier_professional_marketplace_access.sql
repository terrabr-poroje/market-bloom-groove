-- Approved suppliers publish only professional loads; only approved suppliers and bar sellers may view them.
DROP POLICY IF EXISTS loads_select_authorized ON public.loads;
CREATE POLICY loads_select_authorized ON public.loads
FOR SELECT TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1 FROM public.admin_users au
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
      SELECT 1 FROM public.members m
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
            lower(COALESCE(loads.sale_type, 'regular')) IN ('regular', 'retail', 'wholesale', 'special')
            AND m.city = loads.city
          )
        )
    )
  )
);

DROP POLICY IF EXISTS loads_insert_approved_member ON public.loads;
CREATE POLICY loads_insert_approved_member ON public.loads
FOR INSERT TO authenticated
WITH CHECK (
  status = 'active'
  AND quantity > 0
  AND price > 0
  AND count > 0
  AND min_order_quantity > 0
  AND min_order_quantity <= count
  AND min_quantity > 0
  AND min_quantity <= quantity
  AND EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.id = loads.member_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND mr.approval_status = 'approved'
      AND (
        (lower(mr.role_code) = 'supplier' AND lower(COALESCE(loads.sale_type, '')) IN ('professional', 'pro'))
        OR (lower(mr.role_code) IN ('bar_seller', 'seller') AND lower(COALESCE(loads.sale_type, 'regular')) IN ('regular', 'retail', 'wholesale', 'special'))
      )
  )
);

DROP POLICY IF EXISTS load_price_tiers_read_visible_loads ON public.load_price_tiers;
CREATE POLICY load_price_tiers_read_visible_loads ON public.load_price_tiers
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.loads l WHERE l.id = load_price_tiers.load_id));

DROP POLICY IF EXISTS load_images_read_visible_loads ON public.load_images;
CREATE POLICY load_images_read_visible_loads ON public.load_images
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.loads l WHERE l.id = load_images.load_id));
