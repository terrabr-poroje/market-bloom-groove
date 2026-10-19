BEGIN;

-- Match the approved Terrabar buyer-city rules at the database layer:
-- main admins/city managers/owners retain their existing access;
-- approved professional members (suppliers and bar sellers) can browse all cities;
-- ordinary buyers see their own city; approved special buyers also see enabled neighboring cities;
-- supplier/professional inventory remains restricted to approved professional members.
DROP POLICY IF EXISTS loads_select_authorized ON public.loads;

CREATE POLICY loads_select_authorized
ON public.loads
FOR SELECT
TO authenticated
USING (
  public.terrabar_is_main_admin()
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
    SELECT 1
    FROM public.members owner
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
          -- Approved professional roles can browse marketplace inventory nationwide.
          EXISTS (
            SELECT 1
            FROM public.member_roles professional_role
            WHERE professional_role.member_id = m.id
              AND professional_role.approval_status = 'approved'
              AND lower(professional_role.role_code) IN ('supplier', 'bar_seller', 'seller')
          )
          OR (
            -- Regular inventory is not allowed to leak supplier-only listings.
            lower(COALESCE(NULLIF(btrim(loads.seller_type), ''), NULLIF(btrim(loads.role), ''), '')) <> 'supplier'
            AND lower(COALESCE(NULLIF(btrim(loads.sale_type), ''), 'regular')) IN ('regular', 'retail', 'wholesale', 'special')
            AND (
              m.city = loads.city
              OR (
                EXISTS (
                  SELECT 1
                  FROM public.member_roles special_role
                  WHERE special_role.member_id = m.id
                    AND special_role.approval_status = 'approved'
                    AND lower(special_role.role_code) IN ('special_buyer', 'buyer_special')
                )
                AND EXISTS (
                  SELECT 1
                  FROM public.city_neighbors cn
                  WHERE cn.is_enabled = true
                    AND (
                      (cn.city_name = m.city AND cn.neighbor_city_name = loads.city)
                      OR (cn.neighbor_city_name = m.city AND cn.city_name = loads.city)
                    )
                )
              )
            )
          )
        )
    )
  )
);

COMMIT;
