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
WITH CHECK (
  auth_user_id = (SELECT auth.uid())
  AND role IN ('buyer', 'supplier', 'seller', 'bar_seller')
  AND COALESCE(verification_status, 'pending') = 'pending'
);

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

-- Consolidate listing visibility into ONE permissive SELECT policy.
-- PostgreSQL combines permissive policies with OR, so separate "narrower"
-- policies do not restrict a broader policy. Remove prior broad policies first.
DROP POLICY IF EXISTS loads_owner_access ON public.loads;
DROP POLICY IF EXISTS loads_special_buyer_city_access ON public.loads;
DROP POLICY IF EXISTS loads_marketplace_city_access ON public.loads;
DROP POLICY IF EXISTS loads_main_admin_review_select ON public.loads;
DROP POLICY IF EXISTS loads_regular_buyer_city_access ON public.loads;
DROP POLICY IF EXISTS loads_professional_buyer_access ON public.loads;

CREATE POLICY loads_select_authorized
ON public.loads
FOR SELECT
TO authenticated
USING (
  -- Main admin can review all statuses.
  public.terrabar_is_main_admin()

  -- City managers can review only loads in their assigned city scope.
  OR EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
  )

  -- Owners can see their own pending/rejected/active listings.
  OR EXISTS (
    SELECT 1
    FROM public.members AS owner
    WHERE owner.auth_user_id = (SELECT auth.uid())
      AND (owner.id = public.loads.member_id OR owner.id = public.loads.owner_member_id)
  )

  -- Non-admin marketplace users see active inventory according to role/city.
  OR (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.members AS m
      WHERE m.auth_user_id = (SELECT auth.uid())
        AND (
          -- Approved professional buyers: no city restriction.
          EXISTS (
            SELECT 1 FROM public.member_roles AS mr
            WHERE mr.member_id = m.id
              AND mr.role_code = 'professional_buyer'
              AND mr.approval_status = 'approved'
          )

          -- Regular buyers: own city, regular listings only; buyer approval
          -- is not required by the product rules.
          OR (
            m.city = public.loads.city
            AND COALESCE(public.loads.sale_type, 'regular') = 'regular'
            AND (
              m.role = 'buyer'
              OR EXISTS (
                SELECT 1 FROM public.member_roles AS mr
                WHERE mr.member_id = m.id
                  AND mr.role_code = 'buyer'
              )
            )
          )

          -- Approved special buyers: own city and enabled neighboring cities.
          OR (
            EXISTS (
              SELECT 1 FROM public.member_roles AS mr
              WHERE mr.member_id = m.id
                AND mr.role_code = 'special_buyer'
                AND mr.approval_status = 'approved'
            )
            AND (
              public.loads.city = m.city
              OR EXISTS (
                SELECT 1 FROM public.city_neighbors AS cn
                WHERE cn.is_enabled = true
                  AND (
                    (cn.city_name = m.city AND cn.neighbor_city_name = public.loads.city)
                    OR (cn.neighbor_city_name = m.city AND cn.city_name = public.loads.city)
                  )
              )
            )
          )

          -- Approved suppliers/bar-sellers may browse active inventory in
          -- their own city; owner access above retains visibility to own loads.
          OR (
            m.city = public.loads.city
            AND EXISTS (
              SELECT 1 FROM public.member_roles AS mr
              WHERE mr.member_id = m.id
                AND mr.role_code IN ('supplier', 'bar_seller')
                AND mr.approval_status = 'approved'
            )
          )
        )
    )
  )
);

-- Main admins may change listing review status; city managers cannot alter
-- rows outside their assigned city and ordinary members cannot approve loads.
DROP POLICY IF EXISTS loads_main_admin_review_update ON public.loads;
DROP POLICY IF EXISTS loads_city_manager_review_update ON public.loads;

CREATE POLICY loads_main_admin_review_update
ON public.loads
FOR UPDATE
TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

CREATE POLICY loads_city_manager_review_update
ON public.loads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
  )
);

-- City managers can review membership requests only for members in assigned cities.
DROP POLICY IF EXISTS member_roles_city_manager_read ON public.member_roles;
CREATE POLICY member_roles_city_manager_read
ON public.member_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.admin_users AS au ON au.auth_user_id = (SELECT auth.uid())
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE m.id = public.member_roles.member_id
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = m.city OR au.city = m.city)
  )
);

DROP POLICY IF EXISTS member_roles_city_manager_update ON public.member_roles;
CREATE POLICY member_roles_city_manager_update
ON public.member_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.admin_users AS au ON au.auth_user_id = (SELECT auth.uid())
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE m.id = public.member_roles.member_id
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = m.city OR au.city = m.city)
  )
)
WITH CHECK (
  approval_status IN ('approved', 'rejected')
  AND (
    (approval_status = 'approved' AND approved_by = (SELECT auth.uid()) AND approved_at IS NOT NULL)
    OR (approval_status = 'rejected' AND approved_by IS NULL AND approved_at IS NULL)
  )
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.admin_users AS au ON au.auth_user_id = (SELECT auth.uid())
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE m.id = public.member_roles.member_id
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = m.city OR au.city = m.city)
  )
);

-- The review UI only needs to change approval fields, never the member, role or IDs.
REVOKE UPDATE ON TABLE public.member_roles FROM authenticated;
GRANT UPDATE (approval_status, approved_by, approved_at) ON TABLE public.member_roles TO authenticated;

-- These tables contain account and marketplace data; anonymous grants are not
-- needed for the authenticated membership and listing flows.
REVOKE ALL ON TABLE public.members, public.member_roles, public.loads FROM anon;

GRANT INSERT ON TABLE public.member_roles TO authenticated;

-- Existing table-level UPDATE grants override column-level intent. Remove the
-- broad grant explicitly, then permit only the review status column.
REVOKE UPDATE, DELETE ON TABLE public.loads FROM authenticated;
GRANT UPDATE (status) ON TABLE public.loads TO authenticated;
