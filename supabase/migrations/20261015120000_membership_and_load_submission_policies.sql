-- PROPOSED ONLY: review before applying to production Supabase.
-- Adds the minimum authenticated self-service paths needed by the current
-- membership form and load announcement flow. This file is NOT auto-applied
-- until merged/deployed through the repository workflow.

-- A signed-in user may create only their own member profile.
DROP POLICY IF EXISTS members_insert_own_profile ON public.members;
CREATE POLICY members_insert_own_profile
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- Only members with an approved supplier/bar-seller role may submit a load.
-- The submitted member_id must be the caller's own member profile.
-- Loads are created as pending and still require the existing admin review flow.
DROP POLICY IF EXISTS loads_insert_approved_member ON public.loads;
CREATE POLICY loads_insert_approved_member
ON public.loads
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.id = public.loads.member_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND mr.approval_status = 'approved'
      AND mr.role_code IN ('supplier', 'bar_seller')
  )
  AND quantity > 0
  AND price > 0
  AND count > 0
  AND min_order_quantity > 0
  AND min_order_quantity <= count
  AND min_quantity > 0
  AND min_quantity <= quantity
);

GRANT INSERT ON TABLE public.members TO authenticated;
GRANT INSERT ON TABLE public.loads TO authenticated;

-- Active marketplace visibility follows the approved city-access rules.
-- A normal buyer sees their own city; a special buyer sees their city and
-- enabled neighboring cities; a professional buyer has no city filter.
-- City managers are restricted to their assigned cities; main admins see all.
DROP POLICY IF EXISTS loads_special_buyer_city_access ON public.loads;
DROP POLICY IF EXISTS loads_marketplace_city_access ON public.loads;
CREATE POLICY loads_marketplace_city_access
ON public.loads
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (
    public.terrabar_is_main_admin()
    OR EXISTS (
      SELECT 1
      FROM public.admin_users AS au
      LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.admin_role = 'city_manager'
        AND au.is_active = true
        AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
    )
    OR EXISTS (
      SELECT 1
      FROM public.members AS m
      WHERE m.auth_user_id = (SELECT auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.member_roles AS mr
            WHERE mr.member_id = m.id
              AND mr.approval_status = 'approved'
              AND mr.role_code = 'professional_buyer'
          )
          OR (
            m.city = public.loads.city
            AND (
              m.role = 'buyer'
              OR EXISTS (
                SELECT 1 FROM public.member_roles AS mr
                WHERE mr.member_id = m.id
                  AND mr.approval_status = 'approved'
                  AND mr.role_code IN ('buyer', 'special_buyer')
              )
            )
          )
          OR (
            EXISTS (
              SELECT 1 FROM public.member_roles AS mr
              WHERE mr.member_id = m.id
                AND mr.approval_status = 'approved'
                AND mr.role_code = 'special_buyer'
            )
            AND EXISTS (
              SELECT 1 FROM public.city_neighbors AS cn
              WHERE cn.is_enabled = true
                AND (
                  (cn.city_name = m.city AND cn.neighbor_city_name = public.loads.city)
                  OR (cn.neighbor_city_name = m.city AND cn.city_name = public.loads.city)
                )
            )
          )
          OR EXISTS (
            SELECT 1 FROM public.member_roles AS mr
            WHERE mr.member_id = m.id
              AND mr.approval_status = 'approved'
              AND mr.role_code IN ('supplier', 'bar_seller')
          )
        )
    )
  )
);

-- Main admins need to review pending loads in the management screen.
DROP POLICY IF EXISTS loads_main_admin_review_select ON public.loads;
CREATE POLICY loads_main_admin_review_select
ON public.loads
FOR SELECT
TO authenticated
USING (public.terrabar_is_main_admin());

-- Main admins may only change load review status through this policy.
DROP POLICY IF EXISTS loads_main_admin_review_update ON public.loads;
CREATE POLICY loads_main_admin_review_update
ON public.loads
FOR UPDATE
TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

-- Regular buyers see active regular listings only in their registered city.
DROP POLICY IF EXISTS loads_regular_buyer_city_access ON public.loads;
CREATE POLICY loads_regular_buyer_city_access
ON public.loads
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND COALESCE(sale_type, 'regular') = 'regular'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND m.city = public.loads.city
      AND mr.role_code = 'buyer'
  )
);

-- Special buyers must have an approved special_buyer role; city access is
-- restricted to their own city and enabled neighboring-city relationships.
DROP POLICY IF EXISTS loads_special_buyer_city_access ON public.loads;
CREATE POLICY loads_special_buyer_city_access
ON public.loads
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND sale_type = 'special'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND mr.role_code = 'special_buyer'
      AND mr.approval_status = 'approved'
      AND (
        public.loads.city = m.city
        OR EXISTS (
          SELECT 1 FROM public.city_neighbors AS cn
          WHERE cn.city_name = m.city
            AND cn.neighbor_city_name = public.loads.city
            AND cn.is_enabled = true
        )
        OR EXISTS (
          SELECT 1 FROM public.city_neighbors AS cn
          WHERE cn.city_name = public.loads.city
            AND cn.neighbor_city_name = m.city
            AND cn.is_enabled = true
        )
      )
  )
);

-- Professional buyers may see active listings without a city restriction.
DROP POLICY IF EXISTS loads_professional_buyer_access ON public.loads;
CREATE POLICY loads_professional_buyer_access
ON public.loads
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND mr.role_code = 'professional_buyer'
      AND mr.approval_status = 'approved'
  )
);

-- These tables contain account and marketplace data; anonymous grants are not
-- needed for the authenticated membership and listing flows.
REVOKE ALL ON TABLE public.members, public.member_roles, public.loads FROM anon;

GRANT INSERT ON TABLE public.member_roles TO authenticated;
GRANT UPDATE (status) ON TABLE public.loads TO authenticated;
