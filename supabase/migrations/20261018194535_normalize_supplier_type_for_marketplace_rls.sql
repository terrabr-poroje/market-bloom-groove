-- Normalize blank seller fields so supplier-origin inventory never falls through to ordinary buyer access.
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
              lower(COALESCE(NULLIF(btrim(loads.seller_type), ''), NULLIF(btrim(loads.role), ''), '')) = 'supplier'
              OR lower(COALESCE(NULLIF(btrim(loads.sale_type), ''), '')) IN ('professional', 'pro')
            )
            AND EXISTS (
              SELECT 1 FROM public.member_roles mr
              WHERE mr.member_id = m.id
                AND mr.approval_status = 'approved'
                AND lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller')
            )
          )
          OR (
            lower(COALESCE(NULLIF(btrim(loads.seller_type), ''), NULLIF(btrim(loads.role), ''), '')) <> 'supplier'
            AND lower(COALESCE(NULLIF(btrim(loads.sale_type), ''), 'regular')) IN ('regular', 'retail', 'wholesale', 'special')
            AND m.city = loads.city
          )
        )
    )
  )
);
